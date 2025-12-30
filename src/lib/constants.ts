// Audisell Brand Constants
export const BRAND = {
  name: 'Audisell',
  tagline: 'Transforme sua voz em carrosséis profissionais',
  description: 'Grave um áudio. A IA transcreve, roteiriza e gera carrosséis prontos para o Instagram em segundos.',
  url: 'https://audisell.com',
} as const;

// Avatar/Profile Position Options
export const AVATAR_POSITIONS = [
  { id: 'top-left', label: 'Superior Esquerdo' },
  { id: 'top-right', label: 'Superior Direito' },
  { id: 'bottom-left', label: 'Inferior Esquerdo' },
  { id: 'bottom-right', label: 'Inferior Direito' },
] as const;

export type AvatarPosition = typeof AVATAR_POSITIONS[number]['id'];

// Display Mode Options
export const DISPLAY_MODES = [
  { id: 'name_and_username', label: 'Nome + @username' },
  { id: 'username_only', label: 'Apenas @username' },
] as const;

export type DisplayMode = typeof DISPLAY_MODES[number]['id'];

// Template Types
export const TEMPLATES = [
  {
    id: 'solid',
    name: 'Fundo Sólido',
    description: 'Fundo preto ou branco com texto centralizado',
    requiredPlan: 'free' as const,
    hasImageGeneration: false,
  },
  {
    id: 'gradient',
    name: 'Imagem + Gradiente',
    description: 'Imagem IA de fundo com overlay gradiente',
    requiredPlan: 'agency' as const,
    hasImageGeneration: true,
  },
  {
    id: 'image_top',
    name: 'Imagem Topo / Texto Baixo',
    description: 'Imagem IA no topo, texto na área inferior',
    requiredPlan: 'agency' as const,
    hasImageGeneration: true,
  },
] as const;

export type TemplateId = typeof TEMPLATES[number]['id'];

// AI Text Modes
export const TEXT_MODES = [
  {
    id: 'compact',
    name: 'Compacto',
    description: 'Mantém o tom original. Apenas reduz, organiza e divide em slides.',
    icon: 'Minimize2',
  },
  {
    id: 'creative',
    name: 'Criativo',
    description: 'Ajusta tom, ritmo e impacto. Escolha entre emocional, profissional ou provocador.',
    icon: 'Sparkles',
  },
  {
    id: 'single',
    name: 'Texto Único',
    description: 'Gera uma única imagem com texto longo (estilo thread).',
    icon: 'FileText',
  },
] as const;

export type TextModeId = typeof TEXT_MODES[number]['id'];

// Slide Count Options
export const SLIDE_COUNT_OPTIONS = {
  auto: { id: 'auto', label: 'Automático', description: 'IA decide o número ideal' },
  manual: { id: 'manual', label: 'Manual', description: 'Escolha de 3 a 10 slides' },
} as const;

export type SlideCountMode = 'auto' | 'manual';
