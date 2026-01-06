import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-RESET-TOKEN] ${step}${detailsStr}`);
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
    const { email, token, newPassword } = await req.json();

    if (!email || !token) {
      return new Response(JSON.stringify({ error: "Email e código são obrigatórios" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (!newPassword) {
      return new Response(JSON.stringify({ error: "Nova senha é obrigatória" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (newPassword.length < 6) {
      return new Response(JSON.stringify({ error: "A senha deve ter pelo menos 6 caracteres" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Verifying reset token", { email, token: token.substring(0, 2) + "****" });

    // Find valid token
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from("password_reset_tokens")
      .select("*")
      .eq("email", email)
      .eq("token", token)
      .is("used_at", null)
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

    // Find user by email
    const { data: userData } = await supabaseClient.auth.admin.listUsers();
    const user = userData?.users?.find(u => u.email === email);

    if (!user) {
      logStep("User not found", { email });
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Update password
    const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      logStep("Error updating password", { error: updateError.message });
      return new Response(JSON.stringify({ error: "Erro ao atualizar senha" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Mark token as used
    await supabaseClient
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenData.id);

    // Invalidate all other tokens for this email
    await supabaseClient
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("email", email)
      .is("used_at", null);

    logStep("Password updated successfully", { email });

    return new Response(JSON.stringify({
      success: true,
      message: "Senha atualizada com sucesso!"
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
