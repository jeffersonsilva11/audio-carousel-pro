import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Fallback plan configurations (used when database is not available)
const FALLBACK_PLAN_CONFIGS: Record<string, { name: string; description: string; price: number }> = {
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
    description: "20 carrosséis/dia, customização avançada, todos os recursos premium",
    price: 19990, // R$ 199,90
  },
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
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

    // Parse request body to get the plan tier, currency, and optional coupon code
    const { planTier = "starter", currency = "brl", couponCode = null } = await req.json().catch(() => ({ planTier: "starter", currency: "brl", couponCode: null }));
    logStep("Requested plan", { planTier, currency, couponCode });

    // Validate plan tier
    const validTiers = ["starter", "creator", "agency"];
    if (!validTiers.includes(planTier)) {
      throw new Error(`Invalid plan tier: ${planTier}. Valid options: ${validTiers.join(", ")}`);
    }

    // Get plan config from database
    const { data: dbPlanConfig, error: planError } = await supabaseClient
      .from("plans_config")
      .select("*")
      .eq("tier", planTier)
      .eq("is_active", true)
      .single();

    if (planError) {
      logStep("Could not fetch plan from database, using fallback", { error: planError.message });
    }

    // Determine price and Stripe Price ID based on currency
    let priceInCents: number;
    let stripePriceId: string | null = null;
    let checkoutLink: string | null = null;
    let planName: string;
    let planDescription: string;

    if (dbPlanConfig) {
      planName = dbPlanConfig.name_pt || `Audisell ${planTier.charAt(0).toUpperCase() + planTier.slice(1)}`;
      planDescription = dbPlanConfig.description_pt || "";

      switch (currency.toLowerCase()) {
        case "usd":
          priceInCents = dbPlanConfig.price_usd || Math.round(dbPlanConfig.price_brl * 0.17);
          stripePriceId = dbPlanConfig.stripe_price_id_usd;
          checkoutLink = dbPlanConfig.checkout_link_usd;
          break;
        case "eur":
          priceInCents = dbPlanConfig.price_eur || Math.round(dbPlanConfig.price_brl * 0.16);
          stripePriceId = dbPlanConfig.stripe_price_id_eur;
          checkoutLink = dbPlanConfig.checkout_link_eur;
          break;
        default: // brl
          priceInCents = dbPlanConfig.price_brl;
          stripePriceId = dbPlanConfig.stripe_price_id_brl;
          checkoutLink = dbPlanConfig.checkout_link_brl;
      }
    } else {
      // Fallback to hardcoded config
      const fallbackConfig = FALLBACK_PLAN_CONFIGS[planTier];
      planName = fallbackConfig.name;
      planDescription = fallbackConfig.description;
      priceInCents = fallbackConfig.price;
    }

    logStep("Plan config resolved", { planName, priceInCents, stripePriceId, checkoutLink, currency });

    // Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Validate coupon if provided
    let validatedCoupon: any = null;
    let stripeCouponId: string | null = null;

    if (couponCode) {
      logStep("Validating coupon", { couponCode, planTier, priceInCents });

      // Call the validate_coupon function
      const { data: couponData, error: couponError } = await supabaseClient
        .rpc("validate_coupon", {
          p_code: couponCode,
          p_user_id: user.id,
          p_plan_tier: planTier,
          p_price_cents: priceInCents
        });

      if (couponError) {
        logStep("Coupon validation error", { error: couponError.message });
        throw new Error(`Coupon validation failed: ${couponError.message}`);
      }

      if (couponData && couponData.length > 0) {
        validatedCoupon = couponData[0];

        if (!validatedCoupon.is_valid) {
          logStep("Coupon is not valid", { reason: validatedCoupon.error_message });
          throw new Error(validatedCoupon.error_message || "Invalid coupon");
        }

        logStep("Coupon validated successfully", {
          coupon: validatedCoupon.code,
          discountType: validatedCoupon.discount_type,
          discountValue: validatedCoupon.discount_value
        });
      }
    }

    // If there's a custom checkout link configured, redirect to it
    if (checkoutLink) {
      logStep("Using custom checkout link", { checkoutLink });
      // Append customer email as query param for pre-fill
      const checkoutUrl = new URL(checkoutLink);
      checkoutUrl.searchParams.set("prefilled_email", user.email);
      checkoutUrl.searchParams.set("client_reference_id", user.id);

      return new Response(JSON.stringify({ url: checkoutUrl.toString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16"
    });

    // Check if customer exists in Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    // Use configured Stripe Price ID or find/create one
    let priceId = stripePriceId;

    if (!priceId) {
      // Search for existing price with matching amount and currency
      const prices = await stripe.prices.list({
        active: true,
        type: "recurring",
        limit: 100,
      });

      priceId = prices.data.find((p: { unit_amount: number | null; currency: string; recurring?: { interval: string } | null }) =>
        p.unit_amount === priceInCents &&
        p.currency === currency.toLowerCase() &&
        p.recurring?.interval === "month"
      )?.id;

      if (!priceId) {
        logStep("Creating new price for plan", { planTier, price: priceInCents, currency });
        const price = await stripe.prices.create({
          unit_amount: priceInCents,
          currency: currency.toLowerCase(),
          recurring: { interval: "month" },
          product_data: {
            name: planName,
            description: planDescription,
          },
        });
        priceId = price.id;
        logStep("Created price", { priceId });

        // Optionally update the database with the new price ID
        if (dbPlanConfig) {
          const priceIdField = `stripe_price_id_${currency.toLowerCase()}`;
          await supabaseClient
            .from("plans_config")
            .update({ [priceIdField]: priceId })
            .eq("id", dbPlanConfig.id);
          logStep("Updated database with new price ID", { priceIdField, priceId });
        }
      } else {
        logStep("Using existing price", { priceId });
      }
    } else {
      logStep("Using configured Stripe Price ID", { priceId });
    }

    // Create or get Stripe coupon if we have a validated coupon
    if (validatedCoupon) {
      try {
        // Try to find existing Stripe coupon with matching ID
        const stripeCouponCode = `PROMO_${validatedCoupon.code}`;

        try {
          const existingCoupon = await stripe.coupons.retrieve(stripeCouponCode);
          if (existingCoupon && !existingCoupon.deleted) {
            stripeCouponId = existingCoupon.id;
            logStep("Using existing Stripe coupon", { stripeCouponId });
          }
        } catch {
          // Coupon doesn't exist in Stripe, create it
          logStep("Creating new Stripe coupon", { code: stripeCouponCode });

          const couponParams: any = {
            id: stripeCouponCode,
            name: validatedCoupon.description || validatedCoupon.code,
            duration: "once", // Apply discount once (first month)
          };

          if (validatedCoupon.discount_type === "percentage") {
            couponParams.percent_off = validatedCoupon.discount_value;
          } else {
            // Fixed amount - need to match currency
            couponParams.amount_off = validatedCoupon.discount_value;
            couponParams.currency = currency.toLowerCase();
          }

          const newCoupon = await stripe.coupons.create(couponParams);
          stripeCouponId = newCoupon.id;
          logStep("Created Stripe coupon", { stripeCouponId });
        }
      } catch (couponError) {
        logStep("Error creating/retrieving Stripe coupon", { error: String(couponError) });
        // Continue without coupon if there's an error
      }
    }

    // Create checkout session
    const origin = req.headers.get("origin") || "http://localhost:5173";
    const sessionParams: any = {
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
        coupon_code: couponCode || undefined,
        coupon_id: validatedCoupon?.coupon_id || undefined,
      },
    };

    // Apply discount if we have a valid Stripe coupon
    if (stripeCouponId) {
      sessionParams.discounts = [{ coupon: stripeCouponId }];
      logStep("Applying discount to checkout", { stripeCouponId });
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

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
