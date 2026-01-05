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

    // Get daily usage from database
    const today = new Date().toISOString().split('T')[0];
    const { data: usageData } = await supabaseClient
      .from("daily_usage")
      .select("carousels_created")
      .eq("user_id", user.id)
      .eq("usage_date", today)
      .maybeSingle();

    const dailyUsed = usageData?.carousels_created || 0;
    logStep("Daily usage fetched", { dailyUsed, date: today });

    // CHECK ADMIN FIRST - No Stripe dependency for admins
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const isAdmin = !!roleData;

    if (isAdmin) {
      logStep("User is admin, granting unlimited access (no Stripe check)");
      return new Response(JSON.stringify({
        subscribed: true,
        plan: "creator",
        price_id: null,
        subscription_end: null,
        daily_limit: 9999,
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
          .select("daily_limit, has_watermark, has_editor, has_history")
          .eq("tier", manualSub.plan_tier)
          .single();

        const dailyLimit = manualSub.custom_daily_limit || planConfig?.daily_limit || 8;

        logStep("User has active manual subscription", {
          plan: manualSub.plan_tier,
          expiresAt: manualSub.expires_at,
          dailyLimit
        });

        return new Response(JSON.stringify({
          subscribed: true,
          plan: manualSub.plan_tier,
          price_id: null,
          subscription_end: manualSub.expires_at,
          daily_limit: dailyLimit,
          daily_used: dailyUsed,
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
      logStep("No STRIPE_SECRET_KEY configured, returning free plan");
      return new Response(JSON.stringify({
        subscribed: false,
        plan: "free",
        daily_limit: 1,
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
      logStep("No Stripe customer found, returning free plan");
      return new Response(JSON.stringify({
        subscribed: false,
        plan: "free",
        daily_limit: 1,
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
    let dailyLimit = 1;
    let hasWatermark = true;
    let hasEditor = false;
    let hasHistory = false;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();

      // Get the price from the subscription
      const price = subscription.items.data[0]?.price;
      priceId = price?.id;
      const unitAmount = price?.unit_amount;

      logStep("Active subscription found", {
        subscriptionId: subscription.id,
        endDate: subscriptionEnd,
        priceId,
        unitAmount
      });

      // Determine plan tier based on price amount
      if (unitAmount && PRICE_TO_PLAN[unitAmount]) {
        plan = PRICE_TO_PLAN[unitAmount];
      } else {
        // Fallback: check if it's any paid subscription
        plan = "starter";
      }

      // Set features based on plan
      switch (plan) {
        case "starter":
          dailyLimit = 1;
          hasWatermark = false;
          hasEditor = true;
          hasHistory = true;
          break;
        case "creator":
          dailyLimit = 8;
          hasWatermark = false;
          hasEditor = true;
          hasHistory = true;
          break;
        case "agency":
          dailyLimit = 20;
          hasWatermark = false;
          hasEditor = true;
          hasHistory = true;
          break;
      }

      logStep("Determined plan tier", { plan, dailyLimit });
    } else {
      logStep("No active subscription found, using free plan");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan,
      price_id: priceId,
      subscription_end: subscriptionEnd,
      daily_limit: dailyLimit,
      daily_used: dailyUsed,
      has_watermark: hasWatermark,
      has_editor: hasEditor,
      has_history: hasHistory,
      is_admin: false
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
