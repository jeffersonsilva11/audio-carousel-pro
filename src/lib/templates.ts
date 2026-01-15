// Template system types and configuration for Audio Carousel Pro
// Only available for Creator plan and above

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

// Cover template types - for the first slide
export type CoverTemplateType =
  | 'cover_solid_color'        // Solid color background with text (no image required)
  | 'cover_full_image'         // Full background image with text overlay
  | 'cover_split_images'       // Split layout with multiple images (grid)
  | 'cover_gradient_overlay';  // Gradient overlay on background image

// Content template types - for body slides
export type ContentTemplateType =
  | 'content_image_top'   // Image at top, text below
  | 'content_text_top'    // Text at top, image below
  | 'content_split'       // 50/50 split (image left, text right)
  | 'content_text_only';  // Text only, no image (default/free)

// Template category
export type TemplateCategory = 'cover' | 'content';

// ============================================================================
// TEMPLATE CONFIG INTERFACES
// ============================================================================

// Header style options
export type HeaderStyle = 'default' | 'minimal' | 'bold' | 'none';

// Footer style options
export type FooterStyle = 'default' | 'minimal' | 'none';

// Text alignment
export type TextAlignment = 'left' | 'center' | 'right';

// Image position for split layouts
export type ImagePosition = 'left' | 'right' | 'top' | 'bottom';

// Grid layout options for split images
export type GridLayout = '2x1' | '1x2' | '2x2' | '3x1';

// Base template configuration
export interface BaseTemplateConfig {
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  headerStyle: HeaderStyle;
  footerStyle: FooterStyle;
}

// Cover template specific configs
export interface CoverFullImageConfig extends BaseTemplateConfig {
  imageOpacity: number; // 0-1
  textShadow: boolean;
  textPosition: 'top' | 'center' | 'bottom';
}

export interface CoverSplitImagesConfig extends BaseTemplateConfig {
  gridLayout: GridLayout;
  imageBorderRadius: number;
  imageGap: number; // pixels
}

export interface CoverGradientOverlayConfig extends BaseTemplateConfig {
  gradientColors: [string, string]; // [start, end]
  gradientDirection: 'to top' | 'to bottom' | 'to left' | 'to right' | 'to bottom right';
  imageOpacity: number; // 0-1
}

// Content template specific configs
export interface ContentTextOnlyConfig extends BaseTemplateConfig {
  textAlignment: TextAlignment;
  contentPadding: number; // pixels
  showBulletPoints: boolean;
}

export interface ContentImageTopConfig extends BaseTemplateConfig {
  imageHeight: string; // e.g., "40%", "300px"
  imageBorderRadius: number;
  textAlignment: TextAlignment;
  contentPadding: number;
}

export interface ContentTextTopConfig extends BaseTemplateConfig {
  imageHeight: string;
  imageBorderRadius: number;
  textAlignment: TextAlignment;
  contentPadding: number;
}

export interface ContentSplitConfig extends BaseTemplateConfig {
  splitRatio: '50/50' | '40/60' | '60/40';
  imagePosition: 'left' | 'right';
  imageBorderRadius: number;
  textAlignment: TextAlignment;
  contentPadding: number;
}

// Union type for all template configs
export type TemplateConfig =
  | CoverFullImageConfig
  | CoverSplitImagesConfig
  | CoverGradientOverlayConfig
  | ContentTextOnlyConfig
  | ContentImageTopConfig
  | ContentTextTopConfig
  | ContentSplitConfig;

// ============================================================================
// TEMPLATE PRESET INTERFACE
// ============================================================================

export interface TemplatePreset {
  id: string;
  slug: string;
  name: string;
  category: TemplateCategory;
  coverType?: CoverTemplateType;
  contentType?: ContentTemplateType;
  namePt: string;
  nameEn?: string;
  nameEs?: string;
  descriptionPt?: string;
  descriptionEn?: string;
  descriptionEs?: string;
  config: TemplateConfig;
  previewImageUrl?: string;
  minPlanTier: 'free' | 'starter' | 'creator' | 'agency';
  isActive: boolean;
  isFeatured: boolean;
  displayOrder: number;
}

// ============================================================================
// USER TEMPLATE INTERFACE
// ============================================================================

export interface UserTemplate {
  id: string;
  userId: string;
  name: string;
  category: TemplateCategory;
  coverType?: CoverTemplateType;
  contentType?: ContentTemplateType;
  presetId?: string;
  config: TemplateConfig;
  previewImageUrl?: string;
  timesUsed: number;
  lastUsedAt?: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CAROUSEL SLIDE IMAGE INTERFACE
// ============================================================================

export type SlideImagePosition = 'main' | 'left' | 'right' | 'top' | 'bottom';

export interface CarouselSlideImage {
  id: string;
  carouselId: string;
  slideIndex: number;
  storagePath: string;
  originalFilename?: string;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  position: SlideImagePosition;
  createdAt: string;
}

// Simplified interface for in-memory slide image state
export interface SlideImage {
  slideIndex: number;
  storagePath: string | null;
  publicUrl: string | null;
  position: SlideImagePosition;
}

// ============================================================================
// TEMPLATE VALIDATION HELPERS
// ============================================================================

/**
 * Check if a template type is valid
 */
export function isValidCoverTemplate(value: string): value is CoverTemplateType {
  return value in COVER_TEMPLATES;
}

export function isValidContentTemplate(value: string): value is ContentTemplateType {
  return value in CONTENT_TEMPLATES;
}

/**
 * Count how many slides require images based on templates
 */
export function countSlidesRequiringImages(
  slideCount: number,
  coverTemplate: CoverTemplateType,
  contentTemplate: ContentTemplateType
): { total: number; coverNeeds: boolean; contentNeeds: boolean } {
  const coverNeeds = templateRequiresImage(coverTemplate);
  const contentNeeds = templateRequiresImage(contentTemplate);

  let total = 0;
  if (coverNeeds) total += 1;
  if (contentNeeds) total += slideCount - 1; // All content slides

  return { total, coverNeeds, contentNeeds };
}

/**
 * Validate that all required slide images are uploaded
 * @param slideCount - Total number of slides
 * @param coverTemplate - The selected cover template
 * @param contentTemplate - The selected content template
 * @param coverImages - Array of cover images (1-4 depending on template)
 * @param contentImages - Array of content slide images (SlideImage[])
 */
export function validateRequiredImages(
  slideCount: number,
  coverTemplate: CoverTemplateType,
  contentTemplate: ContentTemplateType,
  coverImages: (string | null)[],
  contentImages: SlideImage[]
): { isValid: boolean; missingSlides: number[] } {
  const missingSlides: number[] = [];

  // Check cover slide (index 0)
  if (templateRequiresImage(coverTemplate)) {
    const requiredCoverImages = getTemplateMaxImages(coverTemplate);

    // Check if we have all required cover images
    let hasCoverImages = true;
    for (let i = 0; i < requiredCoverImages; i++) {
      if (!coverImages[i]) {
        hasCoverImages = false;
        break;
      }
    }

    if (!hasCoverImages) {
      missingSlides.push(0); // 0 represents cover
    }
  }

  // Check content slides (index 1 to slideCount - 1)
  if (templateRequiresImage(contentTemplate)) {
    for (let i = 1; i < slideCount; i++) {
      const hasImage = contentImages.some(
        img => img.slideIndex === i && img.publicUrl
      );
      if (!hasImage) missingSlides.push(i);
    }
  }

  return {
    isValid: missingSlides.length === 0,
    missingSlides,
  };
}

// ============================================================================
// TEMPLATE SELECTION STATE
// ============================================================================

export interface TemplateSelection {
  coverTemplate: CoverTemplateType;
  contentTemplate: ContentTemplateType;
  coverPresetId?: string;
  contentPresetId?: string;
  customConfig?: Partial<TemplateConfig>;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

export const DEFAULT_COVER_CONFIG: CoverFullImageConfig = {
  backgroundColor: '#000000',
  textColor: '#FFFFFF',
  accentColor: '#FF6B00',
  fontFamily: 'Inter',
  headerStyle: 'default',
  footerStyle: 'default',
  imageOpacity: 0.7,
  textShadow: true,
  textPosition: 'center',
};

export const DEFAULT_CONTENT_CONFIG: ContentTextOnlyConfig = {
  backgroundColor: '#000000',
  textColor: '#FFFFFF',
  accentColor: '#FF6B00',
  fontFamily: 'Inter',
  headerStyle: 'default',
  footerStyle: 'default',
  textAlignment: 'left',
  contentPadding: 40,
  showBulletPoints: true,
};

export const DEFAULT_SPLIT_CONFIG: ContentSplitConfig = {
  backgroundColor: '#000000',
  textColor: '#FFFFFF',
  accentColor: '#FF6B00',
  fontFamily: 'Inter',
  headerStyle: 'minimal',
  footerStyle: 'minimal',
  splitRatio: '50/50',
  imagePosition: 'left',
  imageBorderRadius: 0,
  textAlignment: 'left',
  contentPadding: 24,
};

// ============================================================================
// TEMPLATE METADATA
// ============================================================================

export interface TemplateMetadata {
  id: CoverTemplateType | ContentTemplateType;
  category: TemplateCategory;
  namePt: string;
  nameEn: string;
  nameEs: string;
  descriptionPt: string;
  descriptionEn: string;
  descriptionEs: string;
  requiresImage: boolean;
  maxImages: number;
  minPlanTier: 'free' | 'starter' | 'creator' | 'agency';
}

export const COVER_TEMPLATES: Record<CoverTemplateType, TemplateMetadata> = {
  cover_solid_color: {
    id: 'cover_solid_color',
    category: 'cover',
    namePt: 'Cor Sólida',
    nameEn: 'Solid Color',
    nameEs: 'Color Sólido',
    descriptionPt: 'Fundo sólido com texto centralizado, sem imagem',
    descriptionEn: 'Solid background with centered text, no image',
    descriptionEs: 'Fondo sólido con texto centrado, sin imagen',
    requiresImage: false,
    maxImages: 0,
    minPlanTier: 'creator',
  },
  cover_full_image: {
    id: 'cover_full_image',
    category: 'cover',
    namePt: 'Imagem Completa',
    nameEn: 'Full Image',
    nameEs: 'Imagen Completa',
    descriptionPt: 'Imagem de fundo cobrindo todo o slide com texto sobreposto',
    descriptionEn: 'Full background image with overlaid text',
    descriptionEs: 'Imagen de fondo cubriendo toda la diapositiva con texto superpuesto',
    requiresImage: true,
    maxImages: 1,
    minPlanTier: 'creator',
  },
  cover_split_images: {
    id: 'cover_split_images',
    category: 'cover',
    namePt: 'Imagens Divididas',
    nameEn: 'Split Images',
    nameEs: 'Imágenes Divididas',
    descriptionPt: 'Layout com múltiplas imagens em grid',
    descriptionEn: 'Layout with multiple images in grid',
    descriptionEs: 'Diseño con múltiples imágenes en cuadrícula',
    requiresImage: true,
    maxImages: 4,
    minPlanTier: 'creator',
  },
  cover_gradient_overlay: {
    id: 'cover_gradient_overlay',
    category: 'cover',
    namePt: 'Gradiente Sobreposto',
    nameEn: 'Gradient Overlay',
    nameEs: 'Degradado Superpuesto',
    descriptionPt: 'Imagem com gradiente colorido sobreposto',
    descriptionEn: 'Image with colorful gradient overlay',
    descriptionEs: 'Imagen con degradado de color superpuesto',
    requiresImage: true,
    maxImages: 1,
    minPlanTier: 'creator',
  },
};

export const CONTENT_TEMPLATES: Record<ContentTemplateType, TemplateMetadata> = {
  content_text_only: {
    id: 'content_text_only',
    category: 'content',
    namePt: 'Apenas Texto',
    nameEn: 'Text Only',
    nameEs: 'Solo Texto',
    descriptionPt: 'Slide com fundo sólido ou gradiente, apenas texto',
    descriptionEn: 'Slide with solid or gradient background, text only',
    descriptionEs: 'Diapositiva con fondo sólido o degradado, solo texto',
    requiresImage: false,
    maxImages: 0,
    minPlanTier: 'free',
  },
  content_image_top: {
    id: 'content_image_top',
    category: 'content',
    namePt: 'Imagem no Topo',
    nameEn: 'Image Top',
    nameEs: 'Imagen Arriba',
    descriptionPt: 'Imagem na parte superior, texto abaixo',
    descriptionEn: 'Image at top, text below',
    descriptionEs: 'Imagen en la parte superior, texto debajo',
    requiresImage: true,
    maxImages: 1,
    minPlanTier: 'creator',
  },
  content_text_top: {
    id: 'content_text_top',
    category: 'content',
    namePt: 'Texto no Topo',
    nameEn: 'Text Top',
    nameEs: 'Texto Arriba',
    descriptionPt: 'Texto na parte superior, imagem abaixo',
    descriptionEn: 'Text at top, image below',
    descriptionEs: 'Texto en la parte superior, imagen debajo',
    requiresImage: true,
    maxImages: 1,
    minPlanTier: 'creator',
  },
  content_split: {
    id: 'content_split',
    category: 'content',
    namePt: 'Dividido 50/50',
    nameEn: 'Split 50/50',
    nameEs: 'Dividido 50/50',
    descriptionPt: 'Imagem à esquerda, texto à direita (50/50)',
    descriptionEn: 'Image on left, text on right (50/50)',
    descriptionEs: 'Imagen a la izquierda, texto a la derecha (50/50)',
    requiresImage: true,
    maxImages: 1,
    minPlanTier: 'creator',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a template type requires image upload
 */
export function templateRequiresImage(
  templateType: CoverTemplateType | ContentTemplateType
): boolean {
  if (templateType in COVER_TEMPLATES) {
    return COVER_TEMPLATES[templateType as CoverTemplateType].requiresImage;
  }
  if (templateType in CONTENT_TEMPLATES) {
    return CONTENT_TEMPLATES[templateType as ContentTemplateType].requiresImage;
  }
  return false;
}

/**
 * Get maximum images allowed for a template
 */
export function getTemplateMaxImages(
  templateType: CoverTemplateType | ContentTemplateType
): number {
  if (templateType in COVER_TEMPLATES) {
    return COVER_TEMPLATES[templateType as CoverTemplateType].maxImages;
  }
  if (templateType in CONTENT_TEMPLATES) {
    return CONTENT_TEMPLATES[templateType as ContentTemplateType].maxImages;
  }
  return 0;
}

/**
 * Check if user's plan can access a template
 */
export function canAccessTemplate(
  userPlanTier: 'free' | 'starter' | 'creator' | 'agency',
  templateType: CoverTemplateType | ContentTemplateType
): boolean {
  const planOrder = ['free', 'starter', 'creator', 'agency'];
  const userPlanIndex = planOrder.indexOf(userPlanTier);

  let minPlanTier: string;
  if (templateType in COVER_TEMPLATES) {
    minPlanTier = COVER_TEMPLATES[templateType as CoverTemplateType].minPlanTier;
  } else if (templateType in CONTENT_TEMPLATES) {
    minPlanTier = CONTENT_TEMPLATES[templateType as ContentTemplateType].minPlanTier;
  } else {
    return false;
  }

  const minPlanIndex = planOrder.indexOf(minPlanTier);
  return userPlanIndex >= minPlanIndex;
}

/**
 * Get template metadata by type
 */
export function getTemplateMetadata(
  templateType: CoverTemplateType | ContentTemplateType
): TemplateMetadata | null {
  if (templateType in COVER_TEMPLATES) {
    return COVER_TEMPLATES[templateType as CoverTemplateType];
  }
  if (templateType in CONTENT_TEMPLATES) {
    return CONTENT_TEMPLATES[templateType as ContentTemplateType];
  }
  return null;
}

/**
 * Get localized template name
 */
export function getTemplateName(
  templateType: CoverTemplateType | ContentTemplateType,
  language: 'pt' | 'en' | 'es' = 'pt'
): string {
  const metadata = getTemplateMetadata(templateType);
  if (!metadata) return templateType;
  switch (language) {
    case 'es':
      return metadata.nameEs;
    case 'en':
      return metadata.nameEn;
    default:
      return metadata.namePt;
  }
}

/**
 * Get localized template description
 */
export function getTemplateDescription(
  templateType: CoverTemplateType | ContentTemplateType,
  language: 'pt' | 'en' | 'es' = 'pt'
): string {
  const metadata = getTemplateMetadata(templateType);
  if (!metadata) return '';
  switch (language) {
    case 'es':
      return metadata.descriptionEs;
    case 'en':
      return metadata.descriptionEn;
    default:
      return metadata.descriptionPt;
  }
}

/**
 * Get all available templates for a plan tier
 */
export function getAvailableTemplates(planTier: 'free' | 'starter' | 'creator' | 'agency') {
  const coverTemplates = Object.values(COVER_TEMPLATES).filter(t =>
    canAccessTemplate(planTier, t.id as CoverTemplateType)
  );
  const contentTemplates = Object.values(CONTENT_TEMPLATES).filter(t =>
    canAccessTemplate(planTier, t.id as ContentTemplateType)
  );

  return {
    cover: coverTemplates,
    content: contentTemplates,
  };
}

/**
 * Merge custom config with default config
 */
export function mergeTemplateConfig<T extends TemplateConfig>(
  defaultConfig: T,
  customConfig?: Partial<T>
): T {
  if (!customConfig) return defaultConfig;
  return { ...defaultConfig, ...customConfig };
}
