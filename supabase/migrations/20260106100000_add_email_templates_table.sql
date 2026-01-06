-- Create email_templates table for customizable email templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add comment to table
COMMENT ON TABLE public.email_templates IS 'Stores customizable email templates for transactional emails';

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Create policies using user_roles table (same pattern as other tables)
CREATE POLICY "Anyone can read email templates" ON public.email_templates
  FOR SELECT USING (true);

CREATE POLICY "Only admins can insert email templates" ON public.email_templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update email templates" ON public.email_templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete email templates" ON public.email_templates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_email_templates_updated_at();

-- Insert default templates
INSERT INTO public.email_templates (template_key, name, description, subject, html_content, variables) VALUES
(
  'test',
  'E-mail de Teste',
  'Enviado para testar configurações SMTP',
  '🎉 Teste de E-mail - {{fromName}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
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
</html>',
  '["fromName", "host", "port", "secure", "year"]'::jsonb
),
(
  'verification',
  'Verificação de Conta',
  'Enviado quando usuário se cadastra para confirmar o e-mail',
  'Confirme seu e-mail - {{fromName}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
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
</html>',
  '["fromName", "name", "otp", "year"]'::jsonb
),
(
  'password_reset',
  'Recuperação de Senha',
  'Enviado quando usuário solicita redefinição de senha',
  'Recuperar senha - {{fromName}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
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
</html>',
  '["fromName", "otp", "year"]'::jsonb
),
(
  'welcome',
  'Boas-vindas',
  'Enviado após confirmação de conta bem-sucedida',
  'Bem-vindo ao {{fromName}}! 🎉',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
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
</html>',
  '["fromName", "name", "siteUrl", "year"]'::jsonb
);
