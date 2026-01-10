import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Note: For Stripe webhooks, we need to allow stripe-signature header
const getWebhookCorsHeaders = (req: Request) => ({
  ...getCorsHeaders(req),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
});

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Plan config interface
interface PlanConfig {
  tier: string;
  daily_limit: number;
  limit_period: string;
  has_watermark: boolean;
  has_editor: boolean;
  has_history: boolean;
}

// Fallback plan config (used if database lookup fails)
const FALLBACK_PLANS: Record<string, PlanConfig> = {
  free: { tier: "free", daily_limit: 1, limit_period: "daily", has_watermark: true, has_editor: false, has_history: false },
  starter: { tier: "starter", daily_limit: 3, limit_period: "weekly", has_watermark: false, has_editor: true, has_history: true },
  creator: { tier: "creator", daily_limit: 1, limit_period: "daily", has_watermark: false, has_editor: true, has_history: true },
};

// Get plan config from database by stripe_price_id or price amount
async function getPlanConfig(
  supabase: SupabaseClient,
  priceId: string | null,
  priceAmount: number
): Promise<PlanConfig> {
  // First try to find by stripe_price_id (most reliable)
  if (priceId) {
    const { data: planByPriceId } = await supabase
      .from("plans_config")
      .select("tier, daily_limit, limit_period, has_watermark, has_editor, has_history")
      .or(`stripe_price_id_brl.eq.${priceId},stripe_price_id_usd.eq.${priceId},stripe_price_id_eur.eq.${priceId}`)
      .eq("is_active", true)
      .maybeSingle();

    if (planByPriceId) {
      logStep("Found plan by stripe_price_id", { priceId, tier: planByPriceId.tier });
      return planByPriceId as PlanConfig;
    }
  }

  // Fallback: try to find by price amount (BRL)
  if (priceAmount > 0) {
    const { data: planByPrice } = await supabase
      .from("plans_config")
      .select("tier, daily_limit, limit_period, has_watermark, has_editor, has_history")
      .eq("price_brl", priceAmount)
      .eq("is_active", true)
      .maybeSingle();

    if (planByPrice) {
      logStep("Found plan by price_brl", { priceAmount, tier: planByPrice.tier });
      return planByPrice as PlanConfig;
    }
  }

  // Final fallback: return starter plan config
  logStep("Plan not found in database, using fallback", { priceId, priceAmount });
  return FALLBACK_PLANS.starter;
}

// Get free plan config from database
async function getFreePlanConfig(supabase: SupabaseClient): Promise<PlanConfig> {
  const { data: freePlan } = await supabase
    .from("plans_config")
    .select("tier, daily_limit, limit_period, has_watermark, has_editor, has_history")
    .eq("tier", "free")
    .maybeSingle();

  if (freePlan) {
    return freePlan as PlanConfig;
  }

  return FALLBACK_PLANS.free;
}

serve(async (req) => {
  const corsHeaders = getWebhookCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      logStep("Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // SECURITY: Webhook signature verification is MANDATORY
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      logStep("ERROR: STRIPE_WEBHOOK_SECRET is not configured");
      return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Event verified with signature", { type: event.type, id: event.id });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logStep("Signature verification failed", { error: errorMessage });
      return new Response(JSON.stringify({ error: `Webhook signature verification failed: ${errorMessage}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store event in database for logging (ignore duplicates)
    const { error: eventError } = await supabase.from("stripe_events").upsert({
      event_id: event.id,
      event_type: event.type,
      data: event.data,
      processed: false,
    }, { onConflict: 'event_id', ignoreDuplicates: true });

    if (eventError && !eventError.message?.includes('duplicate')) {
      logStep("Error storing event", { error: eventError.message });
    }

    // Process different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Processing checkout.session.completed", { 
          sessionId: session.id, 
          customerId: session.customer,
          customerEmail: session.customer_email 
        });

        // Get customer email
        const customerEmail = session.customer_email || 
          (session.customer_details as { email?: string })?.email;
        
        if (!customerEmail) {
          logStep("No customer email found in session");
          break;
        }

        // Find user by email
        const { data: users } = await supabase.auth.admin.listUsers();
        const user = users?.users?.find(u => u.email === customerEmail);
        
        if (!user) {
          logStep("User not found for email", { email: customerEmail });
          break;
        }

        // Get subscription details
        const subscriptionId = session.subscription as string;
        if (!subscriptionId) {
          logStep("No subscription ID in session");
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const price = subscription.items.data[0]?.price;
        const priceId = price?.id || null;
        const unitAmount = price?.unit_amount || 0;

        // Get plan config from database (dynamic lookup)
        const planConfig = await getPlanConfig(supabase, priceId, unitAmount);

        logStep("Subscription details", {
          subscriptionId,
          priceId,
          unitAmount,
          plan: planConfig.tier
        });

        // Upsert subscription record
        const { error: subError } = await supabase.from("subscriptions").upsert({
          user_id: user.id,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscriptionId,
          price_id: priceId,
          plan_tier: planConfig.tier,
          daily_limit: planConfig.daily_limit,
          status: "active",
          has_watermark: planConfig.has_watermark,
          has_editor: planConfig.has_editor,
          has_history: planConfig.has_history,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        }, { onConflict: "user_id" });

        if (subError) {
          logStep("Error upserting subscription", { error: subError.message });
        } else {
          logStep("Subscription activated successfully", { userId: user.id, plan: planConfig.tier });
        }

        // Update profile plan_tier
        await supabase.from("profiles").update({
          plan_tier: planConfig.tier
        }).eq("user_id", user.id);

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing customer.subscription.updated", {
          subscriptionId: subscription.id,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end
        });

        const price = subscription.items.data[0]?.price;
        const priceId = price?.id || null;
        const unitAmount = price?.unit_amount || 0;

        // Get plan config from database (dynamic lookup)
        const planConfig = await getPlanConfig(supabase, priceId, unitAmount);

        // Get current subscription to find user
        const { data: currentSub } = await supabase.from("subscriptions")
          .select("user_id, cancel_at_period_end")
          .eq("stripe_subscription_id", subscription.id)
          .single();

        // Check if cancellation was just requested
        const justCancelled = subscription.cancel_at_period_end && !currentSub?.cancel_at_period_end;

        // Update subscription in database
        const { error: updateError } = await supabase.from("subscriptions")
          .update({
            status: subscription.status,
            plan_tier: planConfig.tier,
            daily_limit: planConfig.daily_limit,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            cancelled_at: subscription.cancel_at_period_end ? new Date().toISOString() : null,
            scheduled_downgrade_tier: subscription.cancel_at_period_end ? "free" : null,
          })
          .eq("stripe_subscription_id", subscription.id);

        if (updateError) {
          logStep("Error updating subscription", { error: updateError.message });
        } else {
          logStep("Subscription updated successfully");

          // Send notification if subscription was just cancelled
          if (justCancelled && currentSub?.user_id) {
            const daysRemaining = Math.ceil(
              (new Date(subscription.current_period_end * 1000).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );

            await supabase.rpc("create_notification", {
              p_user_id: currentSub.user_id,
              p_type: "subscription_cancelled",
              p_title_pt: "Assinatura cancelada",
              p_message_pt: `Sua assinatura foi cancelada. Você ainda pode usar os recursos do plano ${planConfig.tier} por mais ${daysRemaining} dias até ${new Date(subscription.current_period_end * 1000).toLocaleDateString("pt-BR")}.`,
              p_title_en: "Subscription cancelled",
              p_message_en: `Your subscription has been cancelled. You can still use ${planConfig.tier} plan features for ${daysRemaining} more days until ${new Date(subscription.current_period_end * 1000).toLocaleDateString("en-US")}.`,
              p_action_url: "/dashboard",
              p_action_label_pt: "Ver planos"
            });
            logStep("Cancellation notification sent", { userId: currentSub.user_id, daysRemaining });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Processing customer.subscription.deleted", { subscriptionId: subscription.id });

        // Get subscription from database to find user
        const { data: subData } = await supabase.from("subscriptions")
          .select("user_id")
          .eq("stripe_subscription_id", subscription.id)
          .single();

        if (subData) {
          // Get free plan config from database
          const freePlanConfig = await getFreePlanConfig(supabase);

          // Update subscription to cancelled/free
          await supabase.from("subscriptions")
            .update({
              status: "cancelled",
              plan_tier: freePlanConfig.tier,
              daily_limit: freePlanConfig.daily_limit,
              has_watermark: freePlanConfig.has_watermark,
              has_editor: freePlanConfig.has_editor,
              has_history: freePlanConfig.has_history,
            })
            .eq("stripe_subscription_id", subscription.id);

          // Update profile
          await supabase.from("profiles")
            .update({ plan_tier: freePlanConfig.tier })
            .eq("user_id", subData.user_id);

          logStep("Subscription cancelled successfully", { userId: subData.user_id });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Processing invoice.payment_failed", {
          invoiceId: invoice.id,
          attemptCount: invoice.attempt_count
        });

        const subscriptionId = invoice.subscription as string;
        if (subscriptionId) {
          // Get current subscription to update failure count
          const { data: currentSub } = await supabase.from("subscriptions")
            .select("user_id, failed_payment_count, plan_tier")
            .eq("stripe_subscription_id", subscriptionId)
            .single();

          const newFailureCount = (currentSub?.failed_payment_count || 0) + 1;

          const { error: updateError } = await supabase.from("subscriptions")
            .update({
              status: "past_due",
              failed_payment_count: newFailureCount,
              last_payment_failure: new Date().toISOString()
            })
            .eq("stripe_subscription_id", subscriptionId);

          if (updateError) {
            logStep("Error updating subscription", { error: updateError.message });
          } else {
            logStep("Subscription marked as past_due", { failureCount: newFailureCount });

            // Send notification about payment failure
            if (currentSub?.user_id) {
              const attemptsLeft = 3 - newFailureCount;

              if (newFailureCount >= 3) {
                // Final warning - account will be downgraded
                await supabase.rpc("create_notification", {
                  p_user_id: currentSub.user_id,
                  p_type: "payment_failed_final",
                  p_title_pt: "Última tentativa de pagamento falhou",
                  p_message_pt: "Sua conta será rebaixada para o plano gratuito em 24 horas se o pagamento não for regularizado.",
                  p_title_en: "Final payment attempt failed",
                  p_message_en: "Your account will be downgraded to free plan in 24 hours if payment is not resolved.",
                  p_action_url: "/dashboard",
                  p_action_label_pt: "Atualizar pagamento"
                });
              } else {
                // Warning about payment failure
                await supabase.rpc("create_notification", {
                  p_user_id: currentSub.user_id,
                  p_type: "payment_failed",
                  p_title_pt: "Falha no pagamento",
                  p_message_pt: `Não conseguimos processar seu pagamento. ${attemptsLeft > 0 ? `Restam ${attemptsLeft} tentativas antes da suspensão.` : ""}`,
                  p_title_en: "Payment failed",
                  p_message_en: `We couldn't process your payment. ${attemptsLeft > 0 ? `${attemptsLeft} attempts remaining before suspension.` : ""}`,
                  p_action_url: "/dashboard",
                  p_action_label_pt: "Atualizar pagamento"
                });
              }
            }
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Processing invoice.payment_succeeded", { invoiceId: invoice.id });

        const subscriptionId = invoice.subscription as string;
        if (subscriptionId) {
          // Reset failure count on successful payment
          await supabase.from("subscriptions")
            .update({
              status: "active",
              failed_payment_count: 0,
              last_payment_failure: null,
              scheduled_downgrade_tier: null
            })
            .eq("stripe_subscription_id", subscriptionId);

          logStep("Subscription marked as active, failure count reset");
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    // Mark event as processed
    await supabase.from("stripe_events")
      .update({ processed: true })
      .eq("event_id", event.id);

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
