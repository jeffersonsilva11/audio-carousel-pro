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
  console.log(`[REQUEST-PASSWORD-RESET] ${step}${detailsStr}`);
};

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Replace template variables
function replaceTemplateVariables(
  template: string,
  data: Record<string, string | number>
): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, "g");
    result = result.replace(regex, String(value));
  }
  return result;
}

// Fallback template
const fallbackTemplate = {
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
    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email é obrigatório" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Password reset requested", { email });

    // Check if user exists (but don't reveal this to the client for security)
    const { data: userData } = await supabaseClient.auth.admin.listUsers();
    const userExists = userData?.users?.some(u => u.email === email);

    if (!userExists) {
      // Don't reveal if user exists - return success anyway
      logStep("User not found, returning success for security", { email });
      return new Response(JSON.stringify({
        success: true,
        message: "Se o email existir, você receberá um código de recuperação."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check rate limiting - max 3 requests per hour per email
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentRequests } = await supabaseClient
      .from("password_reset_tokens")
      .select("*", { count: "exact", head: true })
      .eq("email", email)
      .gte("created_at", oneHourAgo);

    if (recentRequests && recentRequests >= 3) {
      logStep("Rate limit exceeded", { email, recentRequests });
      return new Response(JSON.stringify({
        error: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    // Generate OTP and save to database
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    const { error: insertError } = await supabaseClient
      .from("password_reset_tokens")
      .insert({
        email,
        token: otp,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      logStep("Error saving token", { error: insertError.message });
      throw new Error("Erro ao gerar código de recuperação");
    }

    // Get email settings
    const { data: settingsData } = await supabaseClient
      .from("app_settings")
      .select("key, value")
      .in("key", [
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

    const useCustomEmail = settings.use_custom_email_sending === "true";

    if (!useCustomEmail) {
      // If custom email is disabled, use Supabase's built-in reset
      logStep("Custom email disabled, using Supabase reset");
      const { error: resetError } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${Deno.env.get("SITE_URL") || "http://localhost:5173"}/auth/reset-password`,
      });

      if (resetError) {
        logStep("Supabase reset error", { error: resetError.message });
      }

      return new Response(JSON.stringify({
        success: true,
        provider: "supabase",
        message: "Se o email existir, você receberá um código de recuperação."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Use SMTP for custom email
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");

    if (!settings.smtp_host || !settings.smtp_user || !smtpPassword) {
      logStep("SMTP not configured");
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

    try {
      const { data: templateData } = await supabaseClient
        .from("email_templates")
        .select("subject, html_content")
        .eq("template_key", "password_reset")
        .eq("is_active", true)
        .single();

      if (templateData) {
        templateSubject = templateData.subject;
        templateHtml = templateData.html_content;
        logStep("Template loaded from database");
      } else {
        throw new Error("Template not found");
      }
    } catch {
      templateSubject = fallbackTemplate.subject;
      templateHtml = fallbackTemplate.html;
      logStep("Using fallback template");
    }

    // Prepare template data
    const templateData: Record<string, string | number> = {
      fromName: smtp.fromName,
      otp: otp,
      year: new Date().getFullYear(),
    };

    // Replace variables
    const emailSubject = replaceTemplateVariables(templateSubject, templateData);
    const emailHtml = replaceTemplateVariables(templateHtml, templateData);

    logStep("Sending email via SMTP", { to: email });

    try {
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

      await client.send({
        from: `${smtp.fromName} <${smtp.fromAddress}>`,
        to: email,
        subject: emailSubject,
        content: "auto",
        html: emailHtml,
      });

      await client.close();
      logStep("Email sent successfully", { to: email });
    } catch (smtpError: any) {
      logStep("SMTP error", { message: smtpError?.message });
      throw new Error(`Erro ao enviar e-mail: ${smtpError?.message}`);
    }

    return new Response(JSON.stringify({
      success: true,
      provider: "smtp",
      message: "Se o email existir, você receberá um código de recuperação."
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
