import { useState, useRef } from "react";
import {
  Type,
  Palette,
  ImagePlus,
  X,
  Upload,
  Sparkles,
  Crown,
  Loader2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUp,
  ArrowDown,
  Settings2,
  Lock,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/translations";
import { getPlanPrice } from "@/lib/localization";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { 
  AVAILABLE_FONTS, 
  GRADIENT_PRESETS, 
  GRADIENT_CATEGORY_LABELS,
  FontId, 
  GradientId,
  GradientCategory 
} from "@/lib/constants";

export type TextAlignment = 'left' | 'center' | 'right';
export type SubtitlePosition = 'above' | 'below';

export interface TemplateCustomization {
  fontId: FontId;
  gradientId: GradientId;
  customGradientColors?: string[];
  slideImages: (string | null)[]; // Array of storage URLs per slide
  textAlignment: TextAlignment;
  subtitlePosition: SubtitlePosition;
  highlightColor: string;
  showNavigationDots: boolean;
  showNavigationArrow: boolean;
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
  const [customColor1, setCustomColor1] = useState("#667eea");
  const [customColor2, setCustomColor2] = useState("#764ba2");
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [activeGradientCategory, setActiveGradientCategory] = useState<GradientCategory | 'basic'>('warm');

  const { createCheckout } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    try {
      await createCheckout("creator");
    } catch (error) {
      toast({
        title: language === "pt-BR" ? "Erro" : "Error",
        description: language === "pt-BR"
          ? "Não foi possível iniciar o checkout."
          : "Could not start checkout.",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (!isCreator) {
    const lockedFeatures = [
      {
        icon: Type,
        label: language === "pt-BR" ? "Fontes personalizadas" : language === "es" ? "Fuentes personalizadas" : "Custom fonts",
        desc: language === "pt-BR" ? "12 fontes exclusivas" : language === "es" ? "12 fuentes exclusivas" : "12 exclusive fonts"
      },
      {
        icon: Palette,
        label: language === "pt-BR" ? "Gradientes premium" : language === "es" ? "Gradientes premium" : "Premium gradients",
        desc: language === "pt-BR" ? "40+ opções de cores" : language === "es" ? "40+ opciones de colores" : "40+ color options"
      },
      {
        icon: ImagePlus,
        label: language === "pt-BR" ? "Imagem de capa" : language === "es" ? "Imagen de portada" : "Cover image",
        desc: language === "pt-BR" ? "Upload personalizado" : language === "es" ? "Carga personalizada" : "Custom upload"
      },
      {
        icon: Settings2,
        label: language === "pt-BR" ? "Opções avançadas" : language === "es" ? "Opciones avanzadas" : "Advanced options",
        desc: language === "pt-BR" ? "Navegação, subtítulos..." : language === "es" ? "Navegación, subtítulos..." : "Navigation, subtitles..."
      },
    ];

    return (
      <div className="border border-accent/30 rounded-xl overflow-hidden bg-gradient-to-br from-accent/5 to-transparent">
        {/* Header */}
        <div className="p-4 bg-accent/10 border-b border-accent/20">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-accent" />
            <h3 className="font-semibold">{t("advancedEditor", "customization", language)}</h3>
            <Badge variant="secondary" className="text-[10px] ml-auto bg-accent/20 text-accent border-accent/30">
              Creator+
            </Badge>
          </div>
        </div>

        {/* Features preview */}
        <div className="p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            {language === "pt-BR"
              ? "Desbloqueie recursos avançados de personalização:"
              : language === "es"
              ? "Desbloquea funciones avanzadas de personalización:"
              : "Unlock advanced customization features:"}
          </p>

          <div className="grid grid-cols-2 gap-2">
            {lockedFeatures.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2.5 rounded-lg bg-background/50 border border-border/50"
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <feature.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{feature.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{feature.desc}</p>
                </div>
                <Lock className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
              </div>
            ))}
          </div>

          {/* Upgrade CTA */}
          <div className="pt-2">
            <Button
              variant="accent"
              className="w-full"
              onClick={handleUpgrade}
              disabled={checkoutLoading}
            >
              {checkoutLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {language === "pt-BR"
                ? `Upgrade para Creator ${getPlanPrice("creator", language)}/mês`
                : language === "es"
                ? `Upgrade a Creator ${getPlanPrice("creator", language)}/mes`
                : `Upgrade to Creator ${getPlanPrice("creator", language)}/mo`}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleFontChange = (fontId: FontId) => {
    setCustomization({ ...customization, fontId });
  };

  const handleTextAlignmentChange = (alignment: TextAlignment) => {
    setCustomization({ ...customization, textAlignment: alignment });
  };

  const handleSubtitlePositionChange = (position: SubtitlePosition) => {
    setCustomization({ ...customization, subtitlePosition: position });
  };

  const handleHighlightColorChange = (color: string) => {
    setCustomization({ ...customization, highlightColor: color });
  };

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
    if (file.size > 5 * 1024 * 1024) {
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
          cacheControl: '3600',
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

  const selectedFont = AVAILABLE_FONTS.find(f => f.id === customization.fontId);
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

      <Tabs defaultValue="fonts" className="p-4">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="fonts" className="gap-1.5">
            <Type className="w-4 h-4" />
            <span className="hidden sm:inline">{t("advancedEditor", "fonts", language)}</span>
          </TabsTrigger>
          <TabsTrigger value="gradients" className="gap-1.5">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">{t("advancedEditor", "gradients", language)}</span>
          </TabsTrigger>
          <TabsTrigger value="images" className="gap-1.5">
            <ImagePlus className="w-4 h-4" />
            <span className="hidden sm:inline">{t("advancedEditor", "slideImages", language)}</span>
          </TabsTrigger>
          <TabsTrigger value="options" className="gap-1.5">
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">Opções</span>
          </TabsTrigger>
        </TabsList>

        {/* Fonts Tab */}
        <TabsContent value="fonts" className="space-y-4">
          {/* Text Alignment */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Alinhamento do Texto</p>
            <div className="flex gap-2">
              {([
                { value: 'left' as TextAlignment, icon: AlignLeft, label: 'Esquerda' },
                { value: 'center' as TextAlignment, icon: AlignCenter, label: 'Centro' },
                { value: 'right' as TextAlignment, icon: AlignRight, label: 'Direita' }
              ]).map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => handleTextAlignmentChange(value)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
                    customization.textAlignment === value
                      ? "border-accent bg-accent/10"
                      : "border-border hover:border-accent/50"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Selection */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("advancedEditor", "selectFont", language)}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {AVAILABLE_FONTS.map((font) => (
                <button
                  key={font.id}
                  onClick={() => handleFontChange(font.id)}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all text-center",
                    customization.fontId === font.id
                      ? "border-accent bg-accent/10"
                      : "border-border hover:border-accent/50"
                  )}
                >
                  <span
                    className="block text-lg font-medium truncate"
                    style={{ fontFamily: font.family }}
                  >
                    Abc
                  </span>
                  <span className="text-xs text-muted-foreground mt-1 block truncate">
                    {font.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Gradients Tab */}
        <TabsContent value="gradients" className="space-y-4">
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
        </TabsContent>

        {/* Cover Image Tab - Only slide 1 */}
        <TabsContent value="images" className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-1">Imagem de Capa</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Adicione uma imagem de fundo para o primeiro slide (capa) do carrossel.
              Os demais slides terão fundo sólido ou gradiente.
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
                        alt="Capa do carrossel"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <button
                        onClick={() => fileInputRefs.current[0]?.click()}
                        className="w-full h-full flex flex-col items-center justify-center gap-2 hover:bg-accent/5 transition-colors"
                      >
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground text-center px-2">
                          Clique para adicionar imagem de capa
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

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              💡 A imagem de capa aparecerá no primeiro slide com o título do carrossel sobreposto.
            </p>
            <p className="text-xs text-center px-4 py-2 bg-accent/10 rounded-lg text-accent">
              <strong>Tamanho recomendado:</strong> Mínimo 1080x1080px para Feed, 1080x1350px para Retrato, ou 1080x1920px para Stories/Reels.
              Use imagens em alta resolução para melhor qualidade.
            </p>
          </div>
        </TabsContent>

        {/* Options Tab */}
        <TabsContent value="options" className="space-y-6">
          {/* Cover Slide Options */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">1</span>
              Opções da Capa
            </h4>

            {/* Subtitle Position */}
            <div className="space-y-2 pl-8">
              <Label className="text-sm">Posição do Subtítulo</Label>
              <div className="flex gap-2">
                {([
                  { value: 'above' as SubtitlePosition, icon: ArrowUp, label: 'Acima do Título' },
                  { value: 'below' as SubtitlePosition, icon: ArrowDown, label: 'Abaixo do Título' }
                ]).map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => handleSubtitlePositionChange(value)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all",
                      customization.subtitlePosition === value
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-accent/50"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Define onde o subtítulo aparece em relação ao título principal na capa
              </p>
            </div>

          </div>

          {/* Navigation Options */}
          <div className="space-y-4 border-t border-border pt-4">
            <h4 className="text-sm font-medium">Navegação Visual</h4>

            {/* Navigation Dots */}
            <div className="flex items-center justify-between pl-4">
              <div className="space-y-1">
                <Label className="text-sm">Pontos de Navegação</Label>
                <p className="text-xs text-muted-foreground">
                  Mostra indicadores de posição no rodapé dos slides
                </p>
              </div>
              <Switch
                checked={customization.showNavigationDots}
                onCheckedChange={handleNavigationDotsChange}
              />
            </div>

            {/* Navigation Arrow */}
            <div className="flex items-center justify-between pl-4">
              <div className="space-y-1">
                <Label className="text-sm">Seta de Navegação</Label>
                <p className="text-xs text-muted-foreground">
                  Mostra seta indicando próximo slide (exceto no último)
                </p>
              </div>
              <Switch
                checked={customization.showNavigationArrow}
                onCheckedChange={handleNavigationArrowChange}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center pt-2">
            💡 Estas opções afetam a aparência visual dos slides gerados
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedTemplateEditor;