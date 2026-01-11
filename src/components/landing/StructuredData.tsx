import { BRAND } from "@/lib/constants";

const StructuredData = () => {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${BRAND.url}/#software`,
        "name": BRAND.name,
        "description": "Plataforma SaaS que transforma áudio em carrosséis profissionais para Instagram usando IA. Grave um áudio de até 30 segundos e nossa inteligência artificial transcreve, roteiriza e gera imagens prontas para publicar.",
        "applicationCategory": "DesignApplication",
        "operatingSystem": "Web",
        "url": BRAND.url,
        "offers": [
          {
            "@type": "Offer",
            "name": "Plano Grátis",
            "price": "0",
            "priceCurrency": "BRL",
            "description": "1 carrossel por dia com marca d'água"
          },
          {
            "@type": "Offer",
            "name": "Plano Starter",
            "price": "19.90",
            "priceCurrency": "BRL",
            "priceValidUntil": "2025-12-31",
            "description": "5 carrosséis por dia sem marca d'água"
          },
          {
            "@type": "Offer",
            "name": "Plano Creator",
            "price": "39.90",
            "priceCurrency": "BRL",
            "priceValidUntil": "2025-12-31",
            "description": "15 carrosséis por dia com editor premium"
          },
          {
            "@type": "Offer",
            "name": "Plano Agency",
            "price": "99.90",
            "priceCurrency": "BRL",
            "priceValidUntil": "2025-12-31",
            "description": "50 carrosséis por dia com todas as funcionalidades"
          }
        ],
        "featureList": [
          "Transcrição de áudio com IA",
          "Roteirização automática em 3 tons de voz",
          "Geração de carrosséis em SVG/PNG/PDF",
          "Templates personalizáveis",
          "Multi-idioma (PT-BR, EN, ES)",
          "Integração com Instagram"
        ]
      },
      {
        "@type": "Organization",
        "@id": `${BRAND.url}/#organization`,
        "name": BRAND.name,
        "url": BRAND.url,
        "logo": {
          "@type": "ImageObject",
          "url": `${BRAND.url}/favicon.ico`
        },
        "contactPoint": {
          "@type": "ContactPoint",
          "contactType": "customer service",
          "availableLanguage": ["Portuguese", "English", "Spanish"]
        }
      },
      {
        "@type": "WebSite",
        "@id": `${BRAND.url}/#website`,
        "url": BRAND.url,
        "name": BRAND.name,
        "description": "Transforme sua voz em carrosséis profissionais para Instagram",
        "publisher": {
          "@id": `${BRAND.url}/#organization`
        },
        "inLanguage": ["pt-BR", "en", "es"]
      },
      {
        "@type": "FAQPage",
        "@id": `${BRAND.url}/#faq`,
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Como funciona o Audisell?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Você grava ou envia um áudio de até 30 segundos. Nossa IA transcreve o conteúdo, roteiriza em slides e gera imagens profissionais prontas para postar no Instagram."
            }
          },
          {
            "@type": "Question",
            "name": "Posso testar gratuitamente?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sim! O plano gratuito permite criar 1 carrossel por dia com marca d'água. É perfeito para experimentar a plataforma."
            }
          },
          {
            "@type": "Question",
            "name": "Quais formatos de exportação estão disponíveis?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Você pode exportar seus carrosséis em SVG (vetorial), PNG (imagem) ou PDF. Também oferecemos formatos otimizados para Stories e Reels."
            }
          },
          {
            "@type": "Question",
            "name": "Posso personalizar os templates?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sim! Os planos Creator e Agency oferecem acesso a templates avançados, fontes personalizadas, gradientes e a possibilidade de adicionar sua identidade visual."
            }
          }
        ]
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
};

export default StructuredData;
