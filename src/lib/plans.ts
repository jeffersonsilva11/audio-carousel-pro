// Plan configuration for Audisell
export type PlanTier = 'free' | 'starter' | 'creator' | 'agency';

export interface PlanConfig {
  id: PlanTier;
  name: string;
  description: string;
  price: number; // in BRL cents
  priceDisplay: string;
  dailyLimit: number;
  monthlyLimit: number | null; // null = fair usage
  hasWatermark: boolean;
  hasImageGeneration: boolean;
  hasEditor: boolean;
  hasHistory: boolean;
  hasZipDownload: boolean;
  hasCustomFonts?: boolean;
  hasGradients?: boolean;
  hasSlideImages?: boolean;
  templates: ('solid' | 'gradient' | 'image_top')[];
  features: string[];
  limitations: string[];
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Gratuito',
    description: 'Experimente o Audisell',
    price: 0,
    priceDisplay: 'R$ 0',
    dailyLimit: 1,
    monthlyLimit: 1, // 1 total per account
    hasWatermark: true,
    hasImageGeneration: false,
    hasEditor: false,
    hasHistory: false,
    hasZipDownload: false,
    templates: ['solid'],
    features: [
      '1 carrossel por conta',
      'Todos os tons de voz',
      'Template básico (fundo sólido)',
    ],
    limitations: [
      'Com marca d\'água',
      'Sem histórico',
      'Sem editor visual',
    ],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Para criadores iniciantes',
    price: 2990, // R$ 29,90
    priceDisplay: 'R$ 29,90',
    dailyLimit: 1,
    monthlyLimit: 30,
    hasWatermark: false,
    hasImageGeneration: false,
    hasEditor: true,
    hasHistory: true,
    hasZipDownload: true,
    templates: ['solid'],
    features: [
      '1 carrossel por dia',
      'Sem marca d\'água',
      'Editor visual',
      'Histórico completo',
      'Download em ZIP',
      'Template fundo sólido',
    ],
    limitations: [
      'Sem geração de imagens',
    ],
  },
  creator: {
    id: 'creator',
    name: 'Creator',
    description: 'Para criadores sérios',
    price: 9990, // R$ 99,90
    priceDisplay: 'R$ 99,90',
    dailyLimit: 8,
    monthlyLimit: null, // fair usage
    hasWatermark: false,
    hasImageGeneration: false, // Disabled for now
    hasEditor: true,
    hasHistory: true,
    hasZipDownload: true,
    hasCustomFonts: true,
    hasGradients: true,
    hasSlideImages: true,
    templates: ['solid', 'gradient', 'image_top'],
    features: [
      'Até 8 carrosséis por dia',
      'Uso ilimitado mensal (uso justo)',
      'Sem marca d\'água',
      'Editor visual completo',
      'Customização de fontes',
      'Templates com gradientes',
      'Upload de imagens por slide',
      'Processamento prioritário',
    ],
    limitations: [],
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    description: 'Para agências e power users',
    price: 19990, // R$ 199,90
    priceDisplay: 'R$ 199,90',
    dailyLimit: 20,
    monthlyLimit: null, // fair usage
    hasWatermark: false,
    hasImageGeneration: false, // Disabled for now
    hasEditor: true,
    hasHistory: true,
    hasZipDownload: true,
    hasCustomFonts: true,
    hasGradients: true,
    hasSlideImages: true,
    templates: ['solid', 'gradient', 'image_top'],
    features: [
      'Até 20 carrosséis por dia',
      'Uso ilimitado mensal (uso justo)',
      'Sem marca d\'água',
      'Customização avançada',
      'Todos os templates',
      'Processamento prioritário',
      'Suporte premium',
    ],
    limitations: [],
  },
};

export const PLAN_ORDER: PlanTier[] = ['free', 'starter', 'creator', 'agency'];

export function getPlanByPriceId(priceId: string): PlanTier | null {
  // This will be populated with actual Stripe price IDs
  const priceIdMap: Record<string, PlanTier> = {};
  return priceIdMap[priceId] || null;
}

export function canAccessTemplate(planTier: PlanTier, template: 'solid' | 'gradient' | 'image_top'): boolean {
  return PLANS[planTier].templates.includes(template);
}

export function canGenerateImages(planTier: PlanTier): boolean {
  return PLANS[planTier].hasImageGeneration;
}

export function getDailyLimit(planTier: PlanTier): number {
  return PLANS[planTier].dailyLimit;
}
