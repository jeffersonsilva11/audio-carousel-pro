import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-EMAIL-TOKEN] ${step}${detailsStr}`);
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
    const { email, token } = await req.json();

    if (!email || !token) {
      return new Response(JSON.stringify({ error: "Email e código são obrigatórios" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Verifying email token", { email, token: token.substring(0, 2) + "****" });

    // Find valid token
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from("email_verification_tokens")
      .select("*")
      .eq("email", email)
      .eq("token", token)
      .is("verified_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (tokenError || !tokenData) {
      logStep("Invalid or expired token", { email });
      return new Response(JSON.stringify({
        error: "Código inválido ou expirado. Solicite um novo código."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Confirm user's email using Admin API
    const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
      tokenData.user_id,
      { email_confirm: true }
    );

    if (updateError) {
      logStep("Error confirming email", { error: updateError.message });
      return new Response(JSON.stringify({ error: "Erro ao confirmar e-mail" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Mark token as verified
    await supabaseClient
      .from("email_verification_tokens")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", tokenData.id);

    // Invalidate all other tokens for this email
    await supabaseClient
      .from("email_verification_tokens")
      .update({ verified_at: new Date().toISOString() })
      .eq("email", email)
      .is("verified_at", null);

    logStep("Email verified successfully", { email, userId: tokenData.user_id });

    return new Response(JSON.stringify({
      success: true,
      userId: tokenData.user_id,
      message: "E-mail verificado com sucesso!"
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
