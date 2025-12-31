// Plan configuration for Audisell
export type PlanTier = 'free' | 'starter' | 'creator';

// Stripe Price IDs - Atualize com os IDs do Stripe Dashboard
// Produtos criados:
// - Starter (prod_The3hLxkN18wxc): R$ 29,90/mês
// - Creator (prod_The3iuUmGhYz6u): R$ 99,90/mês
export const STRIPE_PRICE_IDS = {
  starter: 'price_REPLACE_WITH_STARTER_PRICE_ID', // Copie do Stripe Dashboard
  creator: 'price_REPLACE_WITH_CREATOR_PRICE_ID', // Copie do Stripe Dashboard
} as const;

export interface PlanConfig {
  id: PlanTier;
  name: string;
  description: string;
  price: number; // in BRL cents
  priceDisplay: string;
  priceId?: string; // Stripe price ID
  dailyLimit: number;
  monthlyLimit: number | null; // null = fair usage
  hasWatermark: boolean;
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
    priceId: STRIPE_PRICE_IDS.starter,
    dailyLimit: 1,
    monthlyLimit: 30,
    hasWatermark: false,
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
    limitations: [],
  },
  creator: {
    id: 'creator',
    name: 'Creator',
    description: 'Para criadores sérios',
    price: 9990, // R$ 99,90
    priceDisplay: 'R$ 99,90',
    priceId: STRIPE_PRICE_IDS.creator,
    dailyLimit: 8,
    monthlyLimit: null, // fair usage
    hasWatermark: false,
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
      'Templates premium',
      'Upload de imagens por slide',
      'Processamento prioritário',
    ],
    limitations: [],
  },
};

export const PLAN_ORDER: PlanTier[] = ['free', 'starter', 'creator'];

export function getPlanByPriceId(priceId: string): PlanTier | null {
  const priceIdMap: Record<string, PlanTier> = {
    [STRIPE_PRICE_IDS.starter]: 'starter',
    [STRIPE_PRICE_IDS.creator]: 'creator',
  };
  return priceIdMap[priceId] || null;
}

export function canAccessTemplate(planTier: PlanTier, template: 'solid' | 'gradient' | 'image_top'): boolean {
  return PLANS[planTier].templates.includes(template);
}

export function getDailyLimit(planTier: PlanTier): number {
  return PLANS[planTier].dailyLimit;
}
