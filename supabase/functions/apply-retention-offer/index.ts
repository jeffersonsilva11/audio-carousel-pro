import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[APPLY-RETENTION-OFFER] ${step}${detailsStr}`);
};

const RETENTION_COUPON_ID = "RETENTION_50_OFF";
const DISCOUNT_PERCENT = 50;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user can receive retention offer
    const { data: canReceive, error: checkError } = await supabaseClient
      .rpc("can_receive_retention_offer", { p_user_id: user.id });

    if (checkError) {
      logStep("Error checking retention offer eligibility", { error: checkError.message });
      throw new Error("Failed to check offer eligibility");
    }

    if (!canReceive) {
      logStep("User already used retention offer", { userId: user.id });
      return new Response(JSON.stringify({
        success: false,
        error: "already_used",
        message: "You have already used the retention offer. This offer is available only once."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Get user's subscription from database
    const { data: subscription, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (subError || !subscription?.stripe_subscription_id) {
      logStep("No active subscription found", { error: subError?.message });
      throw new Error("No active subscription found");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Create or get the retention coupon
    let coupon: Stripe.Coupon;
    try {
      coupon = await stripe.coupons.retrieve(RETENTION_COUPON_ID);
      logStep("Retrieved existing coupon", { couponId: coupon.id });
    } catch {
      // Coupon doesn't exist, create it
      coupon = await stripe.coupons.create({
        id: RETENTION_COUPON_ID,
        percent_off: DISCOUNT_PERCENT,
        duration: "once", // Apply only to the next invoice
        name: "Retention Offer - 50% Off",
        metadata: {
          type: "retention",
          description: "One-time retention offer for users considering cancellation"
        }
      });
      logStep("Created new coupon", { couponId: coupon.id });
    }

    // Apply coupon to the subscription (will apply to next invoice)
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        coupon: RETENTION_COUPON_ID,
        // Also cancel the pending cancellation
        cancel_at_period_end: false,
      }
    );
    logStep("Applied coupon to subscription", {
      subscriptionId: updatedSubscription.id,
      discount: updatedSubscription.discount?.coupon?.id
    });

    // Mark retention offer as used in database
    const { data: offerUsed, error: useError } = await supabaseClient
      .rpc("use_retention_offer", {
        p_user_id: user.id,
        p_discount: DISCOUNT_PERCENT
      });

    if (useError) {
      logStep("Error marking offer as used", { error: useError.message });
      // Don't fail the request - the Stripe coupon was already applied
    } else {
      logStep("Marked retention offer as used", { success: offerUsed });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Retention offer applied successfully",
      discount_percent: DISCOUNT_PERCENT,
      applies_to: "next_invoice"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
