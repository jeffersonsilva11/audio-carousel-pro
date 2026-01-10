import { useState, useRef } from "react";
import {
  Palette,
  ImagePlus,
  X,
  Upload,
  Sparkles,
  Loader2,
  Settings2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FILE_LIMITS, DEFAULT_GRADIENT_COLORS } from "@/lib/constants";
import { LockedFeature } from "@/components/ui/locked-feature";
import {
  GRADIENT_PRESETS,
  GRADIENT_CATEGORY_LABELS,
  FontId,
  GradientId,
  GradientCategory
} from "@/lib/constants";
import { CoverTemplateType, ContentTemplateType } from "@/lib/templates";

export type TextAlignment = 'left' | 'center' | 'right';

export interface TemplateCustomization {
  fontId: FontId;
  gradientId: GradientId;
  customGradientColors?: string[];
  slideImages: (string | null)[]; // Array of storage URLs per slide
  textAlignment: TextAlignment;
  showNavigationDots: boolean;
  showNavigationArrow: boolean;
  // Layout templates (Creator+ only)
  coverTemplate?: CoverTemplateType;
  contentTemplate?: ContentTemplateType;
}

interface AdvancedTemplateEditorProps {
  customization: TemplateCustomization;
  setCustomization: (customization: TemplateCustomization) => void;
  slideCount: number;
  isCreator: boolean;
  userId?: string;
}

const GRADIENT_CATEGORIES: GradientCategory[] = ['warm', 'cool', 'nature', 'dark', 'pastel', 'bold'];

const AdvancedTemplateEditor = ({
  customization,
  setCustomization,
  slideCount,
  isCreator,
  userId
}: AdvancedTemplateEditorProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [customColor1, setCustomColor1] = useState(DEFAULT_GRADIENT_COLORS.START);
  const [customColor2, setCustomColor2] = useState(DEFAULT_GRADIENT_COLORS.END);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [activeGradientCategory, setActiveGradientCategory] = useState<GradientCategory | 'basic'>('warm');

  // Get localized feature list for locked state
  const getLockedFeatures = () => {
    const features = {
      "pt-BR": [
        "40+ gradientes premium",
        "Upload de imagem de capa personalizada",
        "Opções de navegação visual"
      ],
      "es": [
        "40+ gradientes premium",
        "Carga de imagen de portada personalizada",
        "Opciones de navegación visual"
      ],
      "en": [
        "40+ premium gradients",
        "Custom cover image upload",
        "Visual navigation options"
      ]
    };
    return features[language] || features["en"];
  };

  if (!isCreator) {
    return (
      <LockedFeature
        requiredPlan="creator"
        title={t("advancedEditor", "customization", language)}
        description={
          language === "pt-BR"
            ? "Personalize fontes, cores e muito mais"
            : language === "es"
            ? "Personaliza fuentes, colores y más"
            : "Customize fonts, colors and more"
        }
        icon={Sparkles}
        features={getLockedFeatures()}
        hasAccess={false}
      />
    );
  }

  const handleNavigationDotsChange = (show: boolean) => {
    setCustomization({ ...customization, showNavigationDots: show });
  };

  const handleNavigationArrowChange = (show: boolean) => {
    setCustomization({ ...customization, showNavigationArrow: show });
  };

  const handleGradientChange = (gradientId: GradientId) => {
    if (gradientId === 'custom') {
      setCustomization({ 
        ...customization, 
        gradientId, 
        customGradientColors: [customColor1, customColor2] 
      });
    } else {
      setCustomization({ ...customization, gradientId, customGradientColors: undefined });
    }
  };

  const handleCustomColorChange = (index: 0 | 1, color: string) => {
    if (index === 0) {
      setCustomColor1(color);
    } else {
      setCustomColor2(color);
    }
    if (customization.gradientId === 'custom') {
      const newColors = [...(customization.customGradientColors || [customColor1, customColor2])];
      newColors[index] = color;
      setCustomization({ ...customization, customGradientColors: newColors });
    }
  };

  const handleImageUpload = async (slideIndex: number, file: File) => {
    // Validate file
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, envie uma imagem.",
        variant: "destructive"
      });
      return;
    }
    if (file.size > FILE_LIMITS.MAX_IMAGE_SIZE) {
      toast({
        title: "Arquivo muito grande",
        description: "Máximo 5MB por imagem.",
        variant: "destructive"
      });
      return;
    }

    if (!userId) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado.",
        variant: "destructive"
      });
      return;
    }

    setUploadingIndex(slideIndex);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-slide-${slideIndex}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('slide-images')
        .upload(fileName, file, {
          cacheControl: FILE_LIMITS.CACHE_CONTROL_TTL,
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('slide-images')
        .getPublicUrl(data.path);

      // Update customization with new URL
      const newSlideImages = [...customization.slideImages];
      while (newSlideImages.length < slideCount) {
        newSlideImages.push(null);
      }
      newSlideImages[slideIndex] = urlData.publicUrl;
      setCustomization({ ...customization, slideImages: newSlideImages });

      toast({
        title: "Upload concluído",
        description: `Imagem do slide ${slideIndex + 1} enviada.`
      });

    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar a imagem.",
        variant: "destructive"
      });
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleRemoveImage = async (slideIndex: number) => {
    const imageUrl = customization.slideImages[slideIndex];
    
    // Try to delete from storage if it's a storage URL
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

    const newSlideImages = [...customization.slideImages];
    newSlideImages[slideIndex] = null;
    setCustomization({ ...customization, slideImages: newSlideImages });
  };

  const getGradientStyle = (colors: readonly string[] | null) => {
    if (!colors || colors.length < 2) return 'transparent';
    return `linear-gradient(135deg, ${colors.join(', ')})`;
  };

  const getCurrentGradientColors = () => {
    if (customization.gradientId === 'none') return null;
    if (customization.gradientId === 'custom') return customization.customGradientColors || [customColor1, customColor2];
    const gradient = GRADIENT_PRESETS.find(g => g.id === customization.gradientId);
    return gradient?.colors ? [...gradient.colors] : null;
  };

  const currentGradientColors = getCurrentGradientColors();

  // Filter gradients by category
  const getFilteredGradients = () => {
    if (activeGradientCategory === 'basic') {
      return GRADIENT_PRESETS.filter(g => g.category === 'basic');
    }
    return GRADIENT_PRESETS.filter(g => g.category === activeGradientCategory);
  };

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <div className="p-4 bg-accent/5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <h3 className="font-semibold">{t("advancedEditor", "customization", language)}</h3>
          <Badge variant="secondary" className="text-[10px] ml-auto">Creator+</Badge>
        </div>
      </div>

      <Tabs defaultValue="capa" className="p-4">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="capa" className="gap-1.5">
            <ImagePlus className="w-4 h-4" />
            <span className="hidden sm:inline">
              {language === "pt-BR" ? "Capa" : language === "es" ? "Portada" : "Cover"}
            </span>
          </TabsTrigger>
          <TabsTrigger value="options" className="gap-1.5">
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">
              {language === "pt-BR" ? "Opções" : language === "es" ? "Opciones" : "Options"}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Capa Tab - Gradient + Cover Image */}
        <TabsContent value="capa" className="space-y-6">
          {/* Gradient Selection */}
          <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("advancedEditor", "selectGradient", language)}</p>
          
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1 mb-3">
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
                  customization.gradientId === gradient.id
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
                    border: gradient.id === 'none' ? '2px dashed hsl(var(--border))' : 'none'
                  }}
                />
                <span className="text-[10px] font-medium truncate block">{gradient.name}</span>
              </button>
            ))}
          </div>

          {/* Custom gradient color pickers */}
          {customization.gradientId === 'custom' && (
            <div className="flex gap-4 pt-2">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1 block">{t("advancedEditor", "colorStart", language)}</Label>
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
                <Label className="text-xs text-muted-foreground mb-1 block">{t("advancedEditor", "colorEnd", language)}</Label>
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

          {/* Cover Image Section */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div>
              <h4 className="text-sm font-medium mb-1">
                {language === "pt-BR" ? "Imagem de Capa" : language === "es" ? "Imagen de Portada" : "Cover Image"}
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                {language === "pt-BR"
                  ? "Adicione uma imagem de fundo para o primeiro slide (capa) do carrossel."
                  : language === "es"
                  ? "Agregue una imagen de fondo para el primer slide (portada) del carrusel."
                  : "Add a background image for the first slide (cover) of the carousel."}
              </p>
            </div>

            {(() => {
              const coverImageUrl = customization.slideImages[0];
              const isUploading = uploadingIndex === 0;

              return (
                <div className="flex justify-center">
                  <div className="relative w-48">
                    <div
                      className={cn(
                        "aspect-square rounded-lg border-2 border-dashed overflow-hidden transition-all",
                        coverImageUrl ? "border-accent" : "border-border hover:border-accent/50",
                        isUploading && "opacity-50"
                      )}
                    >
                      {isUploading ? (
                        <div className="w-full h-full flex items-center justify-center bg-muted/50">
                          <Loader2 className="w-6 h-6 animate-spin text-accent" />
                        </div>
                      ) : coverImageUrl ? (
                        <img
                          src={coverImageUrl}
                          alt={language === "pt-BR" ? "Capa do carrossel" : language === "es" ? "Portada del carrusel" : "Carousel cover"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <button
                          onClick={() => fileInputRefs.current[0]?.click()}
                          className="w-full h-full flex flex-col items-center justify-center gap-2 hover:bg-accent/5 transition-colors"
                        >
                          <Upload className="w-6 h-6 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground text-center px-2">
                            {language === "pt-BR"
                              ? "Clique para adicionar imagem"
                              : language === "es"
                              ? "Clic para agregar imagen"
                              : "Click to add image"}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Remove button */}
                    {coverImageUrl && !isUploading && (
                      <button
                        onClick={() => handleRemoveImage(0)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}

                    {/* Hidden file input */}
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
              );
            })()}

            <p className="text-xs text-center px-4 py-2 bg-accent/10 rounded-lg text-accent">
              <strong>
                {language === "pt-BR" ? "Tamanho recomendado:" : language === "es" ? "Tamaño recomendado:" : "Recommended size:"}
              </strong>{" "}
              {language === "pt-BR"
                ? "1080x1080px (Feed), 1080x1350px (Retrato), ou 1080x1920px (Stories)"
                : language === "es"
                ? "1080x1080px (Feed), 1080x1350px (Retrato), o 1080x1920px (Stories)"
                : "1080x1080px (Feed), 1080x1350px (Portrait), or 1080x1920px (Stories)"}
            </p>
          </div>
        </TabsContent>

        {/* Options Tab */}
        <TabsContent value="options" className="space-y-6">
          {/* Navigation Options */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">
              {language === "pt-BR" ? "Navegação Visual" : language === "es" ? "Navegación Visual" : "Visual Navigation"}
            </h4>

            {/* Navigation Dots */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm">
                  {language === "pt-BR" ? "Pontos de Navegação" : language === "es" ? "Puntos de Navegación" : "Navigation Dots"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {language === "pt-BR"
                    ? "Mostra indicadores de posição no rodapé dos slides"
                    : language === "es"
                    ? "Muestra indicadores de posición en el pie de los slides"
                    : "Shows position indicators at the bottom of slides"}
                </p>
              </div>
              <Switch
                checked={customization.showNavigationDots}
                onCheckedChange={handleNavigationDotsChange}
              />
            </div>

            {/* Navigation Arrow */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm">
                  {language === "pt-BR" ? "Seta de Navegação" : language === "es" ? "Flecha de Navegación" : "Navigation Arrow"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {language === "pt-BR"
                    ? "Mostra seta indicando próximo slide (exceto no último)"
                    : language === "es"
                    ? "Muestra flecha indicando el próximo slide (excepto en el último)"
                    : "Shows arrow indicating next slide (except on last)"}
                </p>
              </div>
              <Switch
                checked={customization.showNavigationArrow}
                onCheckedChange={handleNavigationArrowChange}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedTemplateEditor;