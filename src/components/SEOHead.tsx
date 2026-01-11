import { useEffect, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { BRAND } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalPath?: string;
  ogImage?: string;
  noindex?: boolean;
}

interface LocalizedText {
  pt: string;
  en: string;
  es: string;
}

interface AdminSEOSettings {
  meta_title: LocalizedText;
  meta_description: LocalizedText;
  meta_keywords: LocalizedText;
  og_image: string;
  twitter_handle: string;
}

// Default fallback content
const DEFAULT_SEO_CONTENT = {
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
  const [adminSettings, setAdminSettings] = useState<AdminSEOSettings | null>(null);

  // Fetch admin SEO settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'seo_settings')
          .maybeSingle();

        if (data?.value) {
          const parsed = JSON.parse(data.value);
          setAdminSettings(parsed);
        }
      } catch (error) {
        console.error('Error fetching SEO settings:', error);
      }
    };

    fetchSettings();
  }, []);

  // Get language key for admin settings (pt-BR -> pt, etc.)
  const langKey = language === 'pt-BR' ? 'pt' : language as 'en' | 'es';

  // Use admin settings if available, otherwise fallback to defaults
  const defaultContent = DEFAULT_SEO_CONTENT[language] || DEFAULT_SEO_CONTENT['pt-BR'];

  const getAdminValue = (field: keyof LocalizedText, fallback: string) => {
    if (adminSettings && adminSettings[`meta_${field}` as keyof AdminSEOSettings]) {
      const value = (adminSettings[`meta_${field}` as keyof AdminSEOSettings] as LocalizedText)?.[langKey];
      return value || fallback;
    }
    return fallback;
  };

  const finalTitle = title || (adminSettings?.meta_title?.[langKey]) || defaultContent.defaultTitle;
  const finalDescription = description || (adminSettings?.meta_description?.[langKey]) || defaultContent.defaultDescription;
  const finalKeywords = keywords || (adminSettings?.meta_keywords?.[langKey]) || defaultContent.keywords;
  const finalOgImage = adminSettings?.og_image || ogImage;
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
    updateMeta('og:title', title || defaultContent.ogTitle, true);
    updateMeta('og:description', finalDescription, true);
    updateMeta('og:site_name', BRAND.name, true);
    updateMeta('og:url', canonicalUrl, true);
    updateMeta('og:image', finalOgImage.startsWith('http') ? finalOgImage : `${BRAND.url}${finalOgImage}`, true);
    updateMeta('og:locale', language === 'pt-BR' ? 'pt_BR' : language === 'es' ? 'es_ES' : 'en_US', true);

    // Twitter
    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:title', title || defaultContent.twitterTitle);
    updateMeta('twitter:description', defaultContent.twitterDescription);
    updateMeta('twitter:image', finalOgImage.startsWith('http') ? finalOgImage : `${BRAND.url}${finalOgImage}`);

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

  }, [finalTitle, finalDescription, finalKeywords, canonicalUrl, finalOgImage, noindex, language, defaultContent, title, adminSettings]);

  return null;
};

export default SEOHead;
