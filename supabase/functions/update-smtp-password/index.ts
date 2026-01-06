import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    const { password } = await req.json();

    if (!password) {
      throw new Error("Senha não informada");
    }

    // Note: In production, you would store this as a Supabase secret
    // using the Supabase CLI: supabase secrets set SMTP_PASSWORD=yourpassword
    // This function just validates the request - the actual password
    // needs to be set via CLI or Dashboard

    console.log("[UPDATE-SMTP-PASSWORD] Password update requested");
    console.log("[UPDATE-SMTP-PASSWORD] To set the password, run: supabase secrets set SMTP_PASSWORD=<password>");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Para configurar a senha SMTP, use: supabase secrets set SMTP_PASSWORD=<senha>",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[UPDATE-SMTP-PASSWORD] ERROR:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
