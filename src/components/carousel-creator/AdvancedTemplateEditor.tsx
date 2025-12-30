import { useState, useRef } from "react";
import { 
  Type, 
  Palette, 
  ImagePlus, 
  X,
  Upload,
  Sparkles,
  Crown,
  Eye,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  AVAILABLE_FONTS, 
  GRADIENT_PRESETS, 
  GRADIENT_CATEGORY_LABELS,
  FontId, 
  GradientId,
  GradientCategory 
} from "@/lib/constants";

export interface TemplateCustomization {
  fontId: FontId;
  gradientId: GradientId;
  customGradientColors?: string[];
  slideImages: (string | null)[]; // Array of storage URLs per slide
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

  if (!isCreator) {
    return (
      <div className="border border-border/50 rounded-xl p-6 bg-muted/30 text-center">
        <Crown className="w-8 h-8 text-accent mx-auto mb-3" />
        <h3 className="font-semibold text-lg mb-1">{t("advancedEditor", "customization", language)}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t("advancedEditor", "creatorFeature", language)}
        </p>
        <Badge variant="secondary">
          <Sparkles className="w-3 h-3 mr-1" />
          Creator+
        </Badge>
      </div>
    );
  }

  const handleFontChange = (fontId: FontId) => {
    setCustomization({ ...customization, fontId });
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

      {/* Live Preview Section */}
      <div className="p-4 border-b border-border/50 bg-muted/20">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t("advancedEditor", "previewMode", language)}</span>
        </div>
        <div 
          className="relative aspect-square max-w-[200px] mx-auto rounded-lg overflow-hidden shadow-lg"
          style={{
            background: currentGradientColors 
              ? getGradientStyle(currentGradientColors)
              : 'hsl(var(--background))'
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <p 
              className="text-center text-foreground leading-relaxed"
              style={{ 
                fontFamily: selectedFont?.family || 'Inter, sans-serif',
                fontSize: '16px',
                color: currentGradientColors ? '#ffffff' : 'hsl(var(--foreground))',
                textShadow: currentGradientColors ? '0 1px 3px rgba(0,0,0,0.3)' : 'none'
              }}
            >
              Exemplo de texto com a fonte {selectedFont?.name || 'Inter'}
            </p>
          </div>
          {/* Profile indicator */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm" />
            <span 
              className="text-[10px] font-medium"
              style={{ 
                fontFamily: selectedFont?.family,
                color: currentGradientColors ? '#ffffff' : 'hsl(var(--foreground))'
              }}
            >
              @usuario
            </span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="fonts" className="p-4">
        <TabsList className="grid w-full grid-cols-3 mb-4">
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
        </TabsList>

        {/* Fonts Tab */}
        <TabsContent value="fonts" className="space-y-3">
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

        {/* Slide Images Tab */}
        <TabsContent value="images" className="space-y-4">
          {slideCount === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ImagePlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t("advancedEditor", "noSlides", language)}</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{t("advancedEditor", "uploadImage", language)}</p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {Array.from({ length: slideCount }).map((_, index) => {
                  const imageUrl = customization.slideImages[index];
                  const isUploading = uploadingIndex === index;
                  
                  return (
                    <div key={index} className="relative">
                      <div 
                        className={cn(
                          "aspect-square rounded-lg border-2 border-dashed overflow-hidden transition-all",
                          imageUrl ? "border-accent" : "border-border hover:border-accent/50",
                          isUploading && "opacity-50"
                        )}
                      >
                        {isUploading ? (
                          <div className="w-full h-full flex items-center justify-center bg-muted/50">
                            <Loader2 className="w-6 h-6 animate-spin text-accent" />
                          </div>
                        ) : imageUrl ? (
                          <img 
                            src={imageUrl} 
                            alt={`Slide ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <button
                            onClick={() => fileInputRefs.current[index]?.click()}
                            className="w-full h-full flex flex-col items-center justify-center gap-1 hover:bg-accent/5 transition-colors"
                          >
                            <Upload className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {t("advancedEditor", "slide", language)} {index + 1}
                            </span>
                          </button>
                        )}
                      </div>
                      
                      {/* Remove button */}
                      {imageUrl && !isUploading && (
                        <button
                          onClick={() => handleRemoveImage(index)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      
                      {/* Hidden file input */}
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
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedTemplateEditor;