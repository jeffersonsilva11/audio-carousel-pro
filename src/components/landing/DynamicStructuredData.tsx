import { useLanguage } from '@/hooks/useLanguage';
import { BRAND } from '@/lib/constants';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FAQItem {
  id: string;
  question_pt: string;
  question_en: string | null;
  question_es: string | null;
  answer_pt: string;
  answer_en: string | null;
  answer_es: string | null;
  display_order: number;
}

const STRUCTURED_DATA_CONTENT = {
  'pt-BR': {
    description: 'Plataforma SaaS que transforma áudio em carrosséis profissionais para Instagram usando IA. Grave um áudio de até 30 segundos e nossa inteligência artificial transcreve, roteiriza e gera imagens prontas para publicar.',
    websiteDescription: 'Transforme sua voz em carrosséis profissionais para Instagram',
    plans: {
      free: { name: 'Plano Grátis', description: '1 carrossel por dia com marca d\'água' },
      starter: { name: 'Plano Starter', description: '5 carrosséis por dia sem marca d\'água' },
      creator: { name: 'Plano Creator', description: '15 carrosséis por dia com editor premium' },
      agency: { name: 'Plano Agency', description: '50 carrosséis por dia com todas as funcionalidades' },
    },
    features: [
      'Transcrição de áudio com IA',
      'Roteirização automática em 3 tons de voz',
      'Geração de carrosséis em SVG/PNG/PDF',
      'Templates personalizáveis',
      'Multi-idioma (PT-BR, EN, ES)',
      'Integração com Instagram',
    ],
  },
  en: {
    description: 'SaaS platform that transforms audio into professional Instagram carousels using AI. Record an audio up to 30 seconds and our artificial intelligence transcribes, scripts, and generates images ready to publish.',
    websiteDescription: 'Transform your voice into professional Instagram carousels',
    plans: {
      free: { name: 'Free Plan', description: '1 carousel per day with watermark' },
      starter: { name: 'Starter Plan', description: '5 carousels per day without watermark' },
      creator: { name: 'Creator Plan', description: '15 carousels per day with premium editor' },
      agency: { name: 'Agency Plan', description: '50 carousels per day with all features' },
    },
    features: [
      'AI audio transcription',
      'Automatic scripting in 3 voice tones',
      'Carousel generation in SVG/PNG/PDF',
      'Customizable templates',
      'Multi-language (PT-BR, EN, ES)',
      'Instagram integration',
    ],
  },
  es: {
    description: 'Plataforma SaaS que transforma audio en carruseles profesionales para Instagram usando IA. Graba un audio de hasta 30 segundos y nuestra inteligencia artificial transcribe, guioniza y genera imágenes listas para publicar.',
    websiteDescription: 'Transforma tu voz en carruseles profesionales para Instagram',
    plans: {
      free: { name: 'Plan Gratis', description: '1 carrusel por día con marca de agua' },
      starter: { name: 'Plan Starter', description: '5 carruseles por día sin marca de agua' },
      creator: { name: 'Plan Creator', description: '15 carruseles por día con editor premium' },
      agency: { name: 'Plan Agency', description: '50 carruseles por día con todas las funcionalidades' },
    },
    features: [
      'Transcripción de audio con IA',
      'Guionización automática en 3 tonos de voz',
      'Generación de carruseles en SVG/PNG/PDF',
      'Plantillas personalizables',
      'Multi-idioma (PT-BR, EN, ES)',
      'Integración con Instagram',
    ],
  },
};

const DynamicStructuredData = () => {
  const { language } = useLanguage();
  const content = STRUCTURED_DATA_CONTENT[language] || STRUCTURED_DATA_CONTENT['pt-BR'];

  // Fetch FAQs from database
  const { data: faqs } = useQuery({
    queryKey: ['faqs-structured-data'],
    queryFn: async () => {
      const { data } = await supabase
        .from('faqs')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      return data || [];
    },
  });

  const getFAQText = (faq: FAQItem, type: 'question' | 'answer'): string => {
    const key = `${type}_${language === 'pt-BR' ? 'pt' : language}` as keyof FAQItem;
    const ptKey = `${type}_pt` as keyof FAQItem;
    return (faq[key] as string | null) || (faq[ptKey] as string);
  };

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': `${BRAND.url}/#software`,
        name: BRAND.name,
        description: content.description,
        applicationCategory: 'DesignApplication',
        operatingSystem: 'Web',
        url: BRAND.url,
        inLanguage: language,
        offers: [
          {
            '@type': 'Offer',
            name: content.plans.free.name,
            price: '0',
            priceCurrency: 'BRL',
            description: content.plans.free.description,
          },
          {
            '@type': 'Offer',
            name: content.plans.starter.name,
            price: '19.90',
            priceCurrency: 'BRL',
            priceValidUntil: '2025-12-31',
            description: content.plans.starter.description,
          },
          {
            '@type': 'Offer',
            name: content.plans.creator.name,
            price: '39.90',
            priceCurrency: 'BRL',
            priceValidUntil: '2025-12-31',
            description: content.plans.creator.description,
          },
          {
            '@type': 'Offer',
            name: content.plans.agency.name,
            price: '99.90',
            priceCurrency: 'BRL',
            priceValidUntil: '2025-12-31',
            description: content.plans.agency.description,
          },
        ],
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          bestRating: '5',
          worstRating: '1',
          ratingCount: '2500',
          reviewCount: '850',
        },
        featureList: content.features,
      },
      {
        '@type': 'Organization',
        '@id': `${BRAND.url}/#organization`,
        name: BRAND.name,
        url: BRAND.url,
        logo: {
          '@type': 'ImageObject',
          url: `${BRAND.url}/favicon.ico`,
        },
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer service',
          availableLanguage: ['Portuguese', 'English', 'Spanish'],
        },
        sameAs: [
          'https://instagram.com/audisell',
          'https://twitter.com/audisell',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${BRAND.url}/#website`,
        url: BRAND.url,
        name: BRAND.name,
        description: content.websiteDescription,
        publisher: {
          '@id': `${BRAND.url}/#organization`,
        },
        inLanguage: ['pt-BR', 'en', 'es'],
        potentialAction: {
          '@type': 'SearchAction',
          target: `${BRAND.url}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      ...(faqs && faqs.length > 0
        ? [
            {
              '@type': 'FAQPage',
              '@id': `${BRAND.url}/#faq`,
              mainEntity: faqs.map((faq) => ({
                '@type': 'Question',
                name: getFAQText(faq, 'question'),
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: getFAQText(faq, 'answer'),
                },
              })),
            },
          ]
        : []),
      {
        '@type': 'BreadcrumbList',
        '@id': `${BRAND.url}/#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: BRAND.url,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: language === 'en' ? 'Pricing' : language === 'es' ? 'Precios' : 'Preços',
            item: `${BRAND.url}/#pricing`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: 'FAQ',
            item: `${BRAND.url}/#faq`,
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
};

export default DynamicStructuredData;
