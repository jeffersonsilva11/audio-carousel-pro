import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  FolderArchive, 
  Loader2, 
  Edit2, 
  Check, 
  X, 
  RotateCcw,
  Wand2,
  Undo2,
  Redo2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import JSZip from "jszip";
import { useTranslation } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Slide {
  number: number;
  type: string;
  text: string;
  imageUrl?: string;
}

interface ProfileIdentity {
  name: string;
  username: string;
  photoUrl: string | null;
  avatarPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  displayMode: 'name_only' | 'username_only' | 'name_and_username';
}

interface TemplateCustomization {
  fontId: string;
  gradientId: string;
  customGradientColors?: string[];
  slideImages?: (string | null)[];
}

interface CarouselTextEditorProps {
  slides: Slide[];
  onSlidesUpdate: (slides: Slide[]) => void;
  isPro?: boolean;
  carouselId?: string;
  style?: string;
  format?: string;
  profile?: ProfileIdentity;
  customization?: TemplateCustomization;
}

const CarouselTextEditor = ({ 
  slides: initialSlides, 
  onSlidesUpdate, 
  isPro = false,
  carouselId,
  style = 'BLACK_WHITE',
  format = 'POST_SQUARE',
  profile,
  customization
}: CarouselTextEditorProps) => {
  const { t } = useTranslation();
  
  // Undo/Redo hook for slides
  const {
    state: slides,
    setState: setSlides,
    undo,
    redo,
    canUndo,
    canRedo,
    reset: resetHistory,
  } = useUndoRedo<Slide[]>(initialSlides);
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [editingSlide, setEditingSlide] = useState<number | null>(null);
  const [editedText, setEditedText] = useState("");
  const [originalSlides] = useState<Slide[]>(initialSlides);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { toast } = useToast();

  // Sync with parent when slides change
  useEffect(() => {
    onSlidesUpdate(slides);
  }, [slides, onSlidesUpdate]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPro) return;
      
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        if (canRedo) redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPro, canUndo, canRedo, undo, redo]);

  const goToSlide = (index: number) => {
    if (index >= 0 && index < slides.length) {
      if (editingSlide !== null) {
        cancelEdit();
      }
      setCurrentSlide(index);
    }
  };

  const startEdit = (slideIndex: number) => {
    if (!isPro) {
      toast({
        title: t("carouselEditor", "proFeature"),
        description: t("carouselEditor", "editProOnly"),
        variant: "destructive",
      });
      return;
    }
    setEditingSlide(slideIndex);
    setEditedText(slides[slideIndex].text);
  };

  const saveEdit = useCallback(() => {
    if (editingSlide === null) return;
    
    const updatedSlides = slides.map((slide, index) => 
      index === editingSlide ? { ...slide, text: editedText } : slide
    );
    setSlides(updatedSlides);
    setEditingSlide(null);
    setEditedText("");
    
    toast({
      title: t("carouselEditor", "textUpdated"),
      description: t("carouselEditor", "regenerateHint"),
    });
  }, [editingSlide, editedText, slides, setSlides, toast, t]);

  const cancelEdit = () => {
    setEditingSlide(null);
    setEditedText("");
  };

  const resetSlide = (slideIndex: number) => {
    const updatedSlides = slides.map((slide, index) => 
      index === slideIndex ? { ...slide, text: originalSlides[slideIndex].text } : slide
    );
    setSlides(updatedSlides);
    toast({
      title: t("carouselEditor", "slideReset"),
      description: t("carouselEditor", "textRestored"),
    });
  };

  const handleUndo = () => {
    undo();
    toast({
      title: t("carouselEditor", "undoApplied"),
    });
  };

  const handleRedo = () => {
    redo();
    toast({
      title: t("carouselEditor", "redoApplied"),
    });
  };

  const regenerateSlide = async (slideIndex: number) => {
    if (!isPro || !carouselId) {
      toast({
        title: t("carouselEditor", "proFeature"),
        description: t("carouselEditor", "regenerateProOnly"),
        variant: "destructive",
      });
      return;
    }

    setIsRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-carousel-images",
        {
          body: {
            script: { slides: [slides[slideIndex]] },
            style,
            format,
            carouselId,
            userId: (await supabase.auth.getUser()).data.user?.id,
            hasWatermark: false,
            regenerateSingle: true,
            slideIndex,
            totalSlides: slides.length,
            // Preserve profile and customization settings
            profile,
            customization
          }
        }
      );

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Regeneration failed");
      }

      const newImageUrl = data.slides?.[0]?.imageUrl;
      if (newImageUrl) {
        const updatedSlides = slides.map((slide, index) => 
          index === slideIndex ? { ...slide, imageUrl: newImageUrl } : slide
        );
        setSlides(updatedSlides);
        onSlidesUpdate(updatedSlides);
        
        toast({
          title: t("carouselEditor", "slideRegenerated"),
          description: t("carouselEditor", "imageUpdated"),
        });
      }
    } catch (error) {
      console.error("Regeneration error:", error);
      toast({
        title: t("carouselEditor", "regenerateError"),
        description: t("carouselEditor", "tryAgain"),
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const downloadSlide = async (slide: Slide) => {
    try {
      if (slide.imageUrl) {
        const response = await fetch(slide.imageUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `slide-${slide.number}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      toast({
        title: t("carouselPreview", "downloadStarted"),
        description: t("carouselPreview", "slideDownloaded").replace("{number}", String(slide.number)),
      });
    } catch (error) {
      toast({
        title: t("carouselPreview", "downloadError"),
        description: t("carouselPreview", "couldNotDownload"),
        variant: "destructive",
      });
    }
  };

  const downloadAsZip = async () => {
    if (!isPro) {
      toast({
        title: t("carouselPreview", "proFeature"),
        description: t("carouselPreview", "zipProOnly"),
        variant: "destructive",
      });
      return;
    }

    setIsDownloadingZip(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("carrossel");

      if (!folder) throw new Error("Could not create folder");

      for (const slide of slides) {
        if (slide.imageUrl) {
          try {
            const response = await fetch(slide.imageUrl);
            const blob = await response.blob();
            folder.file(`slide-${slide.number}.svg`, blob);
          } catch (err) {
            console.error(`Error fetching slide ${slide.number}:`, err);
          }
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "carrossel.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: t("carouselPreview", "downloadComplete"),
        description: t("carouselPreview", "zipDownloaded").replace("{count}", String(slides.length)),
      });
    } catch (error) {
      console.error("ZIP download error:", error);
      toast({
        title: t("carouselPreview", "downloadError"),
        description: t("carouselPreview", "couldNotCreateZip"),
        variant: "destructive",
      });
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const currentSlideData = slides[currentSlide];
  const hasChanges = slides[currentSlide]?.text !== originalSlides[currentSlide]?.text;

  return (
    <div className="space-y-6">
      {/* Main preview */}
      <Card className="overflow-hidden bg-muted/30">
        <CardContent className="p-4 md:p-6">
          <div className="relative aspect-square max-w-md mx-auto bg-background rounded-lg overflow-hidden shadow-lg">
            {currentSlideData?.imageUrl ? (
              <img
                src={currentSlideData.imageUrl}
                alt={`${t("carouselPreview", "slide")} ${currentSlide + 1}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                {t("carouselPreview", "loading")}
              </div>
            )}
            
            {/* Navigation arrows */}
            <button
              onClick={() => goToSlide(currentSlide - 1)}
              disabled={currentSlide === 0}
              className={cn(
                "absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center transition-opacity",
                currentSlide === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-background"
              )}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => goToSlide(currentSlide + 1)}
              disabled={currentSlide === slides.length - 1}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center transition-opacity",
                currentSlide === slides.length - 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-background"
              )}
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Edit button overlay */}
            {isPro && editingSlide === null && (
              <button
                onClick={() => startEdit(currentSlide)}
                className="absolute top-3 right-3 p-2 rounded-full bg-background/80 backdrop-blur hover:bg-background transition-colors"
                title={t("carouselEditor", "editText")}
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}

            {/* Regenerating overlay */}
            {isRegenerating && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-accent" />
                  <p className="text-sm">{t("carouselEditor", "regenerating")}</p>
                </div>
              </div>
            )}
          </div>

          {/* Slide info */}
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{t("carouselPreview", "slide")} {currentSlide + 1}</span>
              {" "}{t("carouselPreview", "of")} {slides.length}
              {currentSlideData?.type && (
                <span className="ml-2 text-accent">• {currentSlideData.type}</span>
              )}
              {hasChanges && (
                <span className="ml-2 text-amber-500">• {t("carouselEditor", "modified")}</span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Thumbnail navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 justify-center">
        {slides.map((slide, index) => {
          const isModified = slide.text !== originalSlides[index]?.text;
          return (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                currentSlide === index
                  ? "border-accent ring-2 ring-accent/20"
                  : "border-transparent hover:border-muted-foreground/30"
              )}
            >
              {slide.imageUrl ? (
                <img
                  src={slide.imageUrl}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  {index + 1}
                </div>
              )}
              {currentSlide === index && (
                <div className="absolute inset-0 bg-accent/10" />
              )}
              {isModified && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Text Editor Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                {t("carouselEditor", "slideText").replace("{number}", String(currentSlide + 1))}
              </h4>
              
              {/* Undo/Redo buttons */}
              {isPro && (canUndo || canRedo) && (
                <TooltipProvider>
                  <div className="flex items-center gap-1 ml-2 border-l border-border pl-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleUndo}
                          disabled={!canUndo}
                          className="h-7 w-7"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>{t("carouselEditor", "undo")} <kbd className="ml-1 text-xs bg-muted px-1 rounded">⌘Z</kbd></p>
                      </TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleRedo}
                          disabled={!canRedo}
                          className="h-7 w-7"
                        >
                          <Redo2 className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>{t("carouselEditor", "redo")} <kbd className="ml-1 text-xs bg-muted px-1 rounded">⌘⇧Z</kbd></p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              )}
            </div>
            
            {isPro && editingSlide === null && (
              <div className="flex gap-2">
                {hasChanges && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => resetSlide(currentSlide)}
                    className="h-8"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    {t("carouselEditor", "reset")}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEdit(currentSlide)}
                  className="h-8"
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  {t("carouselEditor", "edit")}
                </Button>
              </div>
            )}
          </div>
          
          {editingSlide === currentSlide ? (
            <div className="space-y-3">
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="min-h-[120px] resize-none"
                placeholder={t("carouselEditor", "enterText")}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={cancelEdit}>
                  <X className="w-4 h-4 mr-1" />
                  {t("common", "cancel")}
                </Button>
                <Button variant="accent" size="sm" onClick={saveEdit}>
                  <Check className="w-4 h-4 mr-1" />
                  {t("common", "save")}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-foreground whitespace-pre-wrap">{currentSlideData?.text}</p>
          )}
        </CardContent>
      </Card>

      {/* Regenerate Button */}
      {isPro && hasChanges && editingSlide === null && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => regenerateSlide(currentSlide)}
            disabled={isRegenerating}
            className="gap-2"
          >
            {isRegenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
            {t("carouselEditor", "regenerateImage")}
          </Button>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {isPro ? (
          <Button 
            variant="accent" 
            size="lg" 
            onClick={downloadAsZip}
            disabled={isDownloadingZip}
            className="flex-1 sm:flex-initial"
          >
            {isDownloadingZip ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FolderArchive className="w-4 h-4 mr-2" />
            )}
            {isDownloadingZip ? t("carouselPreview", "creatingZip") : t("carouselPreview", "downloadZip").replace("{count}", String(slides.length))}
          </Button>
        ) : (
          <Button 
            variant="accent" 
            size="lg" 
            className="flex-1 sm:flex-initial"
          >
            <Download className="w-4 h-4 mr-2" />
            {t("carouselPreview", "downloadAll").replace("{count}", String(slides.length))}
          </Button>
        )}
        <Button 
          variant="outline" 
          size="lg"
          onClick={() => downloadSlide(currentSlideData)}
          className="flex-1 sm:flex-initial"
        >
          <Download className="w-4 h-4 mr-2" />
          {t("carouselPreview", "downloadCurrent")}
        </Button>
      </div>
    </div>
  );
};

export default CarouselTextEditor;
