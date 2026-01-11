-- Migration: Add growth features (leads, email sequences, activity tracking)

-- 1. Leads table for exit intent and other lead capture
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'unknown',
  metadata JSONB DEFAULT '{}',
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, source)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- 2. Email sequences table
CREATE TABLE IF NOT EXISTS email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL, -- 'signup', 'trial_start', 'abandoned_cart', etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Email sequence steps
CREATE TABLE IF NOT EXISTS email_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID REFERENCES email_sequences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  delay_hours INTEGER NOT NULL DEFAULT 0, -- Hours after previous step (or trigger for first)
  subject_pt TEXT NOT NULL,
  subject_en TEXT,
  subject_es TEXT,
  body_pt TEXT NOT NULL,
  body_en TEXT,
  body_es TEXT,
  template_id TEXT, -- Reference to email template
  is_active BOOLEAN DEFAULT true,
  conditions JSONB DEFAULT '{}', -- Conditions to send (e.g., {"not_subscribed": true})
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for sequence steps
CREATE INDEX IF NOT EXISTS idx_email_sequence_steps_sequence ON email_sequence_steps(sequence_id, step_order);

-- 4. Email sequence enrollments (tracks users in sequences)
CREATE TABLE IF NOT EXISTS email_sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sequence_id UUID REFERENCES email_sequences(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'cancelled', 'converted'
  next_send_at TIMESTAMPTZ,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, sequence_id)
);

-- Index for enrollments
CREATE INDEX IF NOT EXISTS idx_email_enrollments_next_send ON email_sequence_enrollments(next_send_at) WHERE status = 'active';

-- 5. Activity log for real-time social proof
CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL, -- 'carousel_created', 'signup', 'subscription', etc.
  display_name TEXT, -- Anonymous display like "João S."
  metadata JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for recent activities
CREATE INDEX IF NOT EXISTS idx_activity_feed_recent ON activity_feed(created_at DESC) WHERE is_public = true;

-- 6. Early Access 500 configuration
INSERT INTO app_settings (key, value, description) VALUES
  ('early_access_enabled', 'true', 'Enable/disable the 500 early access promotion'),
  ('early_access_total_spots', '500', 'Total spots for early access'),
  ('early_access_plan_id', '', 'Stripe plan ID for early access offer'),
  ('early_access_checkout_url', '', 'Specific checkout URL for early access'),
  ('exit_intent_settings', $json${
    "enabled": true,
    "title_pt": "Espere! Não vá embora ainda...",
    "title_en": "Wait! Don''t leave yet...",
    "title_es": "¡Espera! No te vayas todavía...",
    "subtitle_pt": "Que tal criar seu primeiro carrossel grátis antes de sair?",
    "subtitle_en": "How about creating your first free carousel before leaving?",
    "subtitle_es": "¿Qué tal crear tu primer carrusel gratis antes de irte?",
    "cta_pt": "Quero meu carrossel grátis",
    "cta_en": "I want my free carousel",
    "cta_es": "Quiero mi carrusel gratis",
    "offer_pt": "Cadastre-se agora e ganhe 3 carrosséis extras no plano gratuito!",
    "offer_en": "Sign up now and get 3 extra carousels on the free plan!",
    "offer_es": "¡Regístrate ahora y obtén 3 carruseles extra en el plan gratuito!",
    "delay_seconds": 0,
    "show_once_per_session": true
  }$json$, 'Exit intent popup settings'),
  ('social_proof_enabled', 'true', 'Enable/disable real-time social proof notifications'),
  ('social_proof_interval_seconds', '8', 'Interval between social proof notifications')
ON CONFLICT (key) DO NOTHING;

-- 7. Insert default email sequence for onboarding
INSERT INTO email_sequences (id, name, description, trigger_event, is_active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Onboarding Sequence', 'Welcome sequence for new users', 'signup', true)
ON CONFLICT DO NOTHING;

-- 8. Insert default sequence steps
INSERT INTO email_sequence_steps (sequence_id, step_order, delay_hours, subject_pt, subject_en, subject_es, body_pt, body_en, body_es, conditions) VALUES
  -- Step 1: Welcome (immediate)
  ('00000000-0000-0000-0000-000000000001', 1, 0,
   'Bem-vindo ao Audisell! 🎉 Crie seu primeiro carrossel',
   'Welcome to Audisell! 🎉 Create your first carousel',
   '¡Bienvenido a Audisell! 🎉 Crea tu primer carrusel',
   'Olá {{name}},

Seja bem-vindo ao Audisell! Estamos muito felizes em ter você conosco.

Criar seu primeiro carrossel é super fácil:
1. Grave um áudio de até 30 segundos
2. Escolha o tom de voz (profissional, casual ou storytelling)
3. Pronto! Seus slides são gerados automaticamente

👉 Clique aqui para criar seu primeiro carrossel: {{dashboard_url}}

Qualquer dúvida, é só responder este e-mail.

Abraços,
Equipe Audisell',
   'Hello {{name}},

Welcome to Audisell! We''re so happy to have you with us.

Creating your first carousel is super easy:
1. Record an audio up to 30 seconds
2. Choose the voice tone (professional, casual or storytelling)
3. Done! Your slides are automatically generated

👉 Click here to create your first carousel: {{dashboard_url}}

Any questions, just reply to this email.

Best,
Audisell Team',
   'Hola {{name}},

¡Bienvenido a Audisell! Estamos muy felices de tenerte con nosotros.

Crear tu primer carrusel es súper fácil:
1. Graba un audio de hasta 30 segundos
2. Elige el tono de voz (profesional, casual o storytelling)
3. ¡Listo! Tus slides se generan automáticamente

👉 Haz clic aquí para crear tu primer carrusel: {{dashboard_url}}

Cualquier duda, solo responde este correo.

Saludos,
Equipo Audisell',
   '{}'),

  -- Step 2: Success case (24 hours later)
  ('00000000-0000-0000-0000-000000000001', 2, 24,
   'Como a Marina economiza 5 horas por semana com o Audisell',
   'How Marina saves 5 hours per week with Audisell',
   'Cómo Marina ahorra 5 horas por semana con Audisell',
   'Olá {{name}},

Quero compartilhar uma história rápida com você.

A Marina é social media manager e cuidava de 5 contas de clientes. Ela passava cerca de 1 hora por dia só criando carrosséis no Canva.

Depois que ela começou a usar o Audisell:
✅ Cria carrosséis em menos de 1 minuto
✅ Economiza 5+ horas por semana
✅ Conseguiu pegar mais 2 clientes

"Eu literalmente falo o que quero e o carrossel fica pronto. É surreal." - Marina

Você já criou seu primeiro carrossel?

👉 Experimente agora: {{dashboard_url}}

Abraços,
Equipe Audisell',
   'Hello {{name}},

I want to share a quick story with you.

Marina is a social media manager who managed 5 client accounts. She used to spend about 1 hour per day just creating carousels on Canva.

After she started using Audisell:
✅ Creates carousels in less than 1 minute
✅ Saves 5+ hours per week
✅ Was able to take on 2 more clients

"I literally say what I want and the carousel is done. It''s surreal." - Marina

Have you created your first carousel yet?

👉 Try it now: {{dashboard_url}}

Best,
Audisell Team',
   'Hola {{name}},

Quiero compartir una historia rápida contigo.

Marina es social media manager y manejaba 5 cuentas de clientes. Pasaba cerca de 1 hora por día solo creando carruseles en Canva.

Después de empezar a usar Audisell:
✅ Crea carruseles en menos de 1 minuto
✅ Ahorra 5+ horas por semana
✅ Pudo tomar 2 clientes más

"Literalmente digo lo que quiero y el carrusel está listo. Es surreal." - Marina

¿Ya creaste tu primer carrusel?

👉 Pruébalo ahora: {{dashboard_url}}

Saludos,
Equipo Audisell',
   '{}'),

  -- Step 3: Limited offer (48 hours later, only if not subscribed)
  ('00000000-0000-0000-0000-000000000001', 3, 48,
   '⏰ Últimas vagas: Preço de lançamento do Audisell',
   '⏰ Last spots: Audisell launch pricing',
   '⏰ Últimas plazas: Precio de lanzamiento de Audisell',
   'Olá {{name}},

Lembra que eu te falei sobre o acesso antecipado?

Estamos oferecendo preço fixo para sempre para os primeiros 500 assinantes do plano Creator.

{{spots_remaining}} vagas restantes.

O que você ganha:
✅ Preço travado para sempre (mesmo quando aumentarmos)
✅ Acesso antecipado a novos recursos
✅ Badge exclusivo de "Early Adopter"
✅ 15 carrosséis por dia
✅ Editor premium
✅ Sem marca d''água

👉 Garantir minha vaga: {{early_access_url}}

Essa oferta acaba quando atingirmos 500 assinantes.

Abraços,
Equipe Audisell

P.S.: Se você já está satisfeito com o plano gratuito, ignore este e-mail. Mas se quiser crescer suas redes sociais de verdade, essa é a melhor oportunidade.',
   'Hello {{name}},

Remember I told you about early access?

We''re offering a locked-in price forever for the first 500 Creator plan subscribers.

{{spots_remaining}} spots remaining.

What you get:
✅ Price locked forever (even when we increase it)
✅ Early access to new features
✅ Exclusive "Early Adopter" badge
✅ 15 carousels per day
✅ Premium editor
✅ No watermark

👉 Secure my spot: {{early_access_url}}

This offer ends when we reach 500 subscribers.

Best,
Audisell Team

P.S.: If you''re already satisfied with the free plan, ignore this email. But if you want to really grow your social media, this is the best opportunity.',
   'Hola {{name}},

¿Recuerdas que te hablé del acceso anticipado?

Estamos ofreciendo precio fijo para siempre para los primeros 500 suscriptores del plan Creator.

{{spots_remaining}} plazas restantes.

Lo que obtienes:
✅ Precio bloqueado para siempre (incluso cuando lo aumentemos)
✅ Acceso anticipado a nuevas funciones
✅ Badge exclusivo de "Early Adopter"
✅ 15 carruseles por día
✅ Editor premium
✅ Sin marca de agua

👉 Asegurar mi lugar: {{early_access_url}}

Esta oferta termina cuando alcancemos 500 suscriptores.

Saludos,
Equipo Audisell

P.D.: Si ya estás satisfecho con el plan gratuito, ignora este correo. Pero si quieres realmente hacer crecer tus redes sociales, esta es la mejor oportunidad.',
   '{"not_subscribed_to": ["creator", "agency"]}')
ON CONFLICT DO NOTHING;

-- 9. Function to auto-enroll users in onboarding sequence
CREATE OR REPLACE FUNCTION enroll_user_in_onboarding()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if onboarding sequence is active
  IF EXISTS (
    SELECT 1 FROM email_sequences
    WHERE id = '00000000-0000-0000-0000-000000000001'
    AND is_active = true
  ) THEN
    INSERT INTO email_sequence_enrollments (user_id, sequence_id, current_step, next_send_at)
    VALUES (NEW.id, '00000000-0000-0000-0000-000000000001', 0, NOW())
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-enrollment (on profiles creation, not auth.users)
DROP TRIGGER IF EXISTS trigger_enroll_onboarding ON profiles;
CREATE TRIGGER trigger_enroll_onboarding
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enroll_user_in_onboarding();

-- 10. Function to log activity for social proof
CREATE OR REPLACE FUNCTION log_carousel_activity()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  first_name TEXT;
BEGIN
  -- Get user's display name
  SELECT full_name INTO user_name FROM profiles WHERE id = NEW.user_id;

  -- Extract first name and initial
  IF user_name IS NOT NULL AND user_name != '' THEN
    first_name := split_part(user_name, ' ', 1);
    IF length(user_name) > length(first_name) THEN
      first_name := first_name || ' ' || left(split_part(user_name, ' ', 2), 1) || '.';
    END IF;
  ELSE
    first_name := 'Alguém';
  END IF;

  -- Insert activity
  INSERT INTO activity_feed (user_id, activity_type, display_name, metadata)
  VALUES (NEW.user_id, 'carousel_created', first_name, jsonb_build_object('carousel_id', NEW.id));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for carousel creation activity
DROP TRIGGER IF EXISTS trigger_log_carousel_activity ON carousels;
CREATE TRIGGER trigger_log_carousel_activity
  AFTER INSERT ON carousels
  FOR EACH ROW
  EXECUTE FUNCTION log_carousel_activity();

-- 11. RLS policies
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

-- Leads: only admins can see
CREATE POLICY "Admins can manage leads" ON leads
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Email sequences: only admins can manage
CREATE POLICY "Admins can manage email sequences" ON email_sequences
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage email sequence steps" ON email_sequence_steps
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Enrollments: users can see their own, admins can see all
CREATE POLICY "Users can view own enrollments" ON email_sequence_enrollments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage enrollments" ON email_sequence_enrollments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Activity feed: public activities are visible to all, admins can manage
CREATE POLICY "Anyone can view public activities" ON activity_feed
  FOR SELECT USING (is_public = true);

CREATE POLICY "Admins can manage activities" ON activity_feed
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
