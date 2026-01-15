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
  SlideImage,
  templateRequiresImage,
  getTemplateName,
} from "@/lib/templates";
import { FILE_LIMITS, SlideCountMode } from "@/lib/constants";

// Maximum content slides when in auto mode (10 total - 1 cover = 9)
const MAX_AUTO_CONTENT_SLIDES = 9;

interface SlideImageUploaderProps {
  userId: string;
  slideCount: number;
  slideCountMode: SlideCountMode;
  coverTemplate: CoverTemplateType;
  contentTemplate: ContentTemplateType;
  slideImages: SlideImage[];
  onSlideImagesChange: (images: SlideImage[]) => void;
  isCreator: boolean;
}

const SlideImageUploader = ({
  userId,
  slideCount,
  slideCountMode,
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

  const langKey = language === "pt-BR" ? "pt" : language === "es" ? "es" : "en";

  // Translations
  const translations = {
    pt: {
      title: "Imagens do Conteúdo",
      subtitle: "Faça upload das imagens para os slides de conteúdo",
      subtitleAuto: "A IA decidirá quantos slides criar (4-10). Envie até 9 imagens - usaremos na ordem conforme necessário.",
      subtitleManual: "Envie imagens para os slides de conteúdo.",
      coverSlide: "Capa",
      contentSlide: "Slide",
      uploadImage: "Enviar imagem",
      removeImage: "Remover",
      optional: "Opcional",
      uploadingImage: "Enviando...",
      uploadSuccess: "Imagem enviada com sucesso",
      uploadError: "Erro ao enviar imagem",
      invalidFile: "Arquivo inválido",
      invalidFileDesc: "Por favor, envie uma imagem (JPG, PNG, WebP)",
      fileTooLarge: "Arquivo muito grande",
      fileTooLargeDesc: "O tamanho máximo é 5MB",
      lockedTitle: "Upload de Imagens",
      lockedDesc: "Faça upload de imagens personalizadas para cada slide",
      noImagesTitle: "Sem imagens necessárias",
      noImagesDesc: "Os templates selecionados não requerem upload de imagens.",
      hintAuto: "Você pode adicionar ou alterar imagens depois na Preview",
      hintManual: "Você pode adicionar ou alterar imagens depois na Preview",
      imagesUploaded: "imagens enviadas",
    },
    en: {
      title: "Content Images",
      subtitle: "Upload images for content slides",
      subtitleAuto: "AI will decide how many slides to create (4-10). Upload up to 9 images - we'll use them in order as needed.",
      subtitleManual: "Upload images for content slides.",
      coverSlide: "Cover",
      contentSlide: "Slide",
      uploadImage: "Upload image",
      removeImage: "Remove",
      optional: "Optional",
      uploadingImage: "Uploading...",
      uploadSuccess: "Image uploaded successfully",
      uploadError: "Error uploading image",
      invalidFile: "Invalid file",
      invalidFileDesc: "Please upload an image (JPG, PNG, WebP)",
      fileTooLarge: "File too large",
      fileTooLargeDesc: "Maximum size is 5MB",
      lockedTitle: "Image Upload",
      lockedDesc: "Upload custom images for each slide",
      noImagesTitle: "No images required",
      noImagesDesc: "The selected templates don't require image uploads.",
      hintAuto: "You can add or change images later in Preview",
      hintManual: "You can add or change images later in Preview",
      imagesUploaded: "images uploaded",
    },
    es: {
      title: "Imágenes del Contenido",
      subtitle: "Sube imágenes para las diapositivas de contenido",
      subtitleAuto: "La IA decidirá cuántas diapositivas crear (4-10). Sube hasta 9 imágenes - las usaremos en orden según sea necesario.",
      subtitleManual: "Sube imágenes para las diapositivas de contenido.",
      coverSlide: "Portada",
      contentSlide: "Diapositiva",
      uploadImage: "Subir imagen",
      removeImage: "Eliminar",
      optional: "Opcional",
      uploadingImage: "Subiendo...",
      uploadSuccess: "Imagen subida correctamente",
      uploadError: "Error al subir imagen",
      invalidFile: "Archivo inválido",
      invalidFileDesc: "Por favor, sube una imagen (JPG, PNG, WebP)",
      fileTooLarge: "Archivo muy grande",
      fileTooLargeDesc: "El tamaño máximo es 5MB",
      lockedTitle: "Subida de Imágenes",
      lockedDesc: "Sube imágenes personalizadas para cada diapositiva",
      noImagesTitle: "Sin imágenes necesarias",
      noImagesDesc: "Las plantillas seleccionadas no requieren subida de imágenes.",
      hintAuto: "Puedes añadir o cambiar imágenes después en la Vista Previa",
      hintManual: "Puedes añadir o cambiar imágenes después en la Vista Previa",
      imagesUploaded: "imágenes subidas",
    },
  };

  const t = translations[langKey as keyof typeof translations];

  // Determine how many content slide slots to show
  // Auto mode: show maximum possible (9 content slides for 10 total)
  // Manual mode: show exact count (slideCount - 1 for cover)
  const contentSlotCount = slideCountMode === "auto"
    ? MAX_AUTO_CONTENT_SLIDES
    : slideCount - 1;

  // Determine which slides can have images based on templates
  // Note: Cover (index 0) is handled by CoverCustomization, so we only show content slides here
  const getSlidesConfig = () => {
    const slides: { index: number; canHaveImage: boolean; isCover: boolean }[] = [];

    // Content slides only (index 1 to contentSlotCount)
    // Cover slide (index 0) is handled by CoverCustomization component
    for (let i = 1; i <= contentSlotCount; i++) {
      slides.push({
        index: i,
        canHaveImage: templateRequiresImage(contentTemplate),
        isCover: false,
      });
    }

    return slides;
  };

  const slidesConfig = getSlidesConfig();
  const hasSlidesThatCanHaveImages = slidesConfig.some((s) => s.canHaveImage);
  const uploadedImagesCount = slideImages.filter(img => img.publicUrl).length;

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
    if (file.size > FILE_LIMITS.MAX_IMAGE_SIZE) {
      toast({
        title: t.fileTooLarge,
        description: t.fileTooLargeDesc,
        variant: "destructive",
      });
      return;
    }

    setUploadingIndex(slideIndex);

    try {
      // Generate unique filename using userId/slides/{timestamp}-slide-{index}.{ext}
      // This path doesn't depend on carousel ID, avoiding orphaned files
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/slides/${Date.now()}-slide-${slideIndex}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("slide-images")
        .upload(fileName, file, {
          cacheControl: FILE_LIMITS.CACHE_CONTROL_TTL,
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

  // Don't render if not creator or template doesn't use images
  if (!isCreator) {
    return null;
  }

  if (!hasSlidesThatCanHaveImages) {
    return (
      <div className="border border-border/50 rounded-xl p-4 bg-muted/30">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <h4 className="font-medium text-sm">
              {t.noImagesTitle}
            </h4>
            <p className="text-sm text-muted-foreground">
              {t.noImagesDesc}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Dynamic subtitle based on mode
  const subtitleText = slideCountMode === "auto" ? t.subtitleAuto : t.subtitleManual;
  const hintText = slideCountMode === "auto" ? t.hintAuto : t.hintManual;

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-accent/5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Image className="w-4 h-4 text-accent" />
          <h3 className="font-semibold">{t.title}</h3>
          {uploadedImagesCount > 0 && (
            <span className="text-xs text-muted-foreground">
              ({uploadedImagesCount} {t.imagesUploaded})
            </span>
          )}
          <Badge
            variant="secondary"
            className="text-[10px] ml-auto bg-accent/20 text-accent"
          >
            Creator+
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{subtitleText}</p>
      </div>

      {/* Slides grid */}
      <div className="p-4">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {slidesConfig.map((slide) => {
            const image = getSlideImage(slide.index);
            const isUploading = uploadingIndex === slide.index;
            const hasImage = !!image?.publicUrl;

            return (
              <div key={slide.index} className="space-y-1.5">
                {/* Slide label */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">
                    {`${t.contentSlide} ${slide.index + 1}`}
                  </span>
                  <Badge
                    variant="secondary"
                    className="text-[9px] px-1 opacity-60"
                  >
                    {t.optional}
                  </Badge>
                </div>

                {/* Upload area */}
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
                      <Loader2 className="w-5 h-5 animate-spin text-accent" />
                      <span className="text-[9px] text-muted-foreground">
                        {t.uploadingImage}
                      </span>
                    </div>
                  ) : hasImage ? (
                    <>
                      <img
                        src={image.publicUrl!}
                        alt={`Slide ${slide.index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {/* Remove button */}
                      <button
                        onClick={() => handleRemoveImage(slide.index)}
                        className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => fileInputRefs.current[slide.index]?.click()}
                      className="w-full h-full flex flex-col items-center justify-center gap-1.5 hover:bg-accent/5 transition-colors"
                    >
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      <span className="text-[9px] text-muted-foreground text-center px-1">
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
              </div>
            );
          })}
        </div>

        {/* Hint text */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            {hintText}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SlideImageUploader;
