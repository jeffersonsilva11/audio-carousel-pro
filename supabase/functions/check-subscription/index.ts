import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plan price mapping (in cents BRL)
const PRICE_TO_PLAN: Record<number, string> = {
  2990: "starter",   // R$ 29,90
  9990: "creator",   // R$ 99,90
  19990: "agency",   // R$ 199,90
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Helper function to get usage based on period
async function getUsageForPeriod(
  supabaseClient: any,
  userId: string,
  period: string
): Promise<number> {
  const today = new Date();
  let startDate: string;

  switch (period) {
    case 'weekly': {
      // Start of current week (Monday)
      const dayOfWeek = today.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + mondayOffset);
      startDate = monday.toISOString().split('T')[0];
      break;
    }
    case 'monthly': {
      // Start of current month
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      startDate = firstDay.toISOString().split('T')[0];
      break;
    }
    case 'daily':
    default:
      startDate = today.toISOString().split('T')[0];
  }

  const endDate = today.toISOString().split('T')[0];

  const { data } = await supabaseClient
    .from("daily_usage")
    .select("carousels_created")
    .eq("user_id", userId)
    .gte("usage_date", startDate)
    .lte("usage_date", endDate);

  const totalUsed = data?.reduce((sum: number, row: any) => sum + (row.carousels_created || 0), 0) || 0;
  return totalUsed;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Authenticate user first
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // CHECK ADMIN FIRST - No Stripe dependency for admins
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const isAdmin = !!roleData;

    if (isAdmin) {
      const dailyUsed = await getUsageForPeriod(supabaseClient, user.id, 'daily');
      logStep("User is admin, granting unlimited access (no Stripe check)");
      return new Response(JSON.stringify({
        subscribed: true,
        plan: "creator",
        price_id: null,
        subscription_end: null,
        daily_limit: 9999,
        limit_period: "daily",
        period_used: dailyUsed,
        daily_used: dailyUsed,
        has_watermark: false,
        has_editor: true,
        has_history: true,
        has_image_generation: true,
        is_admin: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // CHECK MANUAL SUBSCRIPTION SECOND (priority over Stripe)
    const { data: manualSub } = await supabaseClient
      .from("manual_subscriptions")
      .select("plan_tier, custom_daily_limit, expires_at")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (manualSub) {
      // Check if not expired
      const isExpired = manualSub.expires_at && new Date(manualSub.expires_at) < new Date();

      if (!isExpired) {
        // Get plan config from database
        const { data: planConfig } = await supabaseClient
          .from("plans_config")
          .select("daily_limit, limit_period, has_watermark, has_editor, has_history")
          .eq("tier", manualSub.plan_tier)
          .single();

        const carouselLimit = manualSub.custom_daily_limit || planConfig?.daily_limit || 8;
        const limitPeriod = planConfig?.limit_period || 'daily';
        const periodUsed = await getUsageForPeriod(supabaseClient, user.id, limitPeriod);

        logStep("User has active manual subscription", {
          plan: manualSub.plan_tier,
          expiresAt: manualSub.expires_at,
          carouselLimit,
          limitPeriod,
          periodUsed
        });

        return new Response(JSON.stringify({
          subscribed: true,
          plan: manualSub.plan_tier,
          price_id: null,
          subscription_end: manualSub.expires_at,
          daily_limit: carouselLimit,
          limit_period: limitPeriod,
          period_used: periodUsed,
          daily_used: periodUsed, // For backward compatibility
          has_watermark: planConfig?.has_watermark ?? false,
          has_editor: planConfig?.has_editor ?? true,
          has_history: planConfig?.has_history ?? true,
          has_image_generation: true,
          is_admin: false,
          is_manual: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        logStep("Manual subscription expired", { expiresAt: manualSub.expires_at });
      }
    }

    // For non-admin users, check Stripe subscription
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    // If no Stripe key configured, return free plan for non-admins
    if (!stripeKey) {
      const dailyUsed = await getUsageForPeriod(supabaseClient, user.id, 'daily');
      logStep("No STRIPE_SECRET_KEY configured, returning free plan");
      return new Response(JSON.stringify({
        subscribed: false,
        plan: "free",
        daily_limit: 1,
        limit_period: "daily",
        period_used: dailyUsed,
        daily_used: dailyUsed,
        has_watermark: true,
        has_editor: false,
        has_history: false,
        is_admin: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      const dailyUsed = await getUsageForPeriod(supabaseClient, user.id, 'daily');
      logStep("No Stripe customer found, returning free plan");
      return new Response(JSON.stringify({
        subscribed: false,
        plan: "free",
        daily_limit: 1,
        limit_period: "daily",
        period_used: dailyUsed,
        daily_used: dailyUsed,
        has_watermark: true,
        has_editor: false,
        has_history: false,
        is_admin: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let plan = "free";
    let subscriptionEnd = null;
    let priceId = null;
    let carouselLimit = 1;
    let limitPeriod = "daily";
    let hasWatermark = true;
    let hasEditor = false;
    let hasHistory = false;

    // Also check local subscription record for cancellation info
    let cancelAtPeriodEnd = false;
    let cancelledAt = null;
    let failedPaymentCount = 0;
    let status = "active";

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      cancelAtPeriodEnd = subscription.cancel_at_period_end || false;

      // Get the price from the subscription
      const price = subscription.items.data[0]?.price;
      priceId = price?.id;
      const unitAmount = price?.unit_amount;

      logStep("Active subscription found", {
        subscriptionId: subscription.id,
        endDate: subscriptionEnd,
        priceId,
        unitAmount,
        cancelAtPeriodEnd
      });

      // Determine plan tier based on price amount
      if (unitAmount && PRICE_TO_PLAN[unitAmount]) {
        plan = PRICE_TO_PLAN[unitAmount];
      } else {
        // Fallback: check if it's any paid subscription
        plan = "starter";
      }

      // Get plan config from database for features and limits
      const { data: planConfig } = await supabaseClient
        .from("plans_config")
        .select("daily_limit, limit_period, has_watermark, has_editor, has_history")
        .eq("tier", plan)
        .single();

      if (planConfig) {
        carouselLimit = planConfig.daily_limit;
        limitPeriod = planConfig.limit_period || 'daily';
        hasWatermark = planConfig.has_watermark ?? false;
        hasEditor = planConfig.has_editor ?? true;
        hasHistory = planConfig.has_history ?? true;
      } else {
        // Fallback defaults if plan config not found
        switch (plan) {
          case "starter":
            carouselLimit = 3;
            limitPeriod = "weekly";
            hasWatermark = false;
            hasEditor = true;
            hasHistory = true;
            break;
          case "creator":
            carouselLimit = 1;
            limitPeriod = "daily";
            hasWatermark = false;
            hasEditor = true;
            hasHistory = true;
            break;
          case "agency":
            carouselLimit = 8;
            limitPeriod = "daily";
            hasWatermark = false;
            hasEditor = true;
            hasHistory = true;
            break;
        }
      }

      // Get additional info from local subscription record
      const { data: localSub } = await supabaseClient
        .from("subscriptions")
        .select("cancelled_at, failed_payment_count, status")
        .eq("stripe_subscription_id", subscription.id)
        .single();

      if (localSub) {
        cancelledAt = localSub.cancelled_at;
        failedPaymentCount = localSub.failed_payment_count || 0;
        status = localSub.status || "active";
      }

      logStep("Determined plan tier", { plan, carouselLimit, limitPeriod, cancelAtPeriodEnd, cancelledAt });
    } else {
      // Check if there's a cancelled subscription that's still within period
      const { data: cancelledSub } = await supabaseClient
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("cancel_at_period_end", true)
        .gt("current_period_end", new Date().toISOString())
        .single();

      if (cancelledSub) {
        // User has cancelled but still within subscription period
        plan = cancelledSub.plan_tier;
        carouselLimit = cancelledSub.daily_limit;
        hasWatermark = cancelledSub.has_watermark;
        hasEditor = cancelledSub.has_editor;
        hasHistory = cancelledSub.has_history;
        subscriptionEnd = cancelledSub.current_period_end;
        cancelAtPeriodEnd = true;
        cancelledAt = cancelledSub.cancelled_at;
        failedPaymentCount = cancelledSub.failed_payment_count || 0;
        status = cancelledSub.status || "active";

        // Get limit_period from plan config
        const { data: planConfig } = await supabaseClient
          .from("plans_config")
          .select("limit_period")
          .eq("tier", plan)
          .single();

        limitPeriod = planConfig?.limit_period || 'daily';

        logStep("Found cancelled subscription still within period", {
          plan,
          subscriptionEnd,
          cancelledAt,
          limitPeriod
        });
      } else {
        logStep("No active subscription found, using free plan");
      }
    }

    // Calculate usage based on the plan's period
    const periodUsed = await getUsageForPeriod(supabaseClient, user.id, limitPeriod);

    return new Response(JSON.stringify({
      subscribed: hasActiveSub || (cancelAtPeriodEnd && subscriptionEnd && new Date(subscriptionEnd) > new Date()),
      plan,
      price_id: priceId,
      subscription_end: subscriptionEnd,
      daily_limit: carouselLimit,
      limit_period: limitPeriod,
      period_used: periodUsed,
      daily_used: periodUsed, // For backward compatibility
      has_watermark: hasWatermark,
      has_editor: hasEditor,
      has_history: hasHistory,
      is_admin: false,
      cancel_at_period_end: cancelAtPeriodEnd,
      cancelled_at: cancelledAt,
      failed_payment_count: failedPaymentCount,
      status: status
    }), {
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
