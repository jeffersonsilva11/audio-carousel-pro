import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Helper function to get usage based on period
async function getUsageForPeriod(
  supabaseClient: SupabaseClient,
  userId: string,
  period: string
): Promise<number> {
  const today = new Date();
  let startDate: string;

  switch (period) {
    case 'weekly': {
      const dayOfWeek = today.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + mondayOffset);
      startDate = monday.toISOString().split('T')[0];
      break;
    }
    case 'monthly': {
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

  const totalUsed = data?.reduce((sum: number, row: { carousels_created: number }) => sum + (row.carousels_created || 0), 0) || 0;
  return totalUsed;
}

// Get plan config from database by price_id or tier
async function getPlanConfig(
  supabase: SupabaseClient,
  priceId: string | null,
  tier: string | null
): Promise<{ tier: string; daily_limit: number; limit_period: string; has_watermark: boolean; has_editor: boolean; has_history: boolean } | null> {
  // First try by price_id
  if (priceId) {
    const { data } = await supabase
      .from("plans_config")
      .select("tier, daily_limit, limit_period, has_watermark, has_editor, has_history")
      .or(`stripe_price_id_brl.eq.${priceId},stripe_price_id_usd.eq.${priceId},stripe_price_id_eur.eq.${priceId}`)
      .eq("is_active", true)
      .maybeSingle();

    if (data) return data;
  }

  // Then try by tier
  if (tier) {
    const { data } = await supabase
      .from("plans_config")
      .select("tier, daily_limit, limit_period, has_watermark, has_editor, has_history")
      .eq("tier", tier)
      .eq("is_active", true)
      .maybeSingle();

    if (data) return data;
  }

  return null;
}

// Default free plan config
const FREE_PLAN = {
  subscribed: false,
  plan: "free",
  daily_limit: 1,
  limit_period: "daily",
  has_watermark: true,
  has_editor: false,
  has_history: false,
  is_admin: false,
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

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
    logStep("User authenticated", { userId: user.id });

    // Run initial checks in parallel for better performance
    const [roleResult, manualSubResult, localSubResult, retentionOfferResult, profileResult] = await Promise.all([
      // Check admin role
      supabaseClient.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
      // Check manual subscription
      supabaseClient.from("manual_subscriptions").select("plan_tier, custom_daily_limit, expires_at").eq("user_id", user.id).eq("is_active", true).maybeSingle(),
      // Check local subscription record (from webhook)
      supabaseClient.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle(),
      // Check if user can receive retention offer
      supabaseClient.rpc("can_receive_retention_offer", { p_user_id: user.id }),
      // Get user's bonus carousels from profile
      supabaseClient.from("profiles").select("bonus_carousels, signup_source").eq("user_id", user.id).maybeSingle(),
    ]);

    // Extract retention offer status
    const canReceiveRetentionOffer = retentionOfferResult.data ?? true;
    const retentionOfferUsedAt = localSubResult.data?.retention_offer_used_at || null;

    // Extract bonus carousels
    const bonusCarousels = profileResult.data?.bonus_carousels || 0;
    const signupSource = profileResult.data?.signup_source || 'direct';

    // 1. CHECK ADMIN FIRST
    if (roleResult.data) {
      const dailyUsed = await getUsageForPeriod(supabaseClient, user.id, 'daily');
      logStep("User is admin, granting unlimited access");
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
        is_admin: true,
        can_receive_retention_offer: canReceiveRetentionOffer,
        retention_offer_used_at: retentionOfferUsedAt
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 2. CHECK MANUAL SUBSCRIPTION (priority over Stripe)
    const manualSub = manualSubResult.data;
    if (manualSub) {
      const isExpired = manualSub.expires_at && new Date(manualSub.expires_at) < new Date();
      if (!isExpired) {
        const planConfig = await getPlanConfig(supabaseClient, null, manualSub.plan_tier);
        const carouselLimit = manualSub.custom_daily_limit || planConfig?.daily_limit || 8;
        const limitPeriod = planConfig?.limit_period || 'daily';
        const periodUsed = await getUsageForPeriod(supabaseClient, user.id, limitPeriod);

        logStep("User has active manual subscription", { plan: manualSub.plan_tier });
        return new Response(JSON.stringify({
          subscribed: true,
          plan: manualSub.plan_tier,
          price_id: null,
          subscription_end: manualSub.expires_at,
          daily_limit: carouselLimit,
          limit_period: limitPeriod,
          period_used: periodUsed,
          daily_used: periodUsed,
          has_watermark: planConfig?.has_watermark ?? false,
          has_editor: planConfig?.has_editor ?? true,
          has_history: planConfig?.has_history ?? true,
          has_image_generation: true,
          is_admin: false,
          is_manual: true,
          can_receive_retention_offer: canReceiveRetentionOffer,
          retention_offer_used_at: retentionOfferUsedAt
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // 3. CHECK LOCAL SUBSCRIPTION RECORD (from webhook - faster than Stripe API)
    const localSub = localSubResult.data;
    if (localSub && localSub.status === "active") {
      // Use local data - it's kept in sync by webhooks
      const periodEndDate = localSub.current_period_end ? new Date(localSub.current_period_end) : null;
      const isValid = periodEndDate && periodEndDate > new Date();

      if (isValid) {
        const planConfig = await getPlanConfig(supabaseClient, localSub.price_id, localSub.plan_tier);
        const limitPeriod = planConfig?.limit_period || 'daily';
        const periodUsed = await getUsageForPeriod(supabaseClient, user.id, limitPeriod);

        logStep("Using local subscription data", { plan: localSub.plan_tier, status: localSub.status });
        return new Response(JSON.stringify({
          subscribed: true,
          plan: localSub.plan_tier || "starter",
          price_id: localSub.price_id,
          subscription_end: localSub.current_period_end,
          daily_limit: planConfig?.daily_limit || localSub.daily_limit || 1,
          limit_period: limitPeriod,
          period_used: periodUsed,
          daily_used: periodUsed,
          has_watermark: planConfig?.has_watermark ?? localSub.has_watermark ?? false,
          has_editor: planConfig?.has_editor ?? localSub.has_editor ?? true,
          has_history: planConfig?.has_history ?? localSub.has_history ?? true,
          is_admin: false,
          cancel_at_period_end: localSub.cancel_at_period_end || false,
          cancelled_at: localSub.cancelled_at,
          failed_payment_count: localSub.failed_payment_count || 0,
          status: localSub.status,
          can_receive_retention_offer: canReceiveRetentionOffer,
          retention_offer_used_at: retentionOfferUsedAt
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // 4. CHECK CANCELLED BUT STILL VALID SUBSCRIPTION
    if (localSub && localSub.cancel_at_period_end) {
      const periodEndDate = localSub.current_period_end ? new Date(localSub.current_period_end) : null;
      const isStillValid = periodEndDate && periodEndDate > new Date();

      if (isStillValid) {
        const planConfig = await getPlanConfig(supabaseClient, localSub.price_id, localSub.plan_tier);
        const limitPeriod = planConfig?.limit_period || 'daily';
        const periodUsed = await getUsageForPeriod(supabaseClient, user.id, limitPeriod);

        logStep("Cancelled subscription still within period", { plan: localSub.plan_tier });
        return new Response(JSON.stringify({
          subscribed: true,
          plan: localSub.plan_tier || "starter",
          price_id: localSub.price_id,
          subscription_end: localSub.current_period_end,
          daily_limit: planConfig?.daily_limit || localSub.daily_limit || 1,
          limit_period: limitPeriod,
          period_used: periodUsed,
          daily_used: periodUsed,
          has_watermark: planConfig?.has_watermark ?? localSub.has_watermark ?? false,
          has_editor: planConfig?.has_editor ?? localSub.has_editor ?? true,
          has_history: planConfig?.has_history ?? localSub.has_history ?? true,
          is_admin: false,
          cancel_at_period_end: true,
          cancelled_at: localSub.cancelled_at,
          failed_payment_count: localSub.failed_payment_count || 0,
          status: localSub.status || "active",
          can_receive_retention_offer: canReceiveRetentionOffer,
          retention_offer_used_at: retentionOfferUsedAt
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // 5. FALLBACK: Check Stripe directly (only if no valid local data)
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      const dailyUsed = await getUsageForPeriod(supabaseClient, user.id, 'daily');
      logStep("No STRIPE_SECRET_KEY configured, returning free plan");
      return new Response(JSON.stringify({
        ...FREE_PLAN,
        period_used: dailyUsed,
        daily_used: dailyUsed,
        bonus_carousels: bonusCarousels,
        signup_source: signupSource,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("No valid local subscription, checking Stripe...");
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      const dailyUsed = await getUsageForPeriod(supabaseClient, user.id, 'daily');
      logStep("No Stripe customer found, returning free plan");
      return new Response(JSON.stringify({
        ...FREE_PLAN,
        period_used: dailyUsed,
        daily_used: dailyUsed,
        bonus_carousels: bonusCarousels,
        signup_source: signupSource,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      const dailyUsed = await getUsageForPeriod(supabaseClient, user.id, 'daily');
      logStep("No active Stripe subscription, returning free plan");
      return new Response(JSON.stringify({
        ...FREE_PLAN,
        period_used: dailyUsed,
        daily_used: dailyUsed,
        bonus_carousels: bonusCarousels,
        signup_source: signupSource,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Found active Stripe subscription - sync to local and return
    const subscription = subscriptions.data[0];
    const price = subscription.items.data[0]?.price;
    const priceId = price?.id || null;

    const planConfig = await getPlanConfig(supabaseClient, priceId, null);
    const limitPeriod = planConfig?.limit_period || 'daily';
    const periodUsed = await getUsageForPeriod(supabaseClient, user.id, limitPeriod);

    logStep("Found active Stripe subscription", { subscriptionId: subscription.id, plan: planConfig?.tier });

    return new Response(JSON.stringify({
      subscribed: true,
      plan: planConfig?.tier || "starter",
      price_id: priceId,
      subscription_end: new Date(subscription.current_period_end * 1000).toISOString(),
      daily_limit: planConfig?.daily_limit || 1,
      limit_period: limitPeriod,
      period_used: periodUsed,
      daily_used: periodUsed,
      has_watermark: planConfig?.has_watermark ?? false,
      has_editor: planConfig?.has_editor ?? true,
      has_history: planConfig?.has_history ?? true,
      is_admin: false,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      cancelled_at: null,
      failed_payment_count: 0,
      status: "active",
      can_receive_retention_offer: canReceiveRetentionOffer,
      retention_offer_used_at: retentionOfferUsedAt
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
