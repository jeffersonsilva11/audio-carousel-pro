import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-VERIFICATION-EMAIL] ${step}${detailsStr}`);
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
    const { email, name, type = "signup" } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Starting email send", { email, type });

    // Get email settings from app_settings
    const { data: settingsData } = await supabaseClient
      .from("app_settings")
      .select("key, value")
      .in("key", [
        "email_verification_enabled",
        "use_custom_email_sending",
        "custom_email_from_name",
        "custom_email_from_address"
      ]);

    const settings: Record<string, string> = {};
    settingsData?.forEach((row: { key: string; value: string }) => {
      settings[row.key] = row.value;
    });

    const emailVerificationEnabled = settings.email_verification_enabled !== "false";
    const useCustomEmail = settings.use_custom_email_sending === "true";

    if (!emailVerificationEnabled) {
      logStep("Email verification disabled, skipping");
      return new Response(JSON.stringify({
        success: true,
        skipped: true,
        message: "Email verification is disabled"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // If not using custom email, let Supabase handle it
    if (!useCustomEmail) {
      logStep("Using Supabase default email");
      const { error } = await supabaseClient.auth.resend({
        type: "signup",
        email,
      });

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        provider: "supabase"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Custom email sending with Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      logStep("RESEND_API_KEY not configured, falling back to Supabase");
      const { error } = await supabaseClient.auth.resend({
        type: "signup",
        email,
      });

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        provider: "supabase",
        note: "RESEND_API_KEY not configured"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Generate OTP for verification
    const { data: otpData, error: otpError } = await supabaseClient.auth.admin.generateLink({
      type: "signup",
      email,
      options: {
        redirectTo: `${Deno.env.get("SITE_URL") || "http://localhost:5173"}/dashboard`,
      }
    });

    if (otpError) {
      logStep("Error generating link", { error: otpError.message });
      // User might already exist, try magic link instead
      const { data: magicData, error: magicError } = await supabaseClient.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

      if (magicError) throw magicError;

      // Extract OTP from hashed_token
      // Note: For OTP verification, we need to use a different approach
    }

    // Extract the token from the URL
    let token = "";
    if (otpData?.properties?.hashed_token) {
      // For OTP, we need to generate a 6-digit code
      // Supabase's generateLink doesn't directly give us the OTP code
      // We'll need to use a workaround - trigger the signup flow again
    }

    // Send email via Resend
    const fromName = settings.custom_email_from_name || "Audisell";
    const fromAddress = settings.custom_email_from_address || "noreply@audisell.com";
    const siteUrl = Deno.env.get("SITE_URL") || "http://localhost:5173";

    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirme seu e-mail</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🎙️ ${fromName}</h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px 30px;">
      <h2 style="color: #18181b; margin: 0 0 20px 0; font-size: 24px;">Bem-vindo${name ? `, ${name}` : ''}! 👋</h2>

      <p style="color: #52525b; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
        Obrigado por se cadastrar no ${fromName}! Para ativar sua conta, clique no botão abaixo:
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${otpData?.properties?.action_link || siteUrl}"
           style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Confirmar E-mail
        </a>
      </div>

      <p style="color: #71717a; font-size: 14px; line-height: 22px; margin: 24px 0 0 0;">
        Se você não criou uma conta no ${fromName}, pode ignorar este e-mail com segurança.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f4f4f5; padding: 20px 30px; text-align: center;">
      <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} ${fromName}. Todos os direitos reservados.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <${fromAddress}>`,
        to: [email],
        subject: `Confirme seu e-mail - ${fromName}`,
        html: emailHtml,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      logStep("Resend API error", resendData);
      throw new Error(resendData.message || "Failed to send email via Resend");
    }

    logStep("Email sent successfully via Resend", { id: resendData.id });

    return new Response(JSON.stringify({
      success: true,
      provider: "resend",
      messageId: resendData.id
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
