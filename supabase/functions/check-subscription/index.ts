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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, returning free plan");
      return new Response(JSON.stringify({ 
        subscribed: false,
        plan: "free",
        daily_limit: 1,
        has_watermark: true,
        has_editor: false,
        has_history: false,
        has_image_generation: false
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
    let hasImageGeneration = false;

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
          hasImageGeneration = false;
          break;
        case "creator":
          dailyLimit = 8;
          hasWatermark = false;
          hasEditor = true;
          hasHistory = true;
          hasImageGeneration = false;
          break;
        case "agency":
          dailyLimit = 20;
          hasWatermark = false;
          hasEditor = true;
          hasHistory = true;
          hasImageGeneration = true;
          break;
      }

      logStep("Determined plan tier", { plan, dailyLimit, hasImageGeneration });
    } else {
      logStep("No active subscription found, using free plan");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan,
      price_id: priceId,
      subscription_end: subscriptionEnd,
      daily_limit: dailyLimit,
      has_watermark: hasWatermark,
      has_editor: hasEditor,
      has_history: hasHistory,
      has_image_generation: hasImageGeneration
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
