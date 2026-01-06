import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-VERIFICATION-EMAIL] ${step}${detailsStr}`);
};

// Replace template variables
function replaceTemplateVariables(
  template: string,
  data: Record<string, string | number | boolean>
): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    result = result.replace(regex, String(value));
  }
  return result;
}

// Fallback template
const fallbackVerificationTemplate = {
  subject: "Confirme seu e-mail - {{fromName}}",
  html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <div style="background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🎙️ {{fromName}}</h1>
    </div>
    <div style="padding: 40px 30px;">
      <h2 style="color: #18181b; margin: 0 0 20px 0; font-size: 24px;">Bem-vindo{{name}}! 👋</h2>
      <p style="color: #52525b; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
        Obrigado por se cadastrar! Para ativar sua conta, use o código abaixo:
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); color: #ffffff; display: inline-block; padding: 20px 40px; border-radius: 12px; font-size: 32px; font-weight: bold; letter-spacing: 8px;">
          {{otp}}
        </div>
      </div>
      <p style="color: #71717a; font-size: 14px; line-height: 22px; margin: 24px 0 0 0; text-align: center;">
        Este código expira em <strong>24 horas</strong>.
      </p>
      <p style="color: #71717a; font-size: 14px; line-height: 22px; margin: 16px 0 0 0;">
        Se você não criou uma conta, pode ignorar este e-mail com segurança.
      </p>
    </div>
    <div style="background-color: #f4f4f5; padding: 20px 30px; text-align: center;">
      <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
        © {{year}} {{fromName}}. Todos os direitos reservados.
      </p>
    </div>
  </div>
</body>
</html>`,
};

const fallbackPasswordResetTemplate = {
  subject: "Recuperar senha - {{fromName}}",
  html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <div style="background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🎙️ {{fromName}}</h1>
    </div>
    <div style="padding: 40px 30px;">
      <h2 style="color: #18181b; margin: 0 0 20px 0; font-size: 24px;">Recuperar sua senha 🔐</h2>
      <p style="color: #52525b; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
        Recebemos uma solicitação para redefinir sua senha. Use o código abaixo para criar uma nova senha:
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); color: #ffffff; display: inline-block; padding: 20px 40px; border-radius: 12px; font-size: 32px; font-weight: bold; letter-spacing: 8px;">
          {{otp}}
        </div>
      </div>
      <p style="color: #71717a; font-size: 14px; line-height: 22px; margin: 24px 0 0 0; text-align: center;">
        Este código expira em <strong>1 hora</strong>.
      </p>
      <p style="color: #71717a; font-size: 14px; line-height: 22px; margin: 16px 0 0 0;">
        Se você não solicitou a recuperação de senha, ignore este e-mail. Sua senha permanecerá a mesma.
      </p>
    </div>
    <div style="background-color: #f4f4f5; padding: 20px 30px; text-align: center;">
      <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
        © {{year}} {{fromName}}. Todos os direitos reservados.
      </p>
    </div>
  </div>
</body>
</html>`,
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
    const { email, name, otp, type = "signup" } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (!otp) {
      return new Response(JSON.stringify({ error: "OTP is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Starting email send", { email, type, hasOtp: !!otp });

    // Get email settings from app_settings
    const { data: settingsData } = await supabaseClient
      .from("app_settings")
      .select("key, value")
      .in("key", [
        "email_verification_enabled",
        "use_custom_email_sending",
        "custom_email_from_name",
        "custom_email_from_address",
        "smtp_host",
        "smtp_port",
        "smtp_user",
        "smtp_secure",
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
      return new Response(JSON.stringify({
        success: true,
        provider: "supabase",
        message: "Using Supabase default email"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Use SMTP for custom email sending
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");

    if (!settings.smtp_host || !settings.smtp_user || !smtpPassword) {
      logStep("SMTP not configured, cannot send custom email");
      return new Response(JSON.stringify({
        error: "SMTP não configurado. Configure no painel admin."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const smtp = {
      host: settings.smtp_host,
      port: parseInt(settings.smtp_port || "465"),
      user: settings.smtp_user,
      password: smtpPassword,
      secure: settings.smtp_secure === "true",
      fromName: settings.custom_email_from_name || "Audisell",
      fromAddress: settings.custom_email_from_address || settings.smtp_user,
    };

    // Try to load template from database
    let templateSubject: string;
    let templateHtml: string;
    const templateKey = type === "recovery" ? "password_reset" : "verification";

    try {
      const { data: templateData } = await supabaseClient
        .from("email_templates")
        .select("subject, html_content")
        .eq("template_key", templateKey)
        .eq("is_active", true)
        .single();

      if (templateData) {
        templateSubject = templateData.subject;
        templateHtml = templateData.html_content;
        logStep("Template loaded from database", { templateKey });
      } else {
        throw new Error("Template not found");
      }
    } catch {
      // Use fallback template
      const fallback = type === "recovery" ? fallbackPasswordResetTemplate : fallbackVerificationTemplate;
      templateSubject = fallback.subject;
      templateHtml = fallback.html;
      logStep("Using fallback template", { templateKey });
    }

    // Prepare template data
    const templateData: Record<string, string | number> = {
      fromName: smtp.fromName,
      name: name ? `, ${name}` : "",
      otp: otp,
      year: new Date().getFullYear(),
    };

    // Replace variables
    const emailSubject = replaceTemplateVariables(templateSubject, templateData);
    const emailHtml = replaceTemplateVariables(templateHtml, templateData);

    logStep("Connecting to SMTP", { host: smtp.host, port: smtp.port, secure: smtp.secure });

    try {
      // Create SMTP client
      const client = new SMTPClient({
        connection: {
          hostname: smtp.host,
          port: smtp.port,
          tls: smtp.secure,
          auth: {
            username: smtp.user,
            password: smtp.password,
          },
        },
      });

      // Send email
      await client.send({
        from: `${smtp.fromName} <${smtp.fromAddress}>`,
        to: email,
        subject: emailSubject,
        content: "auto",
        html: emailHtml,
      });

      await client.close();

      logStep("Email sent successfully via SMTP", { to: email, type });
    } catch (smtpError: any) {
      logStep("SMTP ERROR", {
        message: smtpError?.message,
        host: smtp.host,
        port: smtp.port,
      });
      throw new Error(`Erro SMTP: ${smtpError?.message || "Falha ao enviar e-mail"}`);
    }

    return new Response(JSON.stringify({
      success: true,
      provider: "smtp",
      message: "E-mail enviado com sucesso"
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
