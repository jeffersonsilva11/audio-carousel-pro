import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-EMAIL-VERIFICATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { userId, email } = await req.json();

    if (!userId && !email) {
      return new Response(JSON.stringify({ error: "userId ou email é obrigatório" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Checking email verification status", { userId, email });

    // First check if email verification is enabled in system settings
    const { data: settingData } = await supabaseClient
      .from("app_settings")
      .select("value")
      .eq("key", "email_verification_enabled")
      .maybeSingle();

    const verificationRequired = settingData?.value !== "false";

    if (!verificationRequired) {
      logStep("Email verification is disabled in settings");
      return new Response(JSON.stringify({
        verified: true,
        reason: "verification_disabled"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if custom email sending is enabled
    const { data: customEmailSetting } = await supabaseClient
      .from("app_settings")
      .select("value")
      .eq("key", "use_custom_email_sending")
      .maybeSingle();

    const useCustomEmail = customEmailSetting?.value === "true";

    // If custom email is NOT enabled, fall back to Supabase's email_confirmed_at
    if (!useCustomEmail) {
      logStep("Custom email disabled, checking Supabase email_confirmed_at");

      // Get user from auth.users
      const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(userId);

      if (userError || !userData?.user) {
        logStep("User not found", { error: userError?.message });
        return new Response(JSON.stringify({
          verified: false,
          reason: "user_not_found"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const isVerified = Boolean(userData.user.email_confirmed_at);
      logStep("Supabase verification check", {
        email_confirmed_at: userData.user.email_confirmed_at,
        isVerified
      });

      return new Response(JSON.stringify({
        verified: isVerified,
        reason: isVerified ? "supabase_confirmed" : "supabase_not_confirmed"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Custom email is enabled - check our email_verification_tokens table
    logStep("Custom email enabled, checking email_verification_tokens table");

    // Build query based on what we have
    let query = supabaseClient
      .from("email_verification_tokens")
      .select("id, verified_at")
      .not("verified_at", "is", null);

    if (userId) {
      query = query.eq("user_id", userId);
    }
    if (email) {
      query = query.eq("email", email);
    }

    const { data: tokenData, error: tokenError } = await query.limit(1).maybeSingle();

    if (tokenError) {
      logStep("Error checking tokens", { error: tokenError.message });
      // On error, fall back to Supabase check
      const { data: userData } = await supabaseClient.auth.admin.getUserById(userId);
      const isVerified = Boolean(userData?.user?.email_confirmed_at);
      return new Response(JSON.stringify({
        verified: isVerified,
        reason: "fallback_to_supabase"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // If we found a verified token, the user is verified
    if (tokenData?.verified_at) {
      logStep("Found verified token", { tokenId: tokenData.id });
      return new Response(JSON.stringify({
        verified: true,
        reason: "custom_token_verified"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // No verified token found - user is NOT verified
    logStep("No verified token found");
    return new Response(JSON.stringify({
      verified: false,
      reason: "no_verified_token"
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
