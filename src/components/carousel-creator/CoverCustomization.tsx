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
  // Cover image
  coverImageUrl: string | null;
  onCoverImageChange: (url: string | null) => void;
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
  coverImageUrl,
  onCoverImageChange,
  isCreator,
  userId,
}: CoverCustomizationProps) => {
  const { language } = useLanguage();
  const { plan } = useSubscription();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [customColor1, setCustomColor1] = useState(customGradientColors?.[0] || DEFAULT_GRADIENT_COLORS.START);
  const [customColor2, setCustomColor2] = useState(customGradientColors?.[1] || DEFAULT_GRADIENT_COLORS.END);
  const [uploading, setUploading] = useState(false);
  const [activeGradientCategory, setActiveGradientCategory] = useState<GradientCategory | 'basic'>('basic');
  const [activeTab, setActiveTab] = useState<"template" | "background">("template");

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
      noImageRequired: "Sem imagem",
      imageSubtab: "Imagem",
      gradientSubtab: "Gradiente",
      imageDescription: "Adicione uma imagem de fundo para a capa",
      gradientDescription: "Escolha um gradiente para o fundo da capa",
      uploadImage: "Clique para adicionar imagem",
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
      noImageRequired: "No image",
      imageSubtab: "Image",
      gradientSubtab: "Gradient",
      imageDescription: "Add a background image for the cover",
      gradientDescription: "Choose a gradient for the cover background",
      uploadImage: "Click to add image",
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
      noImageRequired: "Sin imagen",
      imageSubtab: "Imagen",
      gradientSubtab: "Gradiente",
      imageDescription: "Agrega una imagen de fondo para la portada",
      gradientDescription: "Elige un gradiente para el fondo de la portada",
      uploadImage: "Clic para agregar imagen",
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

  const handleImageUpload = async (file: File) => {
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

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-cover.${fileExt}`;

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

      onCoverImageChange(urlData.publicUrl);

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
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (coverImageUrl && coverImageUrl.includes('slide-images') && userId) {
      try {
        const path = coverImageUrl.split('slide-images/')[1];
        if (path) {
          await supabase.storage.from('slide-images').remove([path]);
        }
      } catch (error) {
        console.error("Error deleting image:", error);
      }
    }
    onCoverImageChange(null);
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

  const hasImage = !!coverImageUrl;

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
            {hasImage && <span className="w-2 h-2 rounded-full bg-green-500" />}
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
                          {meta.requiresImage ? t.requiresImage : t.noImageRequired}
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
          {/* Image/Gradient sub-tabs */}
          <Tabs defaultValue="image">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="image" className="gap-1.5">
                <Image className="w-4 h-4" />
                <span>{t.imageSubtab}</span>
                {hasImage && <span className="w-2 h-2 rounded-full bg-green-500" />}
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
                      coverImageUrl ? "border-accent" : "border-border hover:border-accent/50",
                      uploading && "opacity-50"
                    )}
                  >
                    {uploading ? (
                      <div className="w-full h-full flex items-center justify-center bg-muted/50">
                        <Loader2 className="w-6 h-6 animate-spin text-accent" />
                      </div>
                    ) : coverImageUrl ? (
                      <img
                        src={coverImageUrl}
                        alt="Cover"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-full flex flex-col items-center justify-center gap-2 hover:bg-accent/5 transition-colors"
                      >
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground text-center px-2">
                          {t.uploadImage}
                        </span>
                      </button>
                    )}
                  </div>

                  {coverImageUrl && !uploading && (
                    <button
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>

              <p className="text-xs text-center px-4 py-2 bg-accent/10 rounded-lg text-accent">
                <strong>{t.recommendedSize}</strong> {t.sizeDetails}
              </p>

              <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {t.imagePriority}
                </p>
              </div>
            </TabsContent>

            {/* Gradient Sub-tab */}
            <TabsContent value="gradient" className="space-y-4">
              {hasImage && (
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
                  <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {t.imageUploaded}
                  </p>
                </div>
              )}

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

              <div className={cn(
                "grid grid-cols-3 sm:grid-cols-5 gap-2",
                hasImage && "opacity-50 pointer-events-none"
              )}>
                {getFilteredGradients().map((gradient) => (
                  <button
                    key={gradient.id}
                    onClick={() => handleGradientChange(gradient.id)}
                    disabled={hasImage}
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
              {gradientId === 'custom' && !hasImage && (
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Cover template preview components
const CoverTemplatePreview = ({ type }: { type: CoverTemplateType }) => {
  switch (type) {
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
