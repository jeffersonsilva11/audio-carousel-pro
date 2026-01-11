-- Migration: Add new landing page sections for growth optimization
-- Description: Adds new sections based on growth frameworks (Aversão à Perda, Círculo Dourado, etc.)

-- ============================================================================
-- NEW LANDING CONTENT SECTIONS
-- ============================================================================

-- Problem Section (O Quê, E Daí, E Agora framework)
INSERT INTO landing_content (section_key, content_key, value_pt, value_en, value_es, content_type) VALUES
-- Problem Section Header
('problem', 'badge', 'O PROBLEMA', 'THE PROBLEM', 'EL PROBLEMA', 'text'),
('problem', 'title', 'Criar conteúdo consistente é exaustivo', 'Creating consistent content is exhausting', 'Crear contenido consistente es agotador', 'text'),
('problem', 'subtitle', 'E você sabe que consistência é o que separa criadores que crescem dos que desistem', 'And you know that consistency is what separates creators who grow from those who give up', 'Y sabes que la consistencia es lo que separa a los creadores que crecen de los que se rinden', 'text'),

-- Problem Points (O Quê)
('problem', 'point1_icon', 'clock', 'clock', 'clock', 'text'),
('problem', 'point1_title', '5 horas por semana', '5 hours per week', '5 horas por semana', 'text'),
('problem', 'point1_description', 'É o tempo médio gasto criando posts manualmente. Tempo que poderia ser investido no seu negócio.', 'Is the average time spent creating posts manually. Time that could be invested in your business.', 'Es el tiempo promedio dedicado a crear posts manualmente. Tiempo que podría invertirse en tu negocio.', 'text'),

('problem', 'point2_icon', 'trending-down', 'trending-down', 'trending-down', 'text'),
('problem', 'point2_title', '40% menos engajamento', '40% less engagement', '40% menos engagement', 'text'),
('problem', 'point2_description', 'É o que acontece quando você fica dias sem postar. O algoritmo penaliza a inconsistência.', 'Is what happens when you go days without posting. The algorithm penalizes inconsistency.', 'Es lo que sucede cuando pasas días sin publicar. El algoritmo penaliza la inconsistencia.', 'text'),

('problem', 'point3_icon', 'users', 'users', 'users', 'text'),
('problem', 'point3_title', '97% dos criadores', '97% of creators', '97% de los creadores', 'text'),
('problem', 'point3_description', 'Não conseguem manter uma rotina de publicação. Você não está sozinho nessa luta.', 'Cannot maintain a posting routine. You are not alone in this struggle.', 'No pueden mantener una rutina de publicación. No estás solo en esta lucha.', 'text'),

-- Solution (E Agora)
('problem', 'solution_badge', 'A SOLUÇÃO', 'THE SOLUTION', 'LA SOLUCIÓN', 'text'),
('problem', 'solution_title', 'Fale por 30 segundos. Receba uma semana de conteúdo.', 'Speak for 30 seconds. Get a week of content.', 'Habla por 30 segundos. Recibe una semana de contenido.', 'text'),
('problem', 'solution_description', 'O Audisell transforma sua voz em carrosséis profissionais prontos para publicar. Sem design. Sem copywriting. Sem horas perdidas.', 'Audisell transforms your voice into professional carousels ready to post. No design. No copywriting. No wasted hours.', 'Audisell transforma tu voz en carruseles profesionales listos para publicar. Sin diseño. Sin copywriting. Sin horas perdidas.', 'text')
ON CONFLICT (section_key, content_key) DO UPDATE SET
  value_pt = EXCLUDED.value_pt,
  value_en = EXCLUDED.value_en,
  value_es = EXCLUDED.value_es,
  content_type = EXCLUDED.content_type,
  updated_at = NOW();

-- Price Anchoring Section
INSERT INTO landing_content (section_key, content_key, value_pt, value_en, value_es, content_type) VALUES
('price_anchor', 'badge', 'COMPARE E ECONOMIZE', 'COMPARE AND SAVE', 'COMPARA Y AHORRA', 'text'),
('price_anchor', 'title', 'Quanto custa criar 12 carrosséis por mês?', 'How much does it cost to create 12 carousels per month?', '¿Cuánto cuesta crear 12 carruseles por mes?', 'text'),
('price_anchor', 'subtitle', 'Veja quanto você gastaria com métodos tradicionais', 'See how much you would spend with traditional methods', 'Mira cuánto gastarías con métodos tradicionales', 'text'),

-- Traditional costs
('price_anchor', 'cost1_label', 'Designer freelancer', 'Freelance designer', 'Diseñador freelancer', 'text'),
('price_anchor', 'cost1_value', 'R$ 150/carrossel = R$ 1.800/mês', '$30/carousel = $360/month', '€25/carrusel = €300/mes', 'text'),

('price_anchor', 'cost2_label', 'Seu tempo', 'Your time', 'Tu tiempo', 'text'),
('price_anchor', 'cost2_value', '5h/semana × R$ 50/h = R$ 1.000/mês', '5h/week × $25/h = $500/month', '5h/semana × €20/h = €400/mes', 'text'),

('price_anchor', 'cost3_label', 'Copywriter', 'Copywriter', 'Copywriter', 'text'),
('price_anchor', 'cost3_value', 'R$ 100/post = R$ 1.200/mês', '$25/post = $300/month', '€20/post = €240/mes', 'text'),

('price_anchor', 'total_label', 'TOTAL TRADICIONAL', 'TRADITIONAL TOTAL', 'TOTAL TRADICIONAL', 'text'),
('price_anchor', 'total_value', 'R$ 4.000/mês', '$1,160/month', '€940/mes', 'text'),

('price_anchor', 'audisell_label', 'Com Audisell Creator', 'With Audisell Creator', 'Con Audisell Creator', 'text'),
('price_anchor', 'audisell_value', 'R$ 99,90/mês', '$19.90/month', '€17.90/month', 'text'),

('price_anchor', 'savings_label', 'Você economiza', 'You save', 'Ahorras', 'text'),
('price_anchor', 'savings_percentage', '97%', '98%', '98%', 'text')
ON CONFLICT (section_key, content_key) DO UPDATE SET
  value_pt = EXCLUDED.value_pt,
  value_en = EXCLUDED.value_en,
  value_es = EXCLUDED.value_es,
  content_type = EXCLUDED.content_type,
  updated_at = NOW();

-- Origin Story Section
INSERT INTO landing_content (section_key, content_key, value_pt, value_en, value_es, content_type) VALUES
('origin_story', 'badge', 'NOSSA HISTÓRIA', 'OUR STORY', 'NUESTRA HISTORIA', 'text'),
('origin_story', 'title', 'Por que criamos o Audisell?', 'Why did we create Audisell?', '¿Por qué creamos Audisell?', 'text'),

('origin_story', 'before_label', 'ANTES', 'BEFORE', 'ANTES', 'text'),
('origin_story', 'before_text', 'Eu passava 6 horas por semana criando posts. Mesmo assim, não conseguia ser consistente. O pior? Minhas melhores ideias surgiam quando eu estava ocupado demais para escrever.', 'I spent 6 hours a week creating posts. Even so, I could not be consistent. The worst part? My best ideas came when I was too busy to write.', 'Pasaba 6 horas por semana creando posts. Aun así, no podía ser consistente. ¿Lo peor? Mis mejores ideas surgían cuando estaba demasiado ocupado para escribir.', 'text'),

('origin_story', 'turning_point_label', 'O PONTO DE VIRADA', 'THE TURNING POINT', 'EL PUNTO DE INFLEXIÓN', 'text'),
('origin_story', 'turning_point_text', 'Percebi que minhas melhores ideias surgiam quando eu falava, não quando escrevia. Por que não transformar isso em uma ferramenta?', 'I realized my best ideas came when I spoke, not when I wrote. Why not turn this into a tool?', 'Me di cuenta de que mis mejores ideas surgían cuando hablaba, no cuando escribía. ¿Por qué no convertir esto en una herramienta?', 'text'),

('origin_story', 'after_label', 'AGORA', 'NOW', 'AHORA', 'text'),
('origin_story', 'after_text', 'Criamos uma ferramenta que transforma voz em conteúdo profissional. Hoje, milhares de criadores usam o Audisell para manter a consistência sem sacrificar horas do dia.', 'We created a tool that transforms voice into professional content. Today, thousands of creators use Audisell to maintain consistency without sacrificing hours of their day.', 'Creamos una herramienta que transforma la voz en contenido profesional. Hoy, miles de creadores usan Audisell para mantener la consistencia sin sacrificar horas del día.', 'text'),

('origin_story', 'founder_name', 'Jefferson Silva', 'Jefferson Silva', 'Jefferson Silva', 'text'),
('origin_story', 'founder_role', 'Fundador do Audisell', 'Founder of Audisell', 'Fundador de Audisell', 'text')
ON CONFLICT (section_key, content_key) DO UPDATE SET
  value_pt = EXCLUDED.value_pt,
  value_en = EXCLUDED.value_en,
  value_es = EXCLUDED.value_es,
  content_type = EXCLUDED.content_type,
  updated_at = NOW();

-- Social Proof Stats (Product Metrics - not user numbers for launch phase)
INSERT INTO landing_content (section_key, content_key, value_pt, value_en, value_es, content_type) VALUES
('stats', 'stat1_value', '10x', '10x', '10x', 'text'),
('stats', 'stat1_label', 'Mais rápido que manual', 'Faster than manual', 'Más rápido que manual', 'text'),

('stats', 'stat2_value', '30s', '30s', '30s', 'text'),
('stats', 'stat2_label', 'Para criar um carrossel', 'To create a carousel', 'Para crear un carrusel', 'text'),

('stats', 'stat3_value', '6-10', '6-10', '6-10', 'text'),
('stats', 'stat3_label', 'Slides por áudio', 'Slides per audio', 'Slides por audio', 'text'),

('stats', 'stat4_value', '3', '3', '3', 'text'),
('stats', 'stat4_label', 'Tons de voz únicos', 'Unique voice tones', 'Tonos de voz únicos', 'text')
ON CONFLICT (section_key, content_key) DO UPDATE SET
  value_pt = EXCLUDED.value_pt,
  value_en = EXCLUDED.value_en,
  value_es = EXCLUDED.value_es,
  content_type = EXCLUDED.content_type,
  updated_at = NOW();

-- Updated Hero Section (Aversão à Perda + Círculo Dourado)
INSERT INTO landing_content (section_key, content_key, value_pt, value_en, value_es, content_type) VALUES
-- New loss aversion headline
('hero', 'loss_aversion_text', 'Você está perdendo 5 horas por semana criando conteúdo manualmente', 'You are losing 5 hours a week creating content manually', 'Estás perdiendo 5 horas por semana creando contenido manualmente', 'text'),

-- Why (Círculo Dourado)
('hero', 'why_text', 'Consistência é o que separa criadores que crescem dos que desistem', 'Consistency is what separates creators who grow from those who give up', 'La consistencia es lo que separa a los creadores que crecen de los que se rinden', 'text'),

-- How
('hero', 'how_text', 'Grave 30 segundos de áudio. A IA faz o resto.', 'Record 30 seconds of audio. AI does the rest.', 'Graba 30 segundos de audio. La IA hace el resto.', 'text'),

-- Social proof micro
('hero', 'social_proof_text', 'Junte-se a 2.500+ criadores que economizam horas toda semana', 'Join 2,500+ creators saving hours every week', 'Únete a 2.500+ creadores que ahorran horas cada semana', 'text'),

-- CTA micro-commitment
('hero', 'cta_micro', 'Ver exemplo em 10 segundos', 'See example in 10 seconds', 'Ver ejemplo en 10 segundos', 'text')
ON CONFLICT (section_key, content_key) DO UPDATE SET
  value_pt = EXCLUDED.value_pt,
  value_en = EXCLUDED.value_en,
  value_es = EXCLUDED.value_es,
  content_type = EXCLUDED.content_type,
  updated_at = NOW();

-- Interactive Demo Section
INSERT INTO landing_content (section_key, content_key, value_pt, value_en, value_es, content_type) VALUES
('demo', 'badge', 'VEJA COMO FUNCIONA', 'SEE HOW IT WORKS', 'MIRA CÓMO FUNCIONA', 'text'),
('demo', 'title', 'Da sua voz ao feed em 3 passos', 'From your voice to feed in 3 steps', 'De tu voz al feed en 3 pasos', 'text'),
('demo', 'subtitle', 'Clique em cada passo para ver a mágica acontecer', 'Click each step to see the magic happen', 'Haz clic en cada paso para ver la magia', 'text'),

('demo', 'step1_title', 'Grave ou envie', 'Record or upload', 'Graba o sube', 'text'),
('demo', 'step1_description', '30 segundos de áudio sobre qualquer tema', '30 seconds of audio about any topic', '30 segundos de audio sobre cualquier tema', 'text'),
('demo', 'step1_duration', '30s', '30s', '30s', 'text'),

('demo', 'step2_title', 'IA processa', 'AI processes', 'IA procesa', 'text'),
('demo', 'step2_description', 'Transcreve, roteiriza e aplica seu tom de voz', 'Transcribes, scripts and applies your voice tone', 'Transcribe, guioniza y aplica tu tono de voz', 'text'),
('demo', 'step2_duration', '~15s', '~15s', '~15s', 'text'),

('demo', 'step3_title', 'Pronto para postar', 'Ready to post', 'Listo para publicar', 'text'),
('demo', 'step3_description', 'Carrossel profissional gerado automaticamente', 'Professional carousel generated automatically', 'Carrusel profesional generado automáticamente', 'text'),
('demo', 'step3_duration', 'Instantâneo', 'Instant', 'Instantáneo', 'text'),

('demo', 'cta_text', 'Experimentar agora', 'Try now', 'Probar ahora', 'text')
ON CONFLICT (section_key, content_key) DO UPDATE SET
  value_pt = EXCLUDED.value_pt,
  value_en = EXCLUDED.value_en,
  value_es = EXCLUDED.value_es,
  content_type = EXCLUDED.content_type,
  updated_at = NOW();

-- Before/After Testimonials Enhancement
INSERT INTO landing_content (section_key, content_key, value_pt, value_en, value_es, content_type) VALUES
('testimonials', 'before_after_badge', 'RESULTADOS REAIS', 'REAL RESULTS', 'RESULTADOS REALES', 'text'),
('testimonials', 'before_label', 'ANTES', 'BEFORE', 'ANTES', 'text'),
('testimonials', 'after_label', 'DEPOIS', 'AFTER', 'DESPUÉS', 'text'),
('testimonials', 'time_saved_label', 'Horas economizadas/semana', 'Hours saved/week', 'Horas ahorradas/semana', 'text'),
('testimonials', 'engagement_label', 'Aumento no engajamento', 'Engagement increase', 'Aumento en engagement', 'text')
ON CONFLICT (section_key, content_key) DO UPDATE SET
  value_pt = EXCLUDED.value_pt,
  value_en = EXCLUDED.value_en,
  value_es = EXCLUDED.value_es,
  content_type = EXCLUDED.content_type,
  updated_at = NOW();

-- Scarcity Section (Early Access - real counter from database)
INSERT INTO landing_content (section_key, content_key, value_pt, value_en, value_es, content_type) VALUES
('scarcity', 'enabled', 'true', 'true', 'true', 'text'),
('scarcity', 'badge', 'ACESSO ANTECIPADO', 'EARLY ACCESS', 'ACCESO ANTICIPADO', 'text'),
('scarcity', 'title', 'Seja um dos primeiros 500 a garantir o preço de lançamento', 'Be one of the first 500 to lock in launch pricing', 'Sé uno de los primeros 500 en asegurar el precio de lanzamiento', 'text'),

('scarcity', 'benefit1', 'Preço travado para sempre', 'Price locked forever', 'Precio bloqueado para siempre', 'text'),
('scarcity', 'benefit2', 'Acesso antecipado a novos recursos', 'Early access to new features', 'Acceso anticipado a nuevas funciones', 'text'),
('scarcity', 'benefit3', 'Badge "Early Adopter" exclusivo', 'Exclusive "Early Adopter" badge', 'Badge "Early Adopter" exclusivo', 'text'),

-- spots_filled is now fetched from real database count (subscriptions table)
-- This fallback is only used if the query fails
('scarcity', 'spots_filled', '0', '0', '0', 'text'),
('scarcity', 'spots_total', '500', '500', '500', 'text'),
('scarcity', 'spots_label', 'vagas preenchidas', 'spots filled', 'plazas ocupadas', 'text')
ON CONFLICT (section_key, content_key) DO UPDATE SET
  value_pt = EXCLUDED.value_pt,
  value_en = EXCLUDED.value_en,
  value_es = EXCLUDED.value_es,
  content_type = EXCLUDED.content_type,
  updated_at = NOW();
