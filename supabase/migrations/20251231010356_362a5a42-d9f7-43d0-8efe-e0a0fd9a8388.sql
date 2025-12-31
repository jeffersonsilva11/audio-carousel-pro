-- Create FAQs table for dynamic FAQ management
CREATE TABLE public.faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_pt TEXT NOT NULL,
  question_en TEXT,
  question_es TEXT,
  answer_pt TEXT NOT NULL,
  answer_en TEXT,
  answer_es TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- Public can read active FAQs
CREATE POLICY "Anyone can read active FAQs"
  ON public.faqs
  FOR SELECT
  USING (is_active = true);

-- Admins can manage all FAQs
CREATE POLICY "Admins can manage FAQs"
  ON public.faqs
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_faqs_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default FAQs
INSERT INTO public.faqs (question_pt, question_en, question_es, answer_pt, answer_en, answer_es, display_order) VALUES
('O que é o Audisell?', 'What is Audisell?', '¿Qué es Audisell?', 'O Audisell é uma plataforma que transforma áudios em carrosséis profissionais para redes sociais usando inteligência artificial.', 'Audisell is a platform that transforms audio into professional social media carousels using artificial intelligence.', 'Audisell es una plataforma que transforma audios en carruseles profesionales para redes sociales usando inteligencia artificial.', 1),
('Quanto tempo leva para gerar um carrossel?', 'How long does it take to generate a carousel?', '¿Cuánto tiempo toma generar un carrusel?', 'O processo completo leva de 30 segundos a 2 minutos, dependendo do tamanho do áudio.', 'The complete process takes 30 seconds to 2 minutes, depending on the audio length.', 'El proceso completo toma de 30 segundos a 2 minutos, dependiendo del tamaño del audio.', 2),
('Quais formatos de carrossel estão disponíveis?', 'What carousel formats are available?', '¿Qué formatos de carrusel están disponibles?', 'Oferecemos formato quadrado (1080x1080), vertical para feed (1080x1350) e formato Stories (1080x1920).', 'We offer square format (1080x1080), vertical feed (1080x1350), and Stories format (1080x1920).', 'Ofrecemos formato cuadrado (1080x1080), vertical para feed (1080x1350) y formato Stories (1080x1920).', 3),
('Posso editar os slides gerados?', 'Can I edit the generated slides?', '¿Puedo editar los slides generados?', 'Sim! No plano Starter e superiores você tem acesso ao editor para personalizar textos, cores e estilos.', 'Yes! On Starter plan and above you have access to the editor to customize texts, colors, and styles.', '¡Sí! En el plan Starter y superiores tienes acceso al editor para personalizar textos, colores y estilos.', 4),
('Qual o limite de áudio?', 'What is the audio limit?', '¿Cuál es el límite de audio?', 'O limite é de 60 segundos por áudio. Recomendamos áudios claros e objetivos para melhores resultados.', 'The limit is 60 seconds per audio. We recommend clear and concise audio for best results.', 'El límite es de 60 segundos por audio. Recomendamos audios claros y concisos para mejores resultados.', 5),
('Quais formas de pagamento são aceitas?', 'What payment methods are accepted?', '¿Qué formas de pago son aceptadas?', 'Aceitamos cartões de crédito e débito (Visa, Mastercard, Amex) através do Stripe.', 'We accept credit and debit cards (Visa, Mastercard, Amex) through Stripe.', 'Aceptamos tarjetas de crédito y débito (Visa, Mastercard, Amex) a través de Stripe.', 6),
('Posso cancelar a qualquer momento?', 'Can I cancel anytime?', '¿Puedo cancelar en cualquier momento?', 'Sim, você pode cancelar sua assinatura a qualquer momento sem multa. O acesso continua até o fim do período pago.', 'Yes, you can cancel your subscription anytime without penalty. Access continues until the end of the paid period.', 'Sí, puedes cancelar tu suscripción en cualquier momento sin penalización. El acceso continúa hasta el final del período pagado.', 7),
('Os carrosséis têm marca d''água?', 'Do carousels have watermarks?', '¿Los carruseles tienen marca de agua?', 'No plano gratuito sim. Planos pagos removem a marca d''água automaticamente.', 'On the free plan, yes. Paid plans remove the watermark automatically.', 'En el plan gratuito sí. Los planes pagos remueven la marca de agua automáticamente.', 8),
('Como funciona o plano gratuito?', 'How does the free plan work?', '¿Cómo funciona el plan gratuito?', 'O plano gratuito permite criar 1 carrossel por dia com marca d''água. Ideal para testar a plataforma.', 'The free plan allows creating 1 carousel per day with watermark. Ideal for testing the platform.', 'El plan gratuito permite crear 1 carrusel por día con marca de agua. Ideal para probar la plataforma.', 9);
