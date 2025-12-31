-- Create testimonials table for dynamic testimonial management
CREATE TABLE public.testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_pt TEXT NOT NULL,
  quote_en TEXT,
  quote_es TEXT,
  author_name TEXT NOT NULL,
  author_role_pt TEXT NOT NULL,
  author_role_en TEXT,
  author_role_es TEXT,
  author_company TEXT,
  author_avatar TEXT,
  metric_value TEXT,
  metric_label_pt TEXT,
  metric_label_en TEXT,
  metric_label_es TEXT,
  rating INTEGER DEFAULT 5,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Public can read active testimonials
CREATE POLICY "Anyone can read active testimonials"
  ON public.testimonials
  FOR SELECT
  USING (is_active = true);

-- Admins can manage all testimonials
CREATE POLICY "Admins can manage testimonials"
  ON public.testimonials
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_testimonials_updated_at
  BEFORE UPDATE ON public.testimonials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default testimonials
INSERT INTO public.testimonials (quote_pt, quote_en, quote_es, author_name, author_role_pt, author_role_en, author_role_es, author_company, author_avatar, metric_value, metric_label_pt, metric_label_en, metric_label_es, rating, display_order) VALUES
('Eu passava 4 horas por dia criando conteúdo. Agora faço em 20 minutos. Meu engajamento triplicou e finalmente tenho tempo para focar no meu negócio.', 'I used to spend 4 hours a day creating content. Now I do it in 20 minutes. My engagement tripled and I finally have time to focus on my business.', 'Pasaba 4 horas al día creando contenido. Ahora lo hago en 20 minutos. Mi engagement se triplicó y finalmente tengo tiempo para enfocarme en mi negocio.', 'Marina Silva', 'Social Media Manager', 'Social Media Manager', 'Social Media Manager', 'Agência Digital', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face', '+340%', 'engajamento', 'engagement', 'engagement', 5, 1),
('O tom provocador mudou completamente meu perfil. Minhas postagens agora geram debates e meu alcance orgânico explodiu. A melhor ferramenta que já usei.', 'The provocative tone completely changed my profile. My posts now spark debates and my organic reach exploded. Best tool I have ever used.', 'El tono provocador cambió completamente mi perfil. Mis publicaciones ahora generan debates y mi alcance orgánico explotó. La mejor herramienta que he usado.', 'Carlos Mendes', 'Criador de Conteúdo', 'Content Creator', 'Creador de Contenido', '150K followers', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face', '+520%', 'alcance', 'reach', 'alcance', 5, 2),
('Como coach, preciso de conteúdo que conecte emocionalmente. O tom emocional do Audisell entende isso perfeitamente. Meus clientes sempre perguntam como eu faço.', 'As a coach, I need content that connects emotionally. Audisell emotional tone understands this perfectly. My clients always ask how I do it.', 'Como coach, necesito contenido que conecte emocionalmente. El tono emocional de Audisell lo entiende perfectamente. Mis clientes siempre preguntan cómo lo hago.', 'Ana Beatriz', 'Life Coach', 'Life Coach', 'Life Coach', 'Coaching Premium', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face', '+180%', 'conversões', 'conversions', 'conversiones', 5, 3),
('Gerencio 12 contas de clientes. Antes era impossível manter qualidade e consistência. Com o Audisell, cada cliente tem conteúdo único e profissional todos os dias.', 'I manage 12 client accounts. It was impossible to maintain quality and consistency. With Audisell, each client has unique, professional content every day.', 'Gestiono 12 cuentas de clientes. Antes era imposible mantener calidad y consistencia. Con Audisell, cada cliente tiene contenido único y profesional todos los días.', 'Rodrigo Alves', 'Gestor de Redes Sociais', 'Social Media Manager', 'Gestor de Redes Sociales', 'MediaPro Agency', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face', '12', 'contas gerenciadas', 'accounts managed', 'cuentas gestionadas', 5, 4);

-- Create trusted_companies table for dynamic company logos
CREATE TABLE public.trusted_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_svg TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trusted_companies ENABLE ROW LEVEL SECURITY;

-- Public can read active companies
CREATE POLICY "Anyone can read active trusted companies"
  ON public.trusted_companies
  FOR SELECT
  USING (is_active = true);

-- Admins can manage all companies
CREATE POLICY "Admins can manage trusted companies"
  ON public.trusted_companies
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_trusted_companies_updated_at
  BEFORE UPDATE ON public.trusted_companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();