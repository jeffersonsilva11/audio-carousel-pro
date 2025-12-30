import { SupportedLanguage } from "@/hooks/useLanguage";

// Audisell Brand Constants
export const BRAND = {
  name: 'Audisell',
  tagline: 'Transforme sua voz em carrosséis profissionais',
  description: 'Grave um áudio. A IA transcreve, roteiriza e gera carrosséis prontos para o Instagram em segundos.',
  url: 'https://audisell.com',
} as const;

// Avatar/Profile Position Options
export const AVATAR_POSITIONS = [
  { id: 'top-left', labelKey: 'topLeft' },
  { id: 'top-right', labelKey: 'topRight' },
  { id: 'bottom-left', labelKey: 'bottomLeft' },
  { id: 'bottom-right', labelKey: 'bottomRight' },
] as const;

export type AvatarPosition = typeof AVATAR_POSITIONS[number]['id'];

// Display Mode Options
export const DISPLAY_MODES = [
  { id: 'name_and_username', labelKey: 'nameAndUsername' },
  { id: 'username_only', labelKey: 'usernameOnly' },
] as const;

export type DisplayMode = typeof DISPLAY_MODES[number]['id'];

// Translations for positions and modes
export const POSITION_LABELS: Record<string, Record<SupportedLanguage, string>> = {
  topLeft: { "pt-BR": "Superior Esquerdo", en: "Top Left", es: "Superior Izquierdo" },
  topRight: { "pt-BR": "Superior Direito", en: "Top Right", es: "Superior Derecho" },
  bottomLeft: { "pt-BR": "Inferior Esquerdo", en: "Bottom Left", es: "Inferior Izquierdo" },
  bottomRight: { "pt-BR": "Inferior Direito", en: "Bottom Right", es: "Inferior Derecho" },
};

export const DISPLAY_MODE_LABELS: Record<string, Record<SupportedLanguage, string>> = {
  nameAndUsername: { "pt-BR": "Nome + @username", en: "Name + @username", es: "Nombre + @username" },
  usernameOnly: { "pt-BR": "Apenas @username", en: "Username only", es: "Solo @username" },
};

// Helper functions to get translated labels
export function getPositionLabel(labelKey: string, language: SupportedLanguage): string {
  return POSITION_LABELS[labelKey]?.[language] || POSITION_LABELS[labelKey]?.["pt-BR"] || labelKey;
}

export function getDisplayModeLabel(labelKey: string, language: SupportedLanguage): string {
  return DISPLAY_MODE_LABELS[labelKey]?.[language] || DISPLAY_MODE_LABELS[labelKey]?.["pt-BR"] || labelKey;
}

// Template Types
export const TEMPLATES = [
  {
    id: 'solid',
    nameKey: 'solidName',
    descriptionKey: 'solidDesc',
    requiredPlan: 'free' as const,
    hasImageGeneration: false,
  },
  {
    id: 'gradient',
    nameKey: 'gradientName',
    descriptionKey: 'gradientDesc',
    requiredPlan: 'creator' as const,
    hasImageGeneration: true,
  },
  {
    id: 'image_top',
    nameKey: 'imageTopName',
    descriptionKey: 'imageTopDesc',
    requiredPlan: 'creator' as const,
    hasImageGeneration: true,
  },
] as const;

export type TemplateId = typeof TEMPLATES[number]['id'];

export const TEMPLATE_LABELS: Record<string, Record<SupportedLanguage, string>> = {
  solidName: { "pt-BR": "Fundo Sólido", en: "Solid Background", es: "Fondo Sólido" },
  solidDesc: { "pt-BR": "Fundo preto ou branco com texto centralizado", en: "Black or white background with centered text", es: "Fondo negro o blanco con texto centrado" },
  gradientName: { "pt-BR": "Imagem + Gradiente", en: "Image + Gradient", es: "Imagen + Gradiente" },
  gradientDesc: { "pt-BR": "Imagem IA de fundo com overlay gradiente", en: "AI background image with gradient overlay", es: "Imagen IA de fondo con overlay gradiente" },
  imageTopName: { "pt-BR": "Imagem Topo / Texto Baixo", en: "Image Top / Text Bottom", es: "Imagen Arriba / Texto Abajo" },
  imageTopDesc: { "pt-BR": "Imagem IA no topo, texto na área inferior", en: "AI image on top, text in the lower area", es: "Imagen IA arriba, texto en el área inferior" },
};

export function getTemplateLabel(labelKey: string, language: SupportedLanguage): string {
  return TEMPLATE_LABELS[labelKey]?.[language] || TEMPLATE_LABELS[labelKey]?.["pt-BR"] || labelKey;
}

// Available Fonts for customization
export const AVAILABLE_FONTS = [
  { id: 'inter', name: 'Inter', family: 'Inter, system-ui, sans-serif' },
  { id: 'playfair', name: 'Playfair Display', family: 'Playfair Display, serif' },
  { id: 'roboto', name: 'Roboto', family: 'Roboto, sans-serif' },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat, sans-serif' },
  { id: 'oswald', name: 'Oswald', family: 'Oswald, sans-serif' },
  { id: 'lora', name: 'Lora', family: 'Lora, serif' },
  { id: 'bebas', name: 'Bebas Neue', family: 'Bebas Neue, sans-serif' },
  { id: 'poppins', name: 'Poppins', family: 'Poppins, sans-serif' },
] as const;

export type FontId = typeof AVAILABLE_FONTS[number]['id'];

// Gradient Presets
export const GRADIENT_PRESETS = [
  { id: 'none', name: 'Sem Gradiente', colors: null },
  { id: 'sunset', name: 'Pôr do Sol', colors: ['#ff6b6b', '#feca57', '#ff9ff3'] },
  { id: 'ocean', name: 'Oceano', colors: ['#667eea', '#764ba2', '#f093fb'] },
  { id: 'forest', name: 'Floresta', colors: ['#11998e', '#38ef7d'] },
  { id: 'night', name: 'Noite', colors: ['#232526', '#414345'] },
  { id: 'fire', name: 'Fogo', colors: ['#f12711', '#f5af19'] },
  { id: 'candy', name: 'Candy', colors: ['#a18cd1', '#fbc2eb'] },
  { id: 'custom', name: 'Personalizado', colors: null },
] as const;

export type GradientId = typeof GRADIENT_PRESETS[number]['id'];

// AI Text Modes
export const TEXT_MODES = [
  {
    id: 'compact',
    nameKey: 'compactName',
    descriptionKey: 'compactDesc',
    icon: 'Minimize2',
  },
  {
    id: 'creative',
    nameKey: 'creativeName',
    descriptionKey: 'creativeDesc',
    icon: 'Sparkles',
  },
  {
    id: 'single',
    nameKey: 'singleName',
    descriptionKey: 'singleDesc',
    icon: 'FileText',
  },
] as const;

export type TextModeId = typeof TEXT_MODES[number]['id'];

export const TEXT_MODE_LABELS: Record<string, Record<SupportedLanguage, string>> = {
  compactName: { "pt-BR": "Compacto", en: "Compact", es: "Compacto" },
  compactDesc: { "pt-BR": "Mantém o tom original. Apenas reduz, organiza e divide em slides.", en: "Keeps the original tone. Just reduces, organizes and splits into slides.", es: "Mantiene el tono original. Solo reduce, organiza y divide en slides." },
  creativeName: { "pt-BR": "Criativo", en: "Creative", es: "Creativo" },
  creativeDesc: { "pt-BR": "Ajusta tom, ritmo e impacto. Escolha entre emocional, profissional ou provocador.", en: "Adjusts tone, rhythm and impact. Choose between emotional, professional or provocative.", es: "Ajusta tono, ritmo e impacto. Elige entre emocional, profesional o provocador." },
  singleName: { "pt-BR": "Texto Único", en: "Single Text", es: "Texto Único" },
  singleDesc: { "pt-BR": "Gera uma única imagem com texto longo (estilo thread).", en: "Generates a single image with long text (thread style).", es: "Genera una única imagen con texto largo (estilo thread)." },
};

export function getTextModeLabel(labelKey: string, language: SupportedLanguage): string {
  return TEXT_MODE_LABELS[labelKey]?.[language] || TEXT_MODE_LABELS[labelKey]?.["pt-BR"] || labelKey;
}

// Slide Count Options
export const SLIDE_COUNT_OPTIONS = {
  auto: { id: 'auto', labelKey: 'autoLabel', descriptionKey: 'autoDesc' },
  manual: { id: 'manual', labelKey: 'manualLabel', descriptionKey: 'manualDesc' },
} as const;

export const SLIDE_COUNT_LABELS: Record<string, Record<SupportedLanguage, string>> = {
  autoLabel: { "pt-BR": "Automático", en: "Automatic", es: "Automático" },
  autoDesc: { "pt-BR": "IA decide o número ideal", en: "AI decides the ideal number", es: "IA decide el número ideal" },
  manualLabel: { "pt-BR": "Manual", en: "Manual", es: "Manual" },
  manualDesc: { "pt-BR": "Escolha de 3 a 10 slides", en: "Choose from 3 to 10 slides", es: "Elige de 3 a 10 slides" },
};

export function getSlideCountLabel(labelKey: string, language: SupportedLanguage): string {
  return SLIDE_COUNT_LABELS[labelKey]?.[language] || SLIDE_COUNT_LABELS[labelKey]?.["pt-BR"] || labelKey;
}

export type SlideCountMode = 'auto' | 'manual';
