import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plan configurations (prices in cents BRL)
const PLAN_CONFIGS: Record<string, { name: string; description: string; price: number }> = {
  starter: {
    name: "Audisell Starter",
    description: "1 carrossel/dia, sem marca d'água, editor visual, histórico",
    price: 2990, // R$ 29,90
  },
  creator: {
    name: "Audisell Creator",
    description: "8 carrosséis/dia, todos os templates, editor completo, prioridade",
    price: 9990, // R$ 99,90
  },
  agency: {
    name: "Audisell Agency",
    description: "20 carrosséis/dia, geração de imagens AI, todos os recursos premium",
    price: 19990, // R$ 199,90
  },
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    // Parse request body to get the plan tier
    const { planTier = "starter" } = await req.json().catch(() => ({ planTier: "starter" }));
    logStep("Requested plan", { planTier });

    // Validate plan tier
    if (!PLAN_CONFIGS[planTier]) {
      throw new Error(`Invalid plan tier: ${planTier}. Valid options: starter, creator, agency`);
    }

    const planConfig = PLAN_CONFIGS[planTier];

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    // Find or create the price for this plan
    const prices = await stripe.prices.list({
      active: true,
      type: "recurring",
      limit: 100,
    });
    
    let priceId = prices.data.find((p: { unit_amount: number | null; currency: string; recurring?: { interval: string } | null }) => 
      p.unit_amount === planConfig.price && 
      p.currency === "brl" && 
      p.recurring?.interval === "month"
    )?.id;

    if (!priceId) {
      logStep("Creating new price for plan", { planTier, price: planConfig.price });
      const price = await stripe.prices.create({
        unit_amount: planConfig.price,
        currency: "brl",
        recurring: { interval: "month" },
        product_data: {
          name: planConfig.name,
          description: planConfig.description,
        },
      });
      priceId = price.id;
      logStep("Created price", { priceId });
    } else {
      logStep("Using existing price", { priceId });
    }

    const origin = req.headers.get("origin") || "http://localhost:5173";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/dashboard?subscription=success`,
      cancel_url: `${origin}/dashboard?subscription=canceled`,
      metadata: {
        plan_tier: planTier,
        user_id: user.id,
      },
    });

    logStep("Checkout session created", { sessionId: session.id, planTier });

    return new Response(JSON.stringify({ url: session.url }), {
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
