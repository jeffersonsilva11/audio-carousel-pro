import { useState, useRef } from "react";
import {
  Image,
  Palette,
  Layout,
  Upload,
  X,
  Loader2,
  Info,
  Check,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/useLanguage";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LockedFeature } from "@/components/ui/locked-feature";
import {
  GRADIENT_PRESETS,
  GRADIENT_CATEGORY_LABELS,
  GradientId,
  GradientCategory,
  FILE_LIMITS,
  DEFAULT_GRADIENT_COLORS,
} from "@/lib/constants";
import {
  CoverTemplateType,
  COVER_TEMPLATES,
  canAccessTemplate,
  getTemplateName,
} from "@/lib/templates";
import { PlanTier } from "@/lib/plans";

interface CoverCustomizationProps {
  // Template
  selectedCoverTemplate: CoverTemplateType;
  onCoverTemplateChange: (template: CoverTemplateType) => void;
  // Gradient
  gradientId: GradientId;
  customGradientColors?: string[];
  onGradientChange: (gradientId: GradientId, customColors?: string[]) => void;
  // Cover images (1-4 depending on template)
  coverImages: (string | null)[];
  onCoverImagesChange: (images: (string | null)[]) => void;
  // Access
  isCreator: boolean;
  userId?: string;
}

const GRADIENT_CATEGORIES: GradientCategory[] = ['warm', 'cool', 'nature', 'dark', 'pastel', 'bold'];

const CoverCustomization = ({
  selectedCoverTemplate,
  onCoverTemplateChange,
  gradientId,
  customGradientColors,
  onGradientChange,
  coverImages,
  onCoverImagesChange,
  isCreator,
  userId,
}: CoverCustomizationProps) => {
  const { language } = useLanguage();
  const { plan } = useSubscription();
  const { toast } = useToast();
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [customColor1, setCustomColor1] = useState(customGradientColors?.[0] || DEFAULT_GRADIENT_COLORS.START);
  const [customColor2, setCustomColor2] = useState(customGradientColors?.[1] || DEFAULT_GRADIENT_COLORS.END);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [activeGradientCategory, setActiveGradientCategory] = useState<GradientCategory | 'basic'>('basic');
  const [activeTab, setActiveTab] = useState<"template" | "background">("template");

  // Get number of images required for selected template
  const getRequiredImageCount = (): number => {
    switch (selectedCoverTemplate) {
      case 'cover_split_images':
        return 4;
      case 'cover_full_image':
      case 'cover_gradient_overlay':
        return 1;
      case 'cover_solid_color':
      default:
        return 0;
    }
  };

  // Check if template requires images
  const templateRequiresCoverImage = selectedCoverTemplate !== 'cover_solid_color';

  // Check if template supports gradient (only solid_color and gradient_overlay)
  const templateSupportsGradient =
    selectedCoverTemplate === 'cover_solid_color' ||
    selectedCoverTemplate === 'cover_gradient_overlay';

  const requiredImageCount = getRequiredImageCount();

  const langKey = language === "pt-BR" ? "pt" : language === "es" ? "es" : "en";

  // Translations
  const translations = {
    pt: {
      title: "Personalização da Capa",
      subtitle: "Configure o visual do primeiro slide do seu carrossel",
      templateTab: "Layout",
      backgroundTab: "Fundo",
      templateDescription: "Escolha como os elementos serão organizados na capa",
      requiresImage: "Requer imagem",
      requiresImages: "Requer 4 imagens",
      noImageRequired: "Sem imagem",
      imageSubtab: "Imagem",
      imagesSubtab: "Imagens",
      gradientSubtab: "Gradiente",
      imageDescription: "Adicione uma imagem de fundo para a capa",
      imagesDescription: "Adicione 4 imagens para o grid da capa",
      gradientDescription: "Escolha um gradiente para o fundo da capa",
      uploadImage: "Clique para adicionar",
      recommendedSize: "Tamanho recomendado:",
      sizeDetails: "1080x1080px (Feed), 1080x1350px (Retrato), ou 1080x1920px (Stories)",
      imagePriority: "A imagem de capa tem prioridade sobre o gradiente. Se você enviar uma imagem, ela será usada no lugar do gradiente.",
      imageUploaded: "Você já enviou uma imagem de capa. O gradiente não será aplicado enquanto houver uma imagem. Remova a imagem para usar o gradiente.",
      colorStart: "Cor inicial",
      colorEnd: "Cor final",
      uploadComplete: "Upload concluído",
      coverImageUploaded: "Imagem de capa enviada.",
      uploadError: "Erro no upload",
      couldNotUpload: "Não foi possível enviar a imagem.",
      invalidFile: "Arquivo inválido",
      pleaseUploadImage: "Por favor, envie uma imagem.",
      fileTooLarge: "Arquivo muito grande",
      maxSize: "Máximo 5MB por imagem.",
      noBackgroundNeeded: "Este layout não requer configuração de fundo. O fundo será a cor do estilo selecionado (preto ou branco).",
      gridImagePosition: ["Superior Esq.", "Superior Dir.", "Inferior Esq.", "Inferior Dir."],
      lockedFeatures: [
        "3 templates de capa",
        "Upload de imagem de capa",
        "40+ gradientes premium",
        "Cores personalizadas",
      ],
    },
    en: {
      title: "Cover Customization",
      subtitle: "Configure the visual of your carousel's first slide",
      templateTab: "Layout",
      backgroundTab: "Background",
      templateDescription: "Choose how elements are organized on the cover",
      requiresImage: "Requires image",
      requiresImages: "Requires 4 images",
      noImageRequired: "No image",
      imageSubtab: "Image",
      imagesSubtab: "Images",
      gradientSubtab: "Gradient",
      imageDescription: "Add a background image for the cover",
      imagesDescription: "Add 4 images for the cover grid",
      gradientDescription: "Choose a gradient for the cover background",
      uploadImage: "Click to add",
      recommendedSize: "Recommended size:",
      sizeDetails: "1080x1080px (Feed), 1080x1350px (Portrait), or 1080x1920px (Stories)",
      imagePriority: "The cover image takes priority over the gradient. If you upload an image, it will be used instead of the gradient.",
      imageUploaded: "You already uploaded a cover image. The gradient will not be applied while there's an image. Remove the image to use the gradient.",
      colorStart: "Start color",
      colorEnd: "End color",
      uploadComplete: "Upload complete",
      coverImageUploaded: "Cover image uploaded.",
      uploadError: "Upload error",
      couldNotUpload: "Could not upload image.",
      invalidFile: "Invalid file",
      pleaseUploadImage: "Please upload an image.",
      fileTooLarge: "File too large",
      maxSize: "Maximum 5MB per image.",
      noBackgroundNeeded: "This layout doesn't require background configuration. The background will be the selected style color (black or white).",
      gridImagePosition: ["Top Left", "Top Right", "Bottom Left", "Bottom Right"],
      lockedFeatures: [
        "3 cover templates",
        "Cover image upload",
        "40+ premium gradients",
        "Custom colors",
      ],
    },
    es: {
      title: "Personalización de Portada",
      subtitle: "Configura el visual de la primera diapositiva de tu carrusel",
      templateTab: "Diseño",
      backgroundTab: "Fondo",
      templateDescription: "Elige cómo se organizan los elementos en la portada",
      requiresImage: "Requiere imagen",
      requiresImages: "Requiere 4 imágenes",
      noImageRequired: "Sin imagen",
      imageSubtab: "Imagen",
      imagesSubtab: "Imágenes",
      gradientSubtab: "Gradiente",
      imageDescription: "Agrega una imagen de fondo para la portada",
      imagesDescription: "Agrega 4 imágenes para la cuadrícula de la portada",
      gradientDescription: "Elige un gradiente para el fondo de la portada",
      uploadImage: "Clic para agregar",
      recommendedSize: "Tamaño recomendado:",
      sizeDetails: "1080x1080px (Feed), 1080x1350px (Retrato), o 1080x1920px (Stories)",
      imagePriority: "La imagen de portada tiene prioridad sobre el gradiente. Si subes una imagen, se usará en lugar del gradiente.",
      imageUploaded: "Ya has subido una imagen de portada. El gradiente no se aplicará mientras haya una imagen. Elimina la imagen para usar el gradiente.",
      colorStart: "Color inicial",
      colorEnd: "Color final",
      uploadComplete: "Subida completa",
      coverImageUploaded: "Imagen de portada subida.",
      uploadError: "Error de subida",
      couldNotUpload: "No se pudo subir la imagen.",
      invalidFile: "Archivo inválido",
      pleaseUploadImage: "Por favor, sube una imagen.",
      fileTooLarge: "Archivo muy grande",
      maxSize: "Máximo 5MB por imagen.",
      noBackgroundNeeded: "Este diseño no requiere configuración de fondo. El fondo será el color del estilo seleccionado (negro o blanco).",
      gridImagePosition: ["Sup. Izq.", "Sup. Der.", "Inf. Izq.", "Inf. Der."],
      lockedFeatures: [
        "3 plantillas de portada",
        "Subida de imagen de portada",
        "40+ gradientes premium",
        "Colores personalizados",
      ],
    },
  };

  const t = translations[langKey as keyof typeof translations];

  // Show locked state for non-Creator users
  if (!isCreator) {
    return (
      <LockedFeature
        requiredPlan="creator"
        title={t.title}
        description={t.subtitle}
        icon={Layout}
        features={t.lockedFeatures}
        hasAccess={false}
      />
    );
  }

  const handleGradientChange = (newGradientId: GradientId) => {
    if (newGradientId === 'custom') {
      onGradientChange(newGradientId, [customColor1, customColor2]);
    } else {
      onGradientChange(newGradientId, undefined);
    }
  };

  const handleCustomColorChange = (index: 0 | 1, color: string) => {
    if (index === 0) {
      setCustomColor1(color);
    } else {
      setCustomColor2(color);
    }
    if (gradientId === 'custom') {
      const newColors = [index === 0 ? color : customColor1, index === 1 ? color : customColor2];
      onGradientChange('custom', newColors);
    }
  };

  const handleImageUpload = async (index: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: t.invalidFile,
        description: t.pleaseUploadImage,
        variant: "destructive",
      });
      return;
    }
    if (file.size > FILE_LIMITS.MAX_IMAGE_SIZE) {
      toast({
        title: t.fileTooLarge,
        description: t.maxSize,
        variant: "destructive",
      });
      return;
    }

    if (!userId) {
      toast({
        title: "Error",
        description: "User not authenticated.",
        variant: "destructive",
      });
      return;
    }

    setUploadingIndex(index);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-cover-${index}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('slide-images')
        .upload(fileName, file, {
          cacheControl: FILE_LIMITS.CACHE_CONTROL_TTL,
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('slide-images')
        .getPublicUrl(data.path);

      // Update coverImages array
      const newCoverImages = [...coverImages];
      while (newCoverImages.length <= index) {
        newCoverImages.push(null);
      }
      newCoverImages[index] = urlData.publicUrl;
      onCoverImagesChange(newCoverImages);

      toast({
        title: t.uploadComplete,
        description: t.coverImageUploaded,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: t.uploadError,
        description: t.couldNotUpload,
        variant: "destructive",
      });
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleRemoveImage = async (index: number) => {
    const imageUrl = coverImages[index];
    if (imageUrl && imageUrl.includes('slide-images') && userId) {
      try {
        const path = imageUrl.split('slide-images/')[1];
        if (path) {
          await supabase.storage.from('slide-images').remove([path]);
        }
      } catch (error) {
        console.error("Error deleting image:", error);
      }
    }
    const newCoverImages = [...coverImages];
    newCoverImages[index] = null;
    onCoverImagesChange(newCoverImages);
  };

  const getGradientStyle = (colors: readonly string[] | null) => {
    if (!colors || colors.length < 2) return 'transparent';
    return `linear-gradient(135deg, ${colors.join(', ')})`;
  };

  const getFilteredGradients = () => {
    if (activeGradientCategory === 'basic') {
      return GRADIENT_PRESETS.filter(g => g.category === 'basic');
    }
    return GRADIENT_PRESETS.filter(g => g.category === activeGradientCategory);
  };

  // Check if any cover image is present
  const hasAnyImage = coverImages.some(img => img !== null);

  // Count uploaded images
  const uploadedImageCount = coverImages.filter(img => img !== null).length;

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-accent/5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Layout className="w-4 h-4 text-accent" />
          <h3 className="font-semibold">{t.title}</h3>
          <Badge variant="secondary" className="text-[10px] ml-auto bg-accent/20 text-accent">
            Creator+
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
      </div>

      {/* Main Tabs: Template & Background */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "template" | "background")} className="p-4">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="template" className="gap-1.5">
            <Layout className="w-4 h-4" />
            <span>{t.templateTab}</span>
          </TabsTrigger>
          <TabsTrigger value="background" className="gap-1.5">
            <Palette className="w-4 h-4" />
            <span>{t.backgroundTab}</span>
            {hasAnyImage && <span className="w-2 h-2 rounded-full bg-green-500" />}
          </TabsTrigger>
        </TabsList>

        {/* Template Tab */}
        <TabsContent value="template" className="space-y-4">
          <p className="text-sm text-muted-foreground">{t.templateDescription}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(COVER_TEMPLATES).map(([id, meta]) => {
              const templateId = id as CoverTemplateType;
              const isSelected = selectedCoverTemplate === templateId;
              const hasAccess = canAccessTemplate(plan as PlanTier, templateId);

              return (
                <button
                  key={templateId}
                  onClick={() => hasAccess && onCoverTemplateChange(templateId)}
                  disabled={!hasAccess}
                  className={cn(
                    "relative flex flex-col rounded-lg border-2 transition-all overflow-hidden",
                    isSelected
                      ? "border-accent ring-2 ring-accent/20"
                      : hasAccess
                      ? "border-border hover:border-accent/50"
                      : "border-border/50 opacity-60 cursor-not-allowed"
                  )}
                >
                  {/* Preview thumbnail */}
                  <div className="aspect-square bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                    <CoverTemplatePreview type={templateId} />
                  </div>

                  {/* Template info */}
                  <div className="p-3 border-t bg-background">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-left min-w-0">
                        <p className="font-medium text-sm truncate">
                          {getTemplateName(templateId, langKey)}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {meta.requiresImage
                            ? (meta.maxImages > 1 ? t.requiresImages : t.requiresImage)
                            : t.noImageRequired}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-accent-foreground" />
                        </div>
                      )}
                      {!hasAccess && (
                        <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </TabsContent>

        {/* Background Tab */}
        <TabsContent value="background" className="space-y-4">
          {/* Content varies based on selected template */}

          {/* SOLID COLOR: Show only gradient picker */}
          {selectedCoverTemplate === 'cover_solid_color' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t.gradientDescription}</p>

              {/* Category Tabs */}
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setActiveGradientCategory('basic')}
                  className={cn(
                    "px-2 py-1 text-xs rounded-md transition-colors",
                    activeGradientCategory === 'basic'
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {GRADIENT_CATEGORY_LABELS.basic[language]}
                </button>
                {GRADIENT_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveGradientCategory(cat)}
                    className={cn(
                      "px-2 py-1 text-xs rounded-md transition-colors",
                      activeGradientCategory === cat
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    {GRADIENT_CATEGORY_LABELS[cat][language]}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {getFilteredGradients().map((gradient) => (
                  <button
                    key={gradient.id}
                    onClick={() => handleGradientChange(gradient.id)}
                    className={cn(
                      "p-2 rounded-lg border-2 transition-all",
                      gradientId === gradient.id
                        ? "border-accent"
                        : "border-border hover:border-accent/50"
                    )}
                  >
                    <div
                      className="w-full h-10 rounded-md mb-1"
                      style={{
                        background: gradient.colors
                          ? getGradientStyle(gradient.colors)
                          : gradient.id === 'custom'
                            ? getGradientStyle([customColor1, customColor2])
                            : 'transparent',
                        border: gradient.id === 'none' ? '2px dashed hsl(var(--border))' : 'none',
                      }}
                    />
                    <span className="text-[10px] font-medium truncate block">{gradient.name}</span>
                  </button>
                ))}
              </div>

              {/* Custom gradient color pickers */}
              {gradientId === 'custom' && (
                <div className="flex gap-4 pt-2">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">{t.colorStart}</Label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={customColor1}
                        onChange={(e) => handleCustomColorChange(0, e.target.value)}
                        className="w-10 h-10 rounded border-0 cursor-pointer"
                      />
                      <Input
                        value={customColor1}
                        onChange={(e) => handleCustomColorChange(0, e.target.value)}
                        className="flex-1 font-mono text-sm"
                        maxLength={7}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">{t.colorEnd}</Label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={customColor2}
                        onChange={(e) => handleCustomColorChange(1, e.target.value)}
                        className="w-10 h-10 rounded border-0 cursor-pointer"
                      />
                      <Input
                        value={customColor2}
                        onChange={(e) => handleCustomColorChange(1, e.target.value)}
                        className="flex-1 font-mono text-sm"
                        maxLength={7}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FULL IMAGE: Show only 1 image upload */}
          {selectedCoverTemplate === 'cover_full_image' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t.imageDescription}</p>

              <div className="flex justify-center">
                <div className="relative w-48">
                  <div
                    className={cn(
                      "aspect-square rounded-lg border-2 border-dashed overflow-hidden transition-all",
                      coverImages[0] ? "border-accent" : "border-border hover:border-accent/50",
                      uploadingIndex === 0 && "opacity-50"
                    )}
                  >
                    {uploadingIndex === 0 ? (
                      <div className="w-full h-full flex items-center justify-center bg-muted/50">
                        <Loader2 className="w-6 h-6 animate-spin text-accent" />
                      </div>
                    ) : coverImages[0] ? (
                      <img
                        src={coverImages[0]}
                        alt="Cover"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <button
                        onClick={() => fileInputRefs.current[0]?.click()}
                        className="w-full h-full flex flex-col items-center justify-center gap-2 hover:bg-accent/5 transition-colors"
                      >
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground text-center px-2">
                          {t.uploadImage}
                        </span>
                      </button>
                    )}
                  </div>

                  {coverImages[0] && uploadingIndex !== 0 && (
                    <button
                      onClick={() => handleRemoveImage(0)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  <input
                    ref={el => fileInputRefs.current[0] = el}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(0, file);
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>

              <p className="text-xs text-center px-4 py-2 bg-accent/10 rounded-lg text-accent">
                <strong>{t.recommendedSize}</strong> {t.sizeDetails}
              </p>
            </div>
          )}

          {/* SPLIT IMAGES: Show 4 image uploads in grid */}
          {selectedCoverTemplate === 'cover_split_images' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t.imagesDescription}</p>

              <div className="grid grid-cols-2 gap-3 max-w-[320px] mx-auto">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="relative">
                    <div
                      className={cn(
                        "aspect-square rounded-lg border-2 border-dashed overflow-hidden transition-all",
                        coverImages[index] ? "border-accent" : "border-border hover:border-accent/50",
                        uploadingIndex === index && "opacity-50"
                      )}
                    >
                      {uploadingIndex === index ? (
                        <div className="w-full h-full flex items-center justify-center bg-muted/50">
                          <Loader2 className="w-5 h-5 animate-spin text-accent" />
                        </div>
                      ) : coverImages[index] ? (
                        <img
                          src={coverImages[index]!}
                          alt={`Cover ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <button
                          onClick={() => fileInputRefs.current[index]?.click()}
                          className="w-full h-full flex flex-col items-center justify-center gap-1 hover:bg-accent/5 transition-colors"
                        >
                          <Upload className="w-5 h-5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground text-center px-1">
                            {t.gridImagePosition[index]}
                          </span>
                        </button>
                      )}
                    </div>

                    {coverImages[index] && uploadingIndex !== index && (
                      <button
                        onClick={() => handleRemoveImage(index)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}

                    <input
                      ref={el => fileInputRefs.current[index] = el}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(index, file);
                        e.target.value = '';
                      }}
                    />
                  </div>
                ))}
              </div>

              <p className="text-xs text-center text-muted-foreground">
                {uploadedImageCount}/4 {langKey === 'pt' ? 'imagens enviadas' : langKey === 'es' ? 'imágenes subidas' : 'images uploaded'}
              </p>

              <p className="text-xs text-center px-4 py-2 bg-accent/10 rounded-lg text-accent">
                <strong>{t.recommendedSize}</strong> {t.sizeDetails}
              </p>
            </div>
          )}

          {/* GRADIENT OVERLAY: Show image upload + gradient picker */}
          {selectedCoverTemplate === 'cover_gradient_overlay' && (
            <Tabs defaultValue="image">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="image" className="gap-1.5">
                  <Image className="w-4 h-4" />
                  <span>{t.imageSubtab}</span>
                  {coverImages[0] && <span className="w-2 h-2 rounded-full bg-green-500" />}
                </TabsTrigger>
                <TabsTrigger value="gradient" className="gap-1.5">
                  <Palette className="w-4 h-4" />
                  <span>{t.gradientSubtab}</span>
                </TabsTrigger>
              </TabsList>

              {/* Image Sub-tab */}
              <TabsContent value="image" className="space-y-4">
                <p className="text-sm text-muted-foreground">{t.imageDescription}</p>

                <div className="flex justify-center">
                  <div className="relative w-48">
                    <div
                      className={cn(
                        "aspect-square rounded-lg border-2 border-dashed overflow-hidden transition-all",
                        coverImages[0] ? "border-accent" : "border-border hover:border-accent/50",
                        uploadingIndex === 0 && "opacity-50"
                      )}
                    >
                      {uploadingIndex === 0 ? (
                        <div className="w-full h-full flex items-center justify-center bg-muted/50">
                          <Loader2 className="w-6 h-6 animate-spin text-accent" />
                        </div>
                      ) : coverImages[0] ? (
                        <img
                          src={coverImages[0]}
                          alt="Cover"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <button
                          onClick={() => fileInputRefs.current[0]?.click()}
                          className="w-full h-full flex flex-col items-center justify-center gap-2 hover:bg-accent/5 transition-colors"
                        >
                          <Upload className="w-6 h-6 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground text-center px-2">
                            {t.uploadImage}
                          </span>
                        </button>
                      )}
                    </div>

                    {coverImages[0] && uploadingIndex !== 0 && (
                      <button
                        onClick={() => handleRemoveImage(0)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}

                    <input
                      ref={el => fileInputRefs.current[0] = el}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(0, file);
                        e.target.value = '';
                      }}
                    />
                  </div>
                </div>

                <p className="text-xs text-center px-4 py-2 bg-accent/10 rounded-lg text-accent">
                  <strong>{t.recommendedSize}</strong> {t.sizeDetails}
                </p>
              </TabsContent>

              {/* Gradient Sub-tab */}
              <TabsContent value="gradient" className="space-y-4">
                <p className="text-sm text-muted-foreground">{t.gradientDescription}</p>

                {/* Category Tabs */}
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setActiveGradientCategory('basic')}
                    className={cn(
                      "px-2 py-1 text-xs rounded-md transition-colors",
                      activeGradientCategory === 'basic'
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    {GRADIENT_CATEGORY_LABELS.basic[language]}
                  </button>
                  {GRADIENT_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveGradientCategory(cat)}
                      className={cn(
                        "px-2 py-1 text-xs rounded-md transition-colors",
                        activeGradientCategory === cat
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      {GRADIENT_CATEGORY_LABELS[cat][language]}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {getFilteredGradients().map((gradient) => (
                    <button
                      key={gradient.id}
                      onClick={() => handleGradientChange(gradient.id)}
                      className={cn(
                        "p-2 rounded-lg border-2 transition-all",
                        gradientId === gradient.id
                          ? "border-accent"
                          : "border-border hover:border-accent/50"
                      )}
                    >
                      <div
                        className="w-full h-10 rounded-md mb-1"
                        style={{
                          background: gradient.colors
                            ? getGradientStyle(gradient.colors)
                            : gradient.id === 'custom'
                              ? getGradientStyle([customColor1, customColor2])
                              : 'transparent',
                          border: gradient.id === 'none' ? '2px dashed hsl(var(--border))' : 'none',
                        }}
                      />
                      <span className="text-[10px] font-medium truncate block">{gradient.name}</span>
                    </button>
                  ))}
                </div>

                {/* Custom gradient color pickers */}
                {gradientId === 'custom' && (
                  <div className="flex gap-4 pt-2">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground mb-1 block">{t.colorStart}</Label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={customColor1}
                          onChange={(e) => handleCustomColorChange(0, e.target.value)}
                          className="w-10 h-10 rounded border-0 cursor-pointer"
                        />
                        <Input
                          value={customColor1}
                          onChange={(e) => handleCustomColorChange(0, e.target.value)}
                          className="flex-1 font-mono text-sm"
                          maxLength={7}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground mb-1 block">{t.colorEnd}</Label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={customColor2}
                          onChange={(e) => handleCustomColorChange(1, e.target.value)}
                          className="w-10 h-10 rounded border-0 cursor-pointer"
                        />
                        <Input
                          value={customColor2}
                          onChange={(e) => handleCustomColorChange(1, e.target.value)}
                          className="flex-1 font-mono text-sm"
                          maxLength={7}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Cover template preview components
const CoverTemplatePreview = ({ type }: { type: CoverTemplateType }) => {
  switch (type) {
    case "cover_solid_color":
      return (
        <div className="w-full h-full p-3 flex flex-col items-center justify-center">
          <div className="w-full h-full bg-muted-foreground/20 rounded-md flex flex-col items-center justify-center p-2">
            <div className="space-y-1 text-center">
              <div className="w-16 h-2 bg-foreground/60 rounded mx-auto" />
              <div className="w-12 h-1.5 bg-foreground/40 rounded mx-auto" />
            </div>
          </div>
        </div>
      );
    case "cover_full_image":
      return (
        <div className="w-full h-full p-3 flex flex-col items-center justify-center">
          <div className="w-full h-full bg-gradient-to-br from-accent/30 to-accent/10 rounded-md flex flex-col items-center justify-center p-2 relative">
            <Image className="w-6 h-6 text-accent/50 absolute inset-0 m-auto opacity-30" />
            <div className="space-y-1 text-center relative z-10">
              <div className="w-16 h-2 bg-white/80 rounded mx-auto" />
              <div className="w-12 h-1.5 bg-white/50 rounded mx-auto" />
            </div>
          </div>
        </div>
      );
    case "cover_split_images":
      return (
        <div className="w-full h-full p-3">
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-1 rounded-md overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-accent/20 flex items-center justify-center">
                <Image className="w-3 h-3 text-accent/40" />
              </div>
            ))}
          </div>
        </div>
      );
    case "cover_gradient_overlay":
      return (
        <div className="w-full h-full p-3">
          <div className="w-full h-full bg-gradient-to-b from-accent/50 to-black/80 rounded-md flex flex-col items-center justify-end p-2">
            <div className="space-y-1 text-center">
              <div className="w-14 h-2 bg-white/80 rounded mx-auto" />
              <div className="w-10 h-1.5 bg-white/50 rounded mx-auto" />
            </div>
          </div>
        </div>
      );
    default:
      return null;
  }
};

export default CoverCustomization;
