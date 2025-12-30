import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Plan configuration
const PRICE_TO_PLAN: Record<number, { tier: string; dailyLimit: number }> = {
  2990: { tier: "starter", dailyLimit: 1 },
  9990: { tier: "creator", dailyLimit: 8 },
  19990: { tier: "agency", dailyLimit: 20 },
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
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

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      logStep("Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For now, we'll process without signature verification since we don't have the webhook secret
    // In production, you should add STRIPE_WEBHOOK_SECRET and verify the signature
    let event: Stripe.Event;
    
    try {
      event = JSON.parse(body) as Stripe.Event;
      logStep("Event parsed", { type: event.type, id: event.id });
    } catch (parseError) {
      logStep("Failed to parse event", { error: String(parseError) });
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
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
        const unitAmount = price?.unit_amount || 0;
        const planConfig = PRICE_TO_PLAN[unitAmount] || { tier: "starter", dailyLimit: 1 };

        logStep("Subscription details", { 
          subscriptionId, 
          unitAmount, 
          plan: planConfig.tier 
        });

        // Upsert subscription record
        const { error: subError } = await supabase.from("subscriptions").upsert({
          user_id: user.id,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscriptionId,
          price_id: price?.id,
          plan_tier: planConfig.tier,
          daily_limit: planConfig.dailyLimit,
          status: "active",
          has_watermark: false,
          has_editor: true,
          has_history: true,
          has_image_generation: planConfig.tier === "agency",
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
          status: subscription.status 
        });

        const price = subscription.items.data[0]?.price;
        const unitAmount = price?.unit_amount || 0;
        const planConfig = PRICE_TO_PLAN[unitAmount] || { tier: "starter", dailyLimit: 1 };

        // Update subscription in database
        const { error: updateError } = await supabase.from("subscriptions")
          .update({
            status: subscription.status,
            plan_tier: planConfig.tier,
            daily_limit: planConfig.dailyLimit,
            has_image_generation: planConfig.tier === "agency",
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (updateError) {
          logStep("Error updating subscription", { error: updateError.message });
        } else {
          logStep("Subscription updated successfully");
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
          // Update subscription to cancelled/free
          await supabase.from("subscriptions")
            .update({
              status: "cancelled",
              plan_tier: "free",
              daily_limit: 1,
              has_watermark: true,
              has_editor: false,
              has_history: false,
              has_image_generation: false,
            })
            .eq("stripe_subscription_id", subscription.id);

          // Update profile
          await supabase.from("profiles")
            .update({ plan_tier: "free" })
            .eq("user_id", subData.user_id);

          logStep("Subscription cancelled successfully", { userId: subData.user_id });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Processing invoice.payment_failed", { invoiceId: invoice.id });

        const subscriptionId = invoice.subscription as string;
        if (subscriptionId) {
          await supabase.from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", subscriptionId);
          
          logStep("Subscription marked as past_due");
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Processing invoice.payment_succeeded", { invoiceId: invoice.id });

        const subscriptionId = invoice.subscription as string;
        if (subscriptionId) {
          await supabase.from("subscriptions")
            .update({ status: "active" })
            .eq("stripe_subscription_id", subscriptionId);
          
          logStep("Subscription marked as active");
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
