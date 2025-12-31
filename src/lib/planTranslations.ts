import { SupportedLanguage } from "@/hooks/useLanguage";
import { PlanTier } from "./plans";

// Plan names and descriptions with translations
export const planNames: Record<PlanTier, Record<SupportedLanguage, string>> = {
  free: {
    "pt-BR": "Gratuito",
    en: "Free",
    es: "Gratis",
  },
  starter: {
    "pt-BR": "Starter",
    en: "Starter",
    es: "Starter",
  },
  creator: {
    "pt-BR": "Creator",
    en: "Creator",
    es: "Creator",
  },
};

export const planDescriptions: Record<PlanTier, Record<SupportedLanguage, string>> = {
  free: {
    "pt-BR": "Experimente o Audisell",
    en: "Try Audisell",
    es: "Prueba Audisell",
  },
  starter: {
    "pt-BR": "Para criadores iniciantes",
    en: "For beginner creators",
    es: "Para creadores principiantes",
  },
  creator: {
    "pt-BR": "Para criadores sérios",
    en: "For serious creators",
    es: "Para creadores serios",
  },
};

// Feature translations by key
export const featureTranslations: Record<string, Record<SupportedLanguage, string>> = {
  // Free plan
  "1 carrossel por conta": {
    "pt-BR": "1 carrossel por conta",
    en: "1 carousel per account",
    es: "1 carrusel por cuenta",
  },
  "Todos os tons de voz": {
    "pt-BR": "Todos os tons de voz",
    en: "All voice tones",
    es: "Todos los tonos de voz",
  },
  "Template básico (fundo sólido)": {
    "pt-BR": "Template básico (fundo sólido)",
    en: "Basic template (solid background)",
    es: "Plantilla básica (fondo sólido)",
  },

  // Starter plan
  "1 carrossel por dia": {
    "pt-BR": "1 carrossel por dia",
    en: "1 carousel per day",
    es: "1 carrusel por día",
  },
  "Sem marca d'água": {
    "pt-BR": "Sem marca d'água",
    en: "No watermark",
    es: "Sin marca de agua",
  },
  "Editor visual": {
    "pt-BR": "Editor visual",
    en: "Visual editor",
    es: "Editor visual",
  },
  "Histórico completo": {
    "pt-BR": "Histórico completo",
    en: "Complete history",
    es: "Historial completo",
  },
  "Download em ZIP": {
    "pt-BR": "Download em ZIP",
    en: "ZIP download",
    es: "Descarga en ZIP",
  },
  "Template fundo sólido": {
    "pt-BR": "Template fundo sólido",
    en: "Solid background template",
    es: "Plantilla fondo sólido",
  },

  // Creator plan
  "Até 8 carrosséis por dia": {
    "pt-BR": "Até 8 carrosséis por dia",
    en: "Up to 8 carousels per day",
    es: "Hasta 8 carruseles por día",
  },
  "Uso ilimitado mensal (uso justo)": {
    "pt-BR": "Uso ilimitado mensal (uso justo)",
    en: "Unlimited monthly use (fair use)",
    es: "Uso ilimitado mensual (uso justo)",
  },
  "Editor visual completo": {
    "pt-BR": "Editor visual completo",
    en: "Full visual editor",
    es: "Editor visual completo",
  },
  "Customização de fontes": {
    "pt-BR": "Customização de fontes",
    en: "Font customization",
    es: "Personalización de fuentes",
  },
  "Templates com gradientes": {
    "pt-BR": "Templates com gradientes",
    en: "Gradient templates",
    es: "Plantillas con gradientes",
  },
  "Upload de imagens por slide": {
    "pt-BR": "Upload de imagens por slide",
    en: "Image upload per slide",
    es: "Subida de imágenes por slide",
  },
  "Processamento prioritário": {
    "pt-BR": "Processamento prioritário",
    en: "Priority processing",
    es: "Procesamiento prioritario",
  },

  // Agency plan
  "Até 20 carrosséis por dia": {
    "pt-BR": "Até 20 carrosséis por dia",
    en: "Up to 20 carousels per day",
    es: "Hasta 20 carruseles por día",
  },
  "Customização avançada": {
    "pt-BR": "Customização avançada",
    en: "Advanced customization",
    es: "Personalización avanzada",
  },
  "Todos os templates": {
    "pt-BR": "Todos os templates",
    en: "All templates",
    es: "Todas las plantillas",
  },
  "Suporte premium": {
    "pt-BR": "Suporte premium",
    en: "Premium support",
    es: "Soporte premium",
  },

  // Limitations
  "Com marca d'água": {
    "pt-BR": "Com marca d'água",
    en: "With watermark",
    es: "Con marca de agua",
  },
  "Sem histórico": {
    "pt-BR": "Sem histórico",
    en: "No history",
    es: "Sin historial",
  },
  "Sem editor visual": {
    "pt-BR": "Sem editor visual",
    en: "No visual editor",
    es: "Sin editor visual",
  },
  "Templates premium": {
    "pt-BR": "Templates premium",
    en: "Premium templates",
    es: "Plantillas premium",
  },
};

// Helper function to translate a feature/limitation
export function translateFeature(feature: string, language: SupportedLanguage): string {
  return featureTranslations[feature]?.[language] || feature;
}

// Helper function to get translated plan name
export function getPlanName(tier: PlanTier, language: SupportedLanguage): string {
  return planNames[tier][language];
}

// Helper function to get translated plan description
export function getPlanDescription(tier: PlanTier, language: SupportedLanguage): string {
  return planDescriptions[tier][language];
}
