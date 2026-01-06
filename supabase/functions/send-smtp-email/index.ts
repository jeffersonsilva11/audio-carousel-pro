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
  console.log(`[SEND-SMTP-EMAIL] ${step}${detailsStr}`);
};

// Fallback email templates (used when database templates are not available)
const fallbackTemplates: Record<string, { subject: string; html: string }> = {
  test: {
    subject: "🎉 Teste de E-mail - {{fromName}}",
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
      <h2 style="color: #18181b; margin: 0 0 20px 0; font-size: 24px;">✅ Configuração SMTP funcionando!</h2>
      <p style="color: #52525b; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
        Este é um e-mail de teste para verificar se suas configurações SMTP estão corretas.
      </p>
      <div style="background-color: #f4f4f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
        <p style="color: #71717a; font-size: 14px; margin: 0;"><strong>Host:</strong> {{host}}</p>
        <p style="color: #71717a; font-size: 14px; margin: 8px 0 0 0;"><strong>Porta:</strong> {{port}}</p>
        <p style="color: #71717a; font-size: 14px; margin: 8px 0 0 0;"><strong>TLS/SSL:</strong> {{secure}}</p>
      </div>
      <p style="color: #22c55e; font-size: 16px; font-weight: 600;">
        🎉 Tudo certo! Seus e-mails de verificação e recuperação de senha funcionarão corretamente.
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
  },
  verification: {
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
  },
  password_reset: {
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
  },
  welcome: {
    subject: "Bem-vindo ao {{fromName}}! 🎉",
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
      <h2 style="color: #18181b; margin: 0 0 20px 0; font-size: 24px;">Sua conta foi ativada! 🎉</h2>
      <p style="color: #52525b; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
        Olá{{name}}! Sua conta foi verificada com sucesso e você já pode começar a transformar seus áudios em carrosséis incríveis.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="{{siteUrl}}/dashboard"
           style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Acessar Dashboard
        </a>
      </div>
      <p style="color: #71717a; font-size: 14px; line-height: 22px; margin: 24px 0 0 0;">
        Dica: Comece enviando um áudio de até 5 minutos e veja a mágica acontecer!
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
  },
};

// Replace template variables with actual values
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

// Load template from database or fallback to hard-coded
async function getTemplate(
  supabaseClient: ReturnType<typeof createClient>,
  templateKey: string
): Promise<{ subject: string; html: string } | null> {
  try {
    const { data, error } = await supabaseClient
      .from("email_templates")
      .select("subject, html_content, is_active")
      .eq("template_key", templateKey)
      .single();

    if (error || !data || !data.is_active) {
      logStep("Template not found in DB or inactive, using fallback", { templateKey });
      return fallbackTemplates[templateKey] || null;
    }

    logStep("Template loaded from database", { templateKey });
    return {
      subject: data.subject,
      html: data.html_content,
    };
  } catch (err) {
    logStep("Error loading template from DB, using fallback", { templateKey, error: err });
    return fallbackTemplates[templateKey] || null;
  }
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    const body = await req.json();
    const { to, subject, template, templateData, smtpConfig } = body;

    logStep("Received request", { to, template, hasSmtpConfig: !!smtpConfig });

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get SMTP config from request or from stored settings
    let smtp = smtpConfig;

    if (!smtp) {
      // Load from database
      const { data: settingsData } = await supabaseClient
        .from("app_settings")
        .select("key, value")
        .in("key", [
          "smtp_host",
          "smtp_port",
          "smtp_user",
          "smtp_secure",
          "custom_email_from_name",
          "custom_email_from_address",
        ]);

      const settings: Record<string, string> = {};
      settingsData?.forEach((row: { key: string; value: string }) => {
        settings[row.key] = row.value;
      });

      // Get password from environment (stored as secret)
      const smtpPassword = Deno.env.get("SMTP_PASSWORD");

      if (!settings.smtp_host || !settings.smtp_user || !smtpPassword) {
        throw new Error("SMTP não configurado. Configure no painel admin.");
      }

      smtp = {
        host: settings.smtp_host,
        port: parseInt(settings.smtp_port || "587"),
        user: settings.smtp_user,
        password: smtpPassword,
        secure: settings.smtp_secure === "true",
        fromName: settings.custom_email_from_name || "Audisell",
        fromAddress: settings.custom_email_from_address || settings.smtp_user,
      };
    }

    // Validate required fields
    if (!smtp.host || !smtp.user || !smtp.password) {
      throw new Error("Configuração SMTP incompleta");
    }

    if (!to) {
      throw new Error("Destinatário não informado");
    }

    // Prepare template data with common variables
    const fullTemplateData: Record<string, string | number | boolean> = {
      ...templateData,
      fromName: smtp.fromName || "Audisell",
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure ? "Sim" : "Não",
      siteUrl: Deno.env.get("SITE_URL") || "https://audisell.com",
      year: new Date().getFullYear(),
    };

    // Get email content from template or use provided subject/html
    let emailSubject = subject;
    let emailHtml = body.html;

    if (template) {
      const templateContent = await getTemplate(supabaseClient, template);

      if (templateContent) {
        emailSubject = replaceTemplateVariables(templateContent.subject, fullTemplateData);
        emailHtml = replaceTemplateVariables(templateContent.html, fullTemplateData);
      } else {
        throw new Error(`Template "${template}" não encontrado`);
      }
    }

    if (!emailSubject || !emailHtml) {
      throw new Error("Assunto e conteúdo do e-mail são obrigatórios");
    }

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
        from: `${smtp.fromName} <${smtp.fromAddress || smtp.user}>`,
        to: to,
        subject: emailSubject,
        content: "auto",
        html: emailHtml,
      });

      await client.close();

      logStep("Email sent successfully", { to });
    } catch (smtpError: any) {
      logStep("SMTP ERROR", {
        message: smtpError?.message,
        name: smtpError?.name,
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure
      });
      throw new Error(`Erro SMTP: ${smtpError?.message || "Falha ao conectar ao servidor de e-mail"}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "E-mail enviado com sucesso",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
