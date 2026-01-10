import { useState, useRef } from "react";
import { Upload, X, Image, Loader2, Info, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  CoverTemplateType,
  ContentTemplateType,
  COVER_TEMPLATES,
  CONTENT_TEMPLATES,
  templateRequiresImage,
  getTemplateName,
} from "@/lib/templates";

interface SlideImage {
  slideIndex: number;
  storagePath: string | null;
  publicUrl: string | null;
  position: 'main' | 'left' | 'right' | 'top' | 'bottom';
}

interface SlideImageUploaderProps {
  carouselId: string;
  userId: string;
  slideCount: number;
  coverTemplate: CoverTemplateType;
  contentTemplate: ContentTemplateType;
  slideImages: SlideImage[];
  onSlideImagesChange: (images: SlideImage[]) => void;
  isCreator: boolean;
}

const SlideImageUploader = ({
  carouselId,
  userId,
  slideCount,
  coverTemplate,
  contentTemplate,
  slideImages,
  onSlideImagesChange,
  isCreator,
}: SlideImageUploaderProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const langKey = language === "pt-BR" ? "pt" : "en";

  // Translations
  const translations = {
    pt: {
      title: "Imagens dos Slides",
      subtitle: "Faça upload das imagens para cada slide que requer imagem",
      coverSlide: "Capa",
      contentSlide: "Slide",
      uploadImage: "Enviar imagem",
      removeImage: "Remover",
      requiresImage: "Requer imagem",
      noImageRequired: "Não requer imagem",
      uploadingImage: "Enviando...",
      uploadSuccess: "Imagem enviada com sucesso",
      uploadError: "Erro ao enviar imagem",
      invalidFile: "Arquivo inválido",
      invalidFileDesc: "Por favor, envie uma imagem (JPG, PNG, WebP)",
      fileTooLarge: "Arquivo muito grande",
      fileTooLargeDesc: "O tamanho máximo é 5MB",
      lockedTitle: "Upload de Imagens",
      lockedDesc: "Faça upload de imagens personalizadas para cada slide",
    },
    en: {
      title: "Slide Images",
      subtitle: "Upload images for each slide that requires an image",
      coverSlide: "Cover",
      contentSlide: "Slide",
      uploadImage: "Upload image",
      removeImage: "Remove",
      requiresImage: "Requires image",
      noImageRequired: "No image required",
      uploadingImage: "Uploading...",
      uploadSuccess: "Image uploaded successfully",
      uploadError: "Error uploading image",
      invalidFile: "Invalid file",
      invalidFileDesc: "Please upload an image (JPG, PNG, WebP)",
      fileTooLarge: "File too large",
      fileTooLargeDesc: "Maximum size is 5MB",
      lockedTitle: "Image Upload",
      lockedDesc: "Upload custom images for each slide",
    },
  };

  const t = translations[langKey];

  // Determine which slides require images based on templates
  const getSlidesRequiringImages = () => {
    const slides: { index: number; requiresImage: boolean; isCover: boolean }[] = [];

    // Cover slide (index 0)
    slides.push({
      index: 0,
      requiresImage: templateRequiresImage(coverTemplate),
      isCover: true,
    });

    // Content slides (index 1 to slideCount - 1)
    for (let i = 1; i < slideCount; i++) {
      slides.push({
        index: i,
        requiresImage: templateRequiresImage(contentTemplate),
        isCover: false,
      });
    }

    return slides;
  };

  const slidesConfig = getSlidesRequiringImages();
  const hasSlidesThatRequireImages = slidesConfig.some((s) => s.requiresImage);

  // Get image for a specific slide
  const getSlideImage = (slideIndex: number): SlideImage | undefined => {
    return slideImages.find((img) => img.slideIndex === slideIndex);
  };

  // Handle image upload
  const handleImageUpload = async (slideIndex: number, file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: t.invalidFile,
        description: t.invalidFileDesc,
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t.fileTooLarge,
        description: t.fileTooLargeDesc,
        variant: "destructive",
      });
      return;
    }

    setUploadingIndex(slideIndex);

    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${carouselId}/slide-${slideIndex}-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("slide-images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("slide-images")
        .getPublicUrl(data.path);

      // Update slide images
      const existingImageIndex = slideImages.findIndex(
        (img) => img.slideIndex === slideIndex
      );

      const newImage: SlideImage = {
        slideIndex,
        storagePath: data.path,
        publicUrl: urlData.publicUrl,
        position: "main",
      };

      let updatedImages: SlideImage[];
      if (existingImageIndex >= 0) {
        updatedImages = [...slideImages];
        updatedImages[existingImageIndex] = newImage;
      } else {
        updatedImages = [...slideImages, newImage];
      }

      onSlideImagesChange(updatedImages);

      toast({
        title: t.uploadSuccess,
        description: `${slidesConfig[slideIndex]?.isCover ? t.coverSlide : `${t.contentSlide} ${slideIndex}`}`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: t.uploadError,
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUploadingIndex(null);
    }
  };

  // Handle image removal
  const handleRemoveImage = async (slideIndex: number) => {
    const imageToRemove = getSlideImage(slideIndex);

    if (imageToRemove?.storagePath) {
      try {
        await supabase.storage
          .from("slide-images")
          .remove([imageToRemove.storagePath]);
      } catch (error) {
        console.error("Error deleting image:", error);
      }
    }

    const updatedImages = slideImages.filter(
      (img) => img.slideIndex !== slideIndex
    );
    onSlideImagesChange(updatedImages);
  };

  // Don't render if not creator or no images required
  if (!isCreator) {
    return null;
  }

  if (!hasSlidesThatRequireImages) {
    return (
      <div className="border border-border/50 rounded-xl p-4 bg-muted/30">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <h4 className="font-medium text-sm">
              {langKey === "pt" ? "Sem imagens necessárias" : "No images required"}
            </h4>
            <p className="text-sm text-muted-foreground">
              {langKey === "pt"
                ? "Os templates selecionados não requerem upload de imagens."
                : "The selected templates don't require image uploads."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-accent/5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Image className="w-4 h-4 text-accent" />
          <h3 className="font-semibold">{t.title}</h3>
          <Badge
            variant="secondary"
            className="text-[10px] ml-auto bg-accent/20 text-accent"
          >
            Creator+
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
      </div>

      {/* Slides grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {slidesConfig.map((slide) => {
            const image = getSlideImage(slide.index);
            const isUploading = uploadingIndex === slide.index;
            const hasImage = !!image?.publicUrl;

            return (
              <div key={slide.index} className="space-y-2">
                {/* Slide label */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">
                    {slide.isCover
                      ? t.coverSlide
                      : `${t.contentSlide} ${slide.index}`}
                  </span>
                  {slide.requiresImage ? (
                    <Badge variant="outline" className="text-[9px] px-1">
                      {t.requiresImage}
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1 opacity-50"
                    >
                      {t.noImageRequired}
                    </Badge>
                  )}
                </div>

                {/* Upload area */}
                {slide.requiresImage ? (
                  <div
                    className={cn(
                      "aspect-square rounded-lg border-2 border-dashed overflow-hidden transition-all relative",
                      hasImage
                        ? "border-accent"
                        : "border-border hover:border-accent/50",
                      isUploading && "opacity-50"
                    )}
                  >
                    {isUploading ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-muted/50 gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-accent" />
                        <span className="text-xs text-muted-foreground">
                          {t.uploadingImage}
                        </span>
                      </div>
                    ) : hasImage ? (
                      <>
                        <img
                          src={image.publicUrl!}
                          alt={`Slide ${slide.index}`}
                          className="w-full h-full object-cover"
                        />
                        {/* Remove button */}
                        <button
                          onClick={() => handleRemoveImage(slide.index)}
                          className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => fileInputRefs.current[slide.index]?.click()}
                        className="w-full h-full flex flex-col items-center justify-center gap-2 hover:bg-accent/5 transition-colors"
                      >
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground text-center px-2">
                          {t.uploadImage}
                        </span>
                      </button>
                    )}

                    {/* Hidden file input */}
                    <input
                      ref={(el) => (fileInputRefs.current[slide.index] = el)}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(slide.index, file);
                        e.target.value = "";
                      }}
                    />
                  </div>
                ) : (
                  <div className="aspect-square rounded-lg border border-border/50 bg-muted/30 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground text-center px-2">
                      {t.noImageRequired}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Template info */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>
              <strong>{langKey === "pt" ? "Capa:" : "Cover:"}</strong>{" "}
              {getTemplateName(coverTemplate, langKey)}
            </span>
            <span>•</span>
            <span>
              <strong>{langKey === "pt" ? "Conteúdo:" : "Content:"}</strong>{" "}
              {getTemplateName(contentTemplate, langKey)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlideImageUploader;
