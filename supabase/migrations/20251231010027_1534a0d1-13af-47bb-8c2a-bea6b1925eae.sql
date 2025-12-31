-- Create table for dynamic landing page content
CREATE TABLE public.landing_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key TEXT NOT NULL,
  content_key TEXT NOT NULL,
  value_pt TEXT NOT NULL,
  value_en TEXT,
  value_es TEXT,
  content_type TEXT DEFAULT 'text', -- text, richtext, url, json
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(section_key, content_key)
);

-- Enable RLS
ALTER TABLE public.landing_content ENABLE ROW LEVEL SECURITY;

-- Anyone can read landing content (it's public content)
CREATE POLICY "Anyone can read landing content"
ON public.landing_content
FOR SELECT
USING (true);

-- Only admins can manage landing content
CREATE POLICY "Admins can manage landing content"
ON public.landing_content
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_landing_content_updated_at
BEFORE UPDATE ON public.landing_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default content for all sections
INSERT INTO public.landing_content (section_key, content_key, value_pt, value_en, value_es, content_type) VALUES
-- Hero section
('hero', 'badge', 'Powered by AI — 100% automatizado', 'Powered by AI — 100% automated', 'Powered by AI — 100% automatizado', 'text'),
('hero', 'title_part1', 'Transforme sua', 'Transform your', 'Transforma tu', 'text'),
('hero', 'title_highlight', 'voz', 'voice', 'voz', 'text'),
('hero', 'title_part2', 'em carrosséis profissionais', 'into professional carousels', 'en carruseles profesionales', 'text'),
('hero', 'subtitle', 'Grave um áudio de até 60 segundos. Nossa IA transcreve, roteiriza e gera slides prontos para Instagram, LinkedIn, TikTok e mais.', 'Record audio up to 60 seconds. Our AI transcribes, scripts, and generates ready-to-post slides for Instagram, LinkedIn, TikTok and more.', 'Graba un audio de hasta 60 segundos. Nuestra IA transcribe, guioniza y genera slides listos para Instagram, LinkedIn, TikTok y más.', 'text'),
('hero', 'cta_primary', 'Criar meu primeiro carrossel', 'Create my first carousel', 'Crear mi primer carrusel', 'text'),
('hero', 'cta_secondary', 'Ver como funciona', 'See how it works', 'Ver cómo funciona', 'text'),

-- How It Works section
('how_it_works', 'section_title', 'Como funciona', 'How it works', 'Cómo funciona', 'text'),
('how_it_works', 'title', 'De áudio a carrossel em 3 passos', 'From audio to carousel in 3 steps', 'De audio a carrusel en 3 pasos', 'text'),
('how_it_works', 'subtitle', 'Processo 100% automatizado. Você fala, a IA faz o resto.', '100% automated process. You speak, AI does the rest.', 'Proceso 100% automatizado. Tú hablas, la IA hace el resto.', 'text'),
('how_it_works', 'step1_title', 'Grave ou envie', 'Record or upload', 'Graba o sube', 'text'),
('how_it_works', 'step1_desc', 'Grave um áudio de até 60 segundos ou faça upload. Fale naturalmente sobre o que quiser compartilhar.', 'Record audio up to 60 seconds or upload. Speak naturally about what you want to share.', 'Graba un audio de hasta 60 segundos o sube. Habla naturalmente sobre lo que quieras compartir.', 'text'),
('how_it_works', 'step2_title', 'IA transforma', 'AI transforms', 'IA transforma', 'text'),
('how_it_works', 'step2_desc', 'Nossa IA transcreve, aplica frameworks de storytelling e gera um roteiro otimizado com gatilhos mentais.', 'Our AI transcribes, applies storytelling frameworks, and generates an optimized script with mental triggers.', 'Nuestra IA transcribe, aplica frameworks de storytelling y genera un guión optimizado con disparadores mentales.', 'text'),
('how_it_works', 'step3_title', 'Baixe e poste', 'Download and post', 'Descarga y publica', 'text'),
('how_it_works', 'step3_desc', 'Receba slides profissionais prontos em alta qualidade. Baixe e poste direto nas redes sociais.', 'Receive professional ready slides in high quality. Download and post directly on social media.', 'Recibe slides profesionales listos en alta calidad. Descarga y publica directamente en las redes sociales.', 'text'),

-- CTA section
('cta', 'badge', 'Comece agora — teste grátis', 'Start now — free trial', 'Empieza ahora — prueba gratis', 'text'),
('cta', 'title', 'Pronto para transformar suas ideias em carrosséis?', 'Ready to transform your ideas into carousels?', '¿Listo para transformar tus ideas en carruseles?', 'text'),
('cta', 'subtitle', 'Grave um áudio. Deixe a IA fazer o resto. Poste em segundos.', 'Record an audio. Let AI do the rest. Post in seconds.', 'Graba un audio. Deja que la IA haga el resto. Publica en segundos.', 'text'),
('cta', 'button', 'Criar meu carrossel grátis', 'Create my free carousel', 'Crear mi carrusel gratis', 'text'),
('cta', 'disclaimer', 'Sem cartão de crédito · 1 carrossel grátis · Cancele quando quiser', 'No credit card · 1 free carousel · Cancel anytime', 'Sin tarjeta de crédito · 1 carrusel gratis · Cancela cuando quieras', 'text'),

-- Testimonials section
('testimonials', 'title', 'O que criadores estão dizendo', 'What creators are saying', 'Lo que dicen los creadores', 'text'),
('testimonials', 'subtitle', 'Resultados reais de quem já usa o Audisell', 'Real results from those who already use Audisell', 'Resultados reales de quienes ya usan Audisell', 'text'),

-- Trusted By section
('trusted_by', 'title', 'Tecnologia usada por', 'Technology used by', 'Tecnología usada por', 'text'),
('trusted_by', 'subtitle', 'Powered by tecnologias de IA líderes do mercado', 'Powered by market-leading AI technologies', 'Powered by tecnologías de IA líderes del mercado', 'text'),
('trusted_by', 'enabled', 'true', 'true', 'true', 'text');
