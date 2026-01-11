-- Migration: Add onboarding email sequence templates to email_templates table
-- This allows editing sequence emails from the same Email Templates interface

-- 1. Insert onboarding sequence templates (multi-language support via template variants)

-- Welcome Email (Step 1)
INSERT INTO public.email_templates (template_key, name, description, subject, html_content, variables, is_active) VALUES
(
  'onboarding_welcome',
  'Onboarding - Boas-vindas',
  'Primeiro e-mail da sequência de onboarding (enviado imediatamente após cadastro)',
  'Bem-vindo ao {{fromName}}! 🎉 Crie seu primeiro carrossel',
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
        Estamos muito felizes em ter você conosco! Criar seu primeiro carrossel é super fácil:
      </p>
      <div style="background-color: #f4f4f5; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <ol style="color: #52525b; font-size: 15px; line-height: 28px; margin: 0; padding-left: 20px;">
          <li>Grave um áudio de até 30 segundos</li>
          <li>Escolha o tom de voz (profissional, casual ou storytelling)</li>
          <li>Pronto! Seus slides são gerados automaticamente</li>
        </ol>
      </div>
      <div style="text-align: center; margin: 32px 0;">
        <a href="{{dashboardUrl}}"
           style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          👉 Criar meu primeiro carrossel
        </a>
      </div>
      <p style="color: #71717a; font-size: 14px; line-height: 22px; margin: 24px 0 0 0;">
        Qualquer dúvida, é só responder este e-mail!
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
  '["fromName", "name", "dashboardUrl", "year"]'::jsonb,
  true
),
-- Success Story Email (Step 2 - 24h later)
(
  'onboarding_success_story',
  'Onboarding - Caso de Sucesso',
  'Segundo e-mail da sequência de onboarding (enviado 24h após cadastro)',
  'Como a Marina economiza 5 horas por semana com o {{fromName}}',
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
      <h2 style="color: #18181b; margin: 0 0 20px 0; font-size: 24px;">Uma história inspiradora 💡</h2>
      <p style="color: #52525b; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
        Olá{{name}},
      </p>
      <p style="color: #52525b; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
        Quero compartilhar uma história rápida com você.
      </p>
      <p style="color: #52525b; font-size: 16px; line-height: 24px; margin: 0 0 16px 0;">
        A Marina é social media manager e cuidava de 5 contas de clientes. Ela passava cerca de 1 hora por dia só criando carrosséis no Canva.
      </p>
      <div style="background-color: #f4f4f5; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <p style="color: #52525b; font-size: 15px; line-height: 24px; margin: 0 0 12px 0;">
          <strong>Depois que ela começou a usar o {{fromName}}:</strong>
        </p>
        <p style="color: #22c55e; font-size: 15px; line-height: 28px; margin: 0;">
          ✅ Cria carrosséis em menos de 1 minuto<br>
          ✅ Economiza 5+ horas por semana<br>
          ✅ Conseguiu pegar mais 2 clientes
        </p>
      </div>
      <p style="color: #71717a; font-size: 15px; line-height: 24px; margin: 24px 0; font-style: italic; border-left: 3px solid #8b5cf6; padding-left: 16px;">
        "Eu literalmente falo o que quero e o carrossel fica pronto. É surreal." - Marina
      </p>
      <p style="color: #52525b; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
        <strong>Você já criou seu primeiro carrossel?</strong>
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="{{dashboardUrl}}"
           style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          👉 Experimentar agora
        </a>
      </div>
    </div>
    <div style="background-color: #f4f4f5; padding: 20px 30px; text-align: center;">
      <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
        © {{year}} {{fromName}}. Todos os direitos reservados.
      </p>
    </div>
  </div>
</body>
</html>',
  '["fromName", "name", "dashboardUrl", "year"]'::jsonb,
  true
),
-- Limited Offer Email (Step 3 - 48h later)
(
  'onboarding_limited_offer',
  'Onboarding - Oferta Limitada',
  'Terceiro e-mail da sequência de onboarding (enviado 48h após cadastro, apenas para não-assinantes)',
  '⏰ Últimas vagas: Preço de lançamento do {{fromName}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">⏰ Oferta por tempo limitado</h1>
    </div>
    <div style="padding: 40px 30px;">
      <h2 style="color: #18181b; margin: 0 0 20px 0; font-size: 24px;">Olá{{name}},</h2>
      <p style="color: #52525b; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
        Lembra que eu te falei sobre o acesso antecipado?
      </p>
      <p style="color: #52525b; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
        Estamos oferecendo <strong>preço fixo para sempre</strong> para os primeiros 500 assinantes do plano Creator.
      </p>
      <div style="background-color: #fef2f2; border: 2px solid #fecaca; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
        <p style="color: #dc2626; font-size: 24px; font-weight: bold; margin: 0;">
          {{spotsRemaining}} vagas restantes
        </p>
      </div>
      <div style="background-color: #f4f4f5; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <p style="color: #52525b; font-size: 15px; line-height: 24px; margin: 0 0 12px 0;">
          <strong>O que você ganha:</strong>
        </p>
        <p style="color: #22c55e; font-size: 15px; line-height: 28px; margin: 0;">
          ✅ Preço travado para sempre<br>
          ✅ Acesso antecipado a novos recursos<br>
          ✅ Badge exclusivo de "Early Adopter"<br>
          ✅ 15 carrosséis por dia<br>
          ✅ Editor premium<br>
          ✅ Sem marca d''água
        </p>
      </div>
      <div style="text-align: center; margin: 32px 0;">
        <a href="{{earlyAccessUrl}}"
           style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          👉 Garantir minha vaga
        </a>
      </div>
      <p style="color: #71717a; font-size: 14px; line-height: 22px; margin: 24px 0 0 0;">
        Essa oferta acaba quando atingirmos 500 assinantes.
      </p>
      <p style="color: #a1a1aa; font-size: 13px; line-height: 20px; margin: 16px 0 0 0;">
        P.S.: Se você já está satisfeito com o plano gratuito, ignore este e-mail. Mas se quiser crescer suas redes sociais de verdade, essa é a melhor oportunidade.
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
  '["fromName", "name", "spotsRemaining", "earlyAccessUrl", "year"]'::jsonb,
  true
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  variables = EXCLUDED.variables;

-- 2. Update email_sequence_steps to reference the new templates
UPDATE email_sequence_steps
SET template_id = 'onboarding_welcome'
WHERE sequence_id = '00000000-0000-0000-0000-000000000001' AND step_order = 1;

UPDATE email_sequence_steps
SET template_id = 'onboarding_success_story'
WHERE sequence_id = '00000000-0000-0000-0000-000000000001' AND step_order = 2;

UPDATE email_sequence_steps
SET template_id = 'onboarding_limited_offer'
WHERE sequence_id = '00000000-0000-0000-0000-000000000001' AND step_order = 3;

-- 3. Add comment explaining the integration
COMMENT ON COLUMN email_sequence_steps.template_id IS 'References email_templates.template_key for editable templates. If NULL, uses inline subject/body fields.';
