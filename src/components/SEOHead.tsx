import { useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { BRAND } from '@/lib/constants';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalPath?: string;
  ogImage?: string;
  noindex?: boolean;
}

const SEO_CONTENT = {
  'pt-BR': {
    defaultTitle: `${BRAND.name} - Transforme Áudio em Carrosséis com IA`,
    defaultDescription: 'Grave um áudio de até 30 segundos. Nossa IA transcreve, roteiriza e gera carrosséis profissionais prontos para o Instagram em segundos.',
    keywords: 'carrossel instagram, criar carrossel, áudio instagram, ia conteúdo, gerador de carrossel, carrossel para redes sociais',
    ogTitle: `${BRAND.name} - Áudio para Instagram em Segundos`,
    twitterTitle: BRAND.name,
    twitterDescription: 'Transforme sua voz em carrosséis profissionais com IA.',
  },
  en: {
    defaultTitle: `${BRAND.name} - Transform Audio into Carousels with AI`,
    defaultDescription: 'Record an audio up to 30 seconds. Our AI transcribes, scripts, and generates professional Instagram-ready carousels in seconds.',
    keywords: 'instagram carousel, create carousel, audio to instagram, ai content, carousel generator, social media carousel',
    ogTitle: `${BRAND.name} - Audio to Instagram in Seconds`,
    twitterTitle: BRAND.name,
    twitterDescription: 'Transform your voice into professional carousels with AI.',
  },
  es: {
    defaultTitle: `${BRAND.name} - Transforma Audio en Carruseles con IA`,
    defaultDescription: 'Graba un audio de hasta 30 segundos. Nuestra IA transcribe, guioniza y genera carruseles profesionales listos para Instagram en segundos.',
    keywords: 'carrusel instagram, crear carrusel, audio instagram, ia contenido, generador de carrusel, carrusel para redes sociales',
    ogTitle: `${BRAND.name} - Audio para Instagram en Segundos`,
    twitterTitle: BRAND.name,
    twitterDescription: 'Transforma tu voz en carruseles profesionales con IA.',
  },
};

const SEOHead = ({
  title,
  description,
  keywords,
  canonicalPath = '',
  ogImage = '/og-image.png',
  noindex = false,
}: SEOHeadProps) => {
  const { language } = useLanguage();
  const content = SEO_CONTENT[language] || SEO_CONTENT['pt-BR'];

  const finalTitle = title || content.defaultTitle;
  const finalDescription = description || content.defaultDescription;
  const finalKeywords = keywords || content.keywords;
  const canonicalUrl = `${BRAND.url}${canonicalPath}`;

  useEffect(() => {
    // Update document title
    document.title = finalTitle;

    // Update or create meta tags
    const updateMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Standard meta tags
    updateMeta('description', finalDescription);
    updateMeta('keywords', finalKeywords);
    updateMeta('author', BRAND.name);
    if (noindex) {
      updateMeta('robots', 'noindex, nofollow');
    } else {
      updateMeta('robots', 'index, follow');
    }

    // Open Graph
    updateMeta('og:type', 'website', true);
    updateMeta('og:title', title || content.ogTitle, true);
    updateMeta('og:description', finalDescription, true);
    updateMeta('og:site_name', BRAND.name, true);
    updateMeta('og:url', canonicalUrl, true);
    updateMeta('og:image', ogImage.startsWith('http') ? ogImage : `${BRAND.url}${ogImage}`, true);
    updateMeta('og:locale', language === 'pt-BR' ? 'pt_BR' : language === 'es' ? 'es_ES' : 'en_US', true);

    // Twitter
    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:title', title || content.twitterTitle);
    updateMeta('twitter:description', content.twitterDescription);
    updateMeta('twitter:image', ogImage.startsWith('http') ? ogImage : `${BRAND.url}${ogImage}`);

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    // Alternate languages
    const alternateLanguages = [
      { lang: 'pt-BR', path: '' },
      { lang: 'en', path: '/en' },
      { lang: 'es', path: '/es' },
    ];

    alternateLanguages.forEach(({ lang, path }) => {
      let alternate = document.querySelector(`link[rel="alternate"][hreflang="${lang}"]`) as HTMLLinkElement;
      if (!alternate) {
        alternate = document.createElement('link');
        alternate.rel = 'alternate';
        alternate.hreflang = lang;
        document.head.appendChild(alternate);
      }
      alternate.href = `${BRAND.url}${path}${canonicalPath}`;
    });

    // x-default
    let xDefault = document.querySelector('link[rel="alternate"][hreflang="x-default"]') as HTMLLinkElement;
    if (!xDefault) {
      xDefault = document.createElement('link');
      xDefault.rel = 'alternate';
      xDefault.hreflang = 'x-default';
      document.head.appendChild(xDefault);
    }
    xDefault.href = canonicalUrl;

  }, [finalTitle, finalDescription, finalKeywords, canonicalUrl, ogImage, noindex, language, content, title]);

  return null;
};

export default SEOHead;
