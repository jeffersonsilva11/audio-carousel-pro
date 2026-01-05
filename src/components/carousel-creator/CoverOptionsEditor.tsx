import { useState, useRef } from "react";
import {
  Palette,
  ImagePlus,
  X,
  Upload,
  Loader2,
  Info,
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
import { LockedFeature } from "@/components/ui/locked-feature";
import {
  GRADIENT_PRESETS,
  GRADIENT_CATEGORY_LABELS,
  GradientId,
  GradientCategory
} from "@/lib/constants";

interface CoverOptionsEditorProps {
  gradientId: GradientId;
  customGradientColors?: string[];
  slideImages: (string | null)[];
  onGradientChange: (gradientId: GradientId, customColors?: string[]) => void;
  onSlideImagesChange: (images: (string | null)[]) => void;
  slideCount: number;
  isCreator: boolean;
  userId?: string;
}

const GRADIENT_CATEGORIES: GradientCategory[] = ['warm', 'cool', 'nature', 'dark', 'pastel', 'bold'];

const CoverOptionsEditor = ({
  gradientId,
  customGradientColors,
  slideImages,
  onGradientChange,
  onSlideImagesChange,
  slideCount,
  isCreator,
  userId
}: CoverOptionsEditorProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [customColor1, setCustomColor1] = useState(customGradientColors?.[0] || "#667eea");
  const [customColor2, setCustomColor2] = useState(customGradientColors?.[1] || "#764ba2");
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  // Default to 'basic' category so "Sem gradiente" is visible
  const [activeGradientCategory, setActiveGradientCategory] = useState<GradientCategory | 'basic'>('basic');

  // Get localized feature list for locked state
  const getLockedFeatures = () => {
    const features = {
      "pt-BR": [
        "Upload de imagem de capa personalizada",
        "40+ gradientes premium",
        "Cores personalizadas"
      ],
      "es": [
        "Carga de imagen de portada personalizada",
        "40+ gradientes premium",
        "Colores personalizados"
      ],
      "en": [
        "Custom cover image upload",
        "40+ premium gradients",
        "Custom colors"
      ]
    };
    return features[language] || features["en"];
  };

  if (!isCreator) {
    return (
      <LockedFeature
        requiredPlan="creator"
        title={language === "pt-BR" ? "Opções de Capa" : language === "es" ? "Opciones de Portada" : "Cover Options"}
        description={
          language === "pt-BR"
            ? "Personalize o visual da capa do seu carrossel"
            : language === "es"
            ? "Personaliza el visual de la portada de tu carrusel"
            : "Customize your carousel cover visual"
        }
        icon={Palette}
        features={getLockedFeatures()}
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
        title: language === "pt-BR" ? "Arquivo inválido" : "Invalid file",
        description: language === "pt-BR" ? "Por favor, envie uma imagem." : "Please upload an image.",
        variant: "destructive"
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: language === "pt-BR" ? "Arquivo muito grande" : "File too large",
        description: language === "pt-BR" ? "Máximo 5MB por imagem." : "Maximum 5MB per image.",
        variant: "destructive"
      });
      return;
    }

    if (!userId) {
      toast({
        title: "Erro",
        description: language === "pt-BR" ? "Usuário não autenticado." : "User not authenticated.",
        variant: "destructive"
      });
      return;
    }

    setUploadingIndex(0);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-cover.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('slide-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('slide-images')
        .getPublicUrl(data.path);

      const newSlideImages = [...slideImages];
      while (newSlideImages.length < slideCount) {
        newSlideImages.push(null);
      }
      newSlideImages[0] = urlData.publicUrl;
      onSlideImagesChange(newSlideImages);

      toast({
        title: language === "pt-BR" ? "Upload concluído" : "Upload complete",
        description: language === "pt-BR" ? "Imagem de capa enviada." : "Cover image uploaded."
      });

    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: language === "pt-BR" ? "Erro no upload" : "Upload error",
        description: language === "pt-BR" ? "Não foi possível enviar a imagem." : "Could not upload image.",
        variant: "destructive"
      });
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleRemoveImage = async () => {
    const imageUrl = slideImages[0];

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

    const newSlideImages = [...slideImages];
    newSlideImages[0] = null;
    onSlideImagesChange(newSlideImages);
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

  const coverImageUrl = slideImages[0];
  const isUploading = uploadingIndex === 0;
  const hasImage = !!coverImageUrl;

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <div className="p-4 bg-accent/5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-accent" />
          <h3 className="font-semibold">
            {language === "pt-BR" ? "Opções de Capa" : language === "es" ? "Opciones de Portada" : "Cover Options"}
          </h3>
          <Badge variant="secondary" className="text-[10px] ml-auto bg-accent/20 text-accent">Creator+</Badge>
        </div>
      </div>

      <Tabs defaultValue="image" className="p-4">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="image" className="gap-1.5">
            <ImagePlus className="w-4 h-4" />
            <span>
              {language === "pt-BR" ? "Imagem" : language === "es" ? "Imagen" : "Image"}
            </span>
            {hasImage && (
              <span className="w-2 h-2 rounded-full bg-green-500" />
            )}
          </TabsTrigger>
          <TabsTrigger value="gradient" className="gap-1.5">
            <Palette className="w-4 h-4" />
            <span>
              {language === "pt-BR" ? "Gradiente" : language === "es" ? "Gradiente" : "Gradient"}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Image Tab */}
        <TabsContent value="image" className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {language === "pt-BR"
                ? "Adicione uma imagem de fundo para a capa do seu carrossel."
                : language === "es"
                ? "Agregue una imagen de fondo para la portada de tu carrusel."
                : "Add a background image for your carousel cover."}
            </p>
          </div>

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
                    onClick={() => fileInputRef.current?.click()}
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

              {coverImageUrl && !isUploading && (
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
            <strong>
              {language === "pt-BR" ? "Tamanho recomendado:" : language === "es" ? "Tamaño recomendado:" : "Recommended size:"}
            </strong>{" "}
            {language === "pt-BR"
              ? "1080x1080px (Feed), 1080x1350px (Retrato), ou 1080x1920px (Stories)"
              : language === "es"
              ? "1080x1080px (Feed), 1080x1350px (Retrato), o 1080x1920px (Stories)"
              : "1080x1080px (Feed), 1080x1350px (Portrait), or 1080x1920px (Stories)"}
          </p>

          {/* Priority notice */}
          <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {language === "pt-BR"
                ? "A imagem de capa tem prioridade sobre o gradiente. Se você enviar uma imagem, ela será usada no lugar do gradiente."
                : language === "es"
                ? "La imagen de portada tiene prioridad sobre el gradiente. Si envías una imagen, se usará en lugar del gradiente."
                : "The cover image takes priority over the gradient. If you upload an image, it will be used instead of the gradient."}
            </p>
          </div>
        </TabsContent>

        {/* Gradient Tab */}
        <TabsContent value="gradient" className="space-y-4">
          {/* Warning if image is uploaded */}
          {hasImage && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
              <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {language === "pt-BR"
                  ? "Você já enviou uma imagem de capa. O gradiente não será aplicado enquanto houver uma imagem. Remova a imagem para usar o gradiente."
                  : language === "es"
                  ? "Ya has enviado una imagen de portada. El gradiente no se aplicará mientras haya una imagen. Elimina la imagen para usar el gradiente."
                  : "You already uploaded a cover image. The gradient will not be applied while there's an image. Remove the image to use the gradient."}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm text-muted-foreground">
              {t("advancedEditor", "selectGradient", language)}
            </p>
          </div>

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
                    border: gradient.id === 'none' ? '2px dashed hsl(var(--border))' : 'none'
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
      </Tabs>
    </div>
  );
};

export default CoverOptionsEditor;
