import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
  Undo2,
  Redo2,
  AlertTriangle,
  X,
  Upload,
  ImageIcon,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useLanguage";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableSlide } from "./SortableSlide";
import { supabase } from "@/integrations/supabase/client";
import { ContentTemplateType, templateRequiresImage, SlideImage } from "@/lib/templates";
import { FILE_LIMITS } from "@/lib/constants";

interface Slide {
  number: number;
  type: string;
  text: string;
  imageUrl?: string;
}

type FormatType = 'POST_SQUARE' | 'POST_PORTRAIT' | 'STORY';

// Character limits per format and slide type
const CHARACTER_LIMITS: Record<FormatType, { cover: number; content: number }> = {
  'POST_SQUARE': { cover: 150, content: 280 },
  'POST_PORTRAIT': { cover: 180, content: 320 },
  'STORY': { cover: 250, content: 400 },
};

interface CarouselEditViewProps {
  slides: Slide[];
  onSlidesUpdate: (slides: Slide[]) => void;
  onFinalize: (editedSlides: Slide[], changedIndices: number[], changedImageIndices: number[]) => void;
  isRegenerating?: boolean;
  regeneratingProgress?: { current: number; total: number };
  onCancelRegeneration?: () => void;
  format?: FormatType;
  // New props for image management
  userId?: string;
  contentTemplate?: ContentTemplateType;
  slideImages?: SlideImage[];
  onSlideImagesChange?: (images: SlideImage[]) => void;
}

const CarouselEditView = ({
  slides: initialSlides,
  onSlidesUpdate,
  onFinalize,
  isRegenerating = false,
  regeneratingProgress,
  onCancelRegeneration,
  format = 'POST_SQUARE',
  userId,
  contentTemplate = 'content_text_only',
  slideImages = [],
  onSlideImagesChange,
}: CarouselEditViewProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Undo/Redo hook for slides
  const {
    state: slides,
    setState: setSlides,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndoRedo<Slide[]>(initialSlides);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [originalSlides] = useState<Slide[]>(initialSlides);

  // Local editing state (always in edit mode)
  const [editedText, setEditedText] = useState(initialSlides[0]?.text || "");

  // Track which slides have been modified (text)
  const getChangedIndices = useCallback(() => {
    return slides
      .map((slide, index) => {
        const original = originalSlides[index];
        if (!original) return -1;
        if (slide.text !== original.text) {
          return index;
        }
        return -1;
      })
      .filter((i) => i !== -1);
  }, [slides, originalSlides]);

  // Track original images to detect changes
  const [originalImages] = useState<SlideImage[]>(slideImages);
  const [uploadingSlide, setUploadingSlide] = useState<number | null>(null);
  const [changedImageIndices, setChangedImageIndices] = useState<number[]>([]);

  // Check if template requires images for content slides
  const templateNeedsImages = templateRequiresImage(contentTemplate);

  // Get slides missing images (content slides only, index > 0)
  const slidesMissingImages = useMemo(() => {
    if (!templateNeedsImages) return [];
    return slides
      .map((_, index) => index)
      .filter(index => {
        if (index === 0) return false; // Skip cover slide
        const hasImage = slideImages.some(img => img.slideIndex === index && img.publicUrl);
        return !hasImage;
      });
  }, [slides, slideImages, templateNeedsImages]);

  const hasTextChanges = getChangedIndices().length > 0;
  const hasImageChanges = changedImageIndices.length > 0;
  const hasAnyChanges = hasTextChanges || hasImageChanges;

  // Update local state when changing slides
  useEffect(() => {
    const current = slides[currentSlide];
    if (current) {
      setEditedText(current.text);
    }
  }, [currentSlide, slides]);

  // Save current slide edits to state
  const saveCurrentSlideEdits = useCallback(() => {
    const updatedSlides = slides.map((slide, index) => {
      if (index !== currentSlide) return slide;
      return { ...slide, text: editedText };
    });

    if (JSON.stringify(updatedSlides) !== JSON.stringify(slides)) {
      setSlides(updatedSlides);
      onSlidesUpdate(updatedSlides);
    }
  }, [currentSlide, editedText, slides, setSlides, onSlidesUpdate]);

  // Auto-save when text changes (debounced effect)
  useEffect(() => {
    const timer = setTimeout(() => {
      saveCurrentSlideEdits();
    }, 500);
    return () => clearTimeout(timer);
  }, [editedText, saveCurrentSlideEdits]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sortableIds = useMemo(() => slides.map((_, i) => `slide-${i}`), [slides]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = parseInt(String(active.id).replace("slide-", ""));
        const newIndex = parseInt(String(over.id).replace("slide-", ""));

        const newSlides = arrayMove(slides, oldIndex, newIndex).map((slide, index) => ({
          ...slide,
          number: index + 1,
        }));

        setSlides(newSlides);
        onSlidesUpdate(newSlides);

        if (currentSlide === oldIndex) {
          setCurrentSlide(newIndex);
        } else if (currentSlide > oldIndex && currentSlide <= newIndex) {
          setCurrentSlide(currentSlide - 1);
        } else if (currentSlide < oldIndex && currentSlide >= newIndex) {
          setCurrentSlide(currentSlide + 1);
        }
      }
    },
    [slides, currentSlide, setSlides, onSlidesUpdate]
  );

  const goToSlide = (index: number) => {
    if (index >= 0 && index < slides.length) {
      saveCurrentSlideEdits();
      setCurrentSlide(index);
    }
  };

  // Handle image upload for a specific slide
  const handleImageUpload = async (slideIndex: number, file: File) => {
    if (!userId || !onSlideImagesChange) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: t("carouselEditor", "invalidFile"),
        description: t("carouselEditor", "invalidFileDesc"),
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > FILE_LIMITS.MAX_IMAGE_SIZE) {
      toast({
        title: t("carouselEditor", "fileTooLarge"),
        description: t("carouselEditor", "fileTooLargeDesc"),
        variant: "destructive",
      });
      return;
    }

    setUploadingSlide(slideIndex);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/slides/${Date.now()}-slide-${slideIndex}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("slide-images")
        .upload(fileName, file, {
          cacheControl: FILE_LIMITS.CACHE_CONTROL_TTL,
          upsert: true,
        });

      if (error) throw error;

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

      // Track this slide as having changed image
      if (!changedImageIndices.includes(slideIndex)) {
        setChangedImageIndices([...changedImageIndices, slideIndex]);
      }

      toast({
        title: t("carouselEditor", "imageUploaded"),
        description: `Slide ${slideIndex + 1}`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: t("carouselEditor", "uploadError"),
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUploadingSlide(null);
    }
  };

  // Trigger file input for current slide
  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFinalize = () => {
    saveCurrentSlideEdits();
    const changedIndices = getChangedIndices();
    onFinalize(slides, changedIndices, changedImageIndices);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        if (canRedo) redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canUndo, canRedo, undo, redo]);

  const currentSlideData = slides[currentSlide];
  const isCoverSlide = currentSlide === 0;
  const currentSlideHasChanges = (() => {
    const original = originalSlides[currentSlide];
    if (!original) return false;
    return currentSlideData?.text !== original.text;
  })();

  return (
    <div className="space-y-6">
      {/* Warning banner */}
      <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-amber-600 dark:text-amber-400 font-medium">
            {t("carouselEditor", "editWarningTitle") || "Revise todos os slides"}
          </p>
          <p className="text-muted-foreground text-xs mt-0.5">
            {t("carouselEditor", "editWarningDesc") ||
              "Após finalizar, os slides editados serão regenerados e você poderá baixá-los."}
          </p>
        </div>
      </div>

      {/* Alert for slides missing images */}
      {templateNeedsImages && slidesMissingImages.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm">
          <ImageIcon className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-blue-600 dark:text-blue-400 font-medium">
              {slidesMissingImages.length} {t("carouselEditor", "slidesMissingImages")}
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">
              {t("carouselEditor", "slidesMissingImagesDesc")}
            </p>
          </div>
        </div>
      )}

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageUpload(currentSlide, file);
          e.target.value = "";
        }}
      />

      {/* Main content - Side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Slide Preview */}
        <div className="space-y-4">
          <Card className="overflow-hidden bg-muted/30">
            <CardContent className="p-4">
              <div className="relative aspect-square bg-background rounded-lg overflow-hidden shadow-lg">
                {currentSlideData?.imageUrl ? (
                  <img
                    src={currentSlideData.imageUrl}
                    alt={`Slide ${currentSlide + 1}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    {t("carouselPreview", "loading")}
                  </div>
                )}

                {/* Navigation arrows - smaller and more transparent */}
                <button
                  onClick={() => goToSlide(currentSlide - 1)}
                  disabled={currentSlide === 0}
                  className={cn(
                    "absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/50 backdrop-blur-sm flex items-center justify-center transition-all",
                    currentSlide === 0 ? "opacity-20 cursor-not-allowed" : "opacity-60 hover:opacity-100 hover:bg-background/80"
                  )}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={() => goToSlide(currentSlide + 1)}
                  disabled={currentSlide === slides.length - 1}
                  className={cn(
                    "absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/50 backdrop-blur-sm flex items-center justify-center transition-all",
                    currentSlide === slides.length - 1 ? "opacity-20 cursor-not-allowed" : "opacity-60 hover:opacity-100 hover:bg-background/80"
                  )}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Modified indicator */}
                {currentSlideHasChanges && (
                  <div className="absolute top-2 right-2 px-2 py-1 bg-amber-500/90 text-white text-xs font-medium rounded-full">
                    {t("carouselEditor", "modified") || "Editado"}
                  </div>
                )}

                {/* Regenerating overlay */}
                {isRegenerating && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-20">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-accent" />
                      <p className="text-sm font-medium">
                        {t("carouselEditor", "regeneratingSlides") || "Regenerando slides..."}
                      </p>
                      {regeneratingProgress && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {regeneratingProgress.current}/{regeneratingProgress.total}
                        </p>
                      )}
                      {onCancelRegeneration && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onCancelRegeneration}
                          className="mt-3"
                        >
                          <X className="w-4 h-4 mr-1" />
                          {t("carouselEditor", "cancelRegeneration") || "Cancelar"}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Slide info */}
              <div className="mt-3 text-center">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Slide {currentSlide + 1}</span>
                  {" "}de {slides.length}
                  {currentSlideData?.type && (
                    <span className="ml-2 text-accent">• {currentSlideData.type}</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Thumbnails */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
              <div className="flex gap-2 overflow-x-auto pb-2 justify-center">
                {slides.map((slide, index) => {
                  const original = originalSlides[index];
                  const isModified = original && slide.text !== original.text;
                  return (
                    <SortableSlide
                      key={`slide-${index}`}
                      slide={slide}
                      index={index}
                      isActive={currentSlide === index}
                      isModified={isModified}
                      onClick={() => goToSlide(index)}
                      disabled={false}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Right: Text Editor */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              {/* Header with undo/redo */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">
                    {isCoverSlide ? "Capa" : `Slide ${currentSlide + 1}`}
                  </h3>
                  {currentSlideData?.type && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {currentSlideData.type}
                    </span>
                  )}
                </div>

                {(canUndo || canRedo) && (
                  <TooltipProvider>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={undo}
                            disabled={!canUndo}
                            className="h-8 w-8"
                          >
                            <Undo2 className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Desfazer (⌘Z)</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={redo}
                            disabled={!canRedo}
                            className="h-8 w-8"
                          >
                            <Redo2 className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Refazer (⌘⇧Z)</TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                )}
              </div>

              {/* Main text */}
              {(() => {
                const limits = CHARACTER_LIMITS[format];
                const maxChars = isCoverSlide ? limits.cover : limits.content;
                const warningThreshold = Math.floor(maxChars * 0.85);
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">
                        {isCoverSlide ? "Título Principal" : "Texto do Slide"}
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        máx. {maxChars} caracteres
                      </span>
                    </div>
                    <Textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value.slice(0, maxChars))}
                      className={cn(
                        "min-h-[150px] resize-none",
                        editedText.length > warningThreshold && "border-amber-500 focus-visible:ring-amber-500"
                      )}
                      placeholder="Digite o texto..."
                      maxLength={maxChars}
                    />
                    <p className={cn(
                      "text-xs",
                      editedText.length > warningThreshold
                        ? "text-amber-500"
                        : "text-muted-foreground"
                    )}>
                      {editedText.length}/{maxChars} caracteres
                      {editedText.length > warningThreshold && (
                        <span className="ml-2">(texto pode ficar pequeno)</span>
                      )}
                    </p>
                  </div>
                );
              })()}

              {/* Image upload button - only for content slides when template needs images */}
              {templateNeedsImages && !isCoverSlide && userId && onSlideImagesChange && (
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">
                        {t("carouselEditor", "slideImage")}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {slideImages.some(img => img.slideIndex === currentSlide && img.publicUrl)
                          ? t("carouselEditor", "hasImage")
                          : t("carouselEditor", "noImage")}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={triggerImageUpload}
                      disabled={uploadingSlide === currentSlide}
                    >
                      {uploadingSlide === currentSlide ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t("carouselEditor", "uploading")}
                        </>
                      ) : slideImages.some(img => img.slideIndex === currentSlide && img.publicUrl) ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          {t("carouselEditor", "changeImage")}
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          {t("carouselEditor", "addImage")}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Changes summary */}
          {hasAnyChanges && (
            <div className="text-sm text-muted-foreground text-center">
              {hasTextChanges && `${getChangedIndices().length} slide(s) com texto editado`}
              {hasTextChanges && hasImageChanges && " • "}
              {hasImageChanges && `${changedImageIndices.length} slide(s) com imagem alterada`}
            </div>
          )}
        </div>
      </div>

      {/* Finalize button */}
      <div className="flex justify-center pt-4 border-t border-border">
        <Button
          variant="accent"
          size="lg"
          onClick={handleFinalize}
          disabled={isRegenerating}
          className="min-w-[200px]"
        >
          {isRegenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("carouselEditor", "processing")}
            </>
          ) : hasAnyChanges ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t("carouselEditor", "adjustAndFinalize")}
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              {t("carouselEditor", "finalize")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default CarouselEditView;
