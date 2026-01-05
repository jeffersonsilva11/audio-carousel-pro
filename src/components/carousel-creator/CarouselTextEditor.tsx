import { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Redo2,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2 as LoaderIcon,
  ChevronDown,
  Image,
  FileImage,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import JSZip from "jszip";
import { useTranslation } from "@/hooks/useLanguage";
import { ExportFormat, convertSvgToFormat, getFileExtension } from "@/lib/imageConverter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { useAutoSave } from "@/hooks/useAutoSave";
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

interface Slide {
  number: number;
  type: string;
  text: string;
  imageUrl?: string;
  subtitle?: string; // Only for HOOK slide (slide 1)
  highlightWord?: string; // Word to highlight in title
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
  textAlignment?: 'left' | 'center' | 'right';
  subtitlePosition?: 'above' | 'below';
  highlightColor?: string;
  showNavigationDots?: boolean;
  showNavigationArrow?: boolean;
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
  isLocked?: boolean;
  onFirstExport?: () => Promise<void>;
}

const CarouselTextEditor = ({
  slides: initialSlides,
  onSlidesUpdate,
  isPro = false,
  carouselId,
  style = 'BLACK_WHITE',
  format = 'POST_SQUARE',
  profile,
  customization,
  isLocked = false,
  onFirstExport
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
  const [editedSubtitle, setEditedSubtitle] = useState("");
  const [editedHighlightWord, setEditedHighlightWord] = useState("");
  const [originalSlides] = useState<Slide[]>(initialSlides);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
  const { toast } = useToast();

  // Auto-save with debounce (3 seconds)
  const handleAutoSave = useCallback(async (slidesToSave: Slide[]) => {
    if (!carouselId || !isPro) return;
    
    try {
      // Update carousel script in database
      const scriptData = JSON.parse(JSON.stringify({ slides: slidesToSave }));
      await supabase
        .from("carousels")
        .update({ 
          script: scriptData,
          updated_at: new Date().toISOString()
        })
        .eq("id", carouselId);
      
      console.log("Auto-saved slides");
    } catch (error) {
      console.error("Auto-save error:", error);
    }
  }, [carouselId, isPro]);

  const { saveNow, hasUnsavedChanges, saveStatus } = useAutoSave(slides, handleAutoSave, {
    debounceMs: 3000,
    enabled: isPro && !!carouselId,
  });

  // Sync with parent when slides change
  useEffect(() => {
    onSlidesUpdate(slides);
  }, [slides, onSlidesUpdate]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sortable items IDs
  const sortableIds = useMemo(() => slides.map((_, i) => `slide-${i}`), [slides]);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = parseInt(String(active.id).replace("slide-", ""));
      const newIndex = parseInt(String(over.id).replace("slide-", ""));

      const newSlides = arrayMove(slides, oldIndex, newIndex).map((slide, index) => ({
        ...slide,
        number: index + 1,
      }));

      setSlides(newSlides);
      
      // Update current slide if needed
      if (currentSlide === oldIndex) {
        setCurrentSlide(newIndex);
      } else if (currentSlide > oldIndex && currentSlide <= newIndex) {
        setCurrentSlide(currentSlide - 1);
      } else if (currentSlide < oldIndex && currentSlide >= newIndex) {
        setCurrentSlide(currentSlide + 1);
      }

      toast({
        title: t("carouselEditor", "slidesReordered"),
      });
    }
  }, [slides, currentSlide, setSlides, toast, t]);

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
    // For cover slide (index 0), also set subtitle and highlight
    if (slideIndex === 0) {
      setEditedSubtitle(slides[slideIndex].subtitle || "");
      setEditedHighlightWord(slides[slideIndex].highlightWord || "");
    }
  };

  const saveEdit = useCallback(() => {
    if (editingSlide === null) return;

    const updatedSlides = slides.map((slide, index) => {
      if (index !== editingSlide) return slide;

      // For cover slide, also update subtitle and highlightWord
      if (index === 0) {
        return {
          ...slide,
          text: editedText,
          subtitle: editedSubtitle || undefined,
          highlightWord: editedHighlightWord || undefined,
        };
      }
      return { ...slide, text: editedText };
    });

    setSlides(updatedSlides);
    setEditingSlide(null);
    setEditedText("");
    setEditedSubtitle("");
    setEditedHighlightWord("");

    toast({
      title: t("carouselEditor", "textUpdated"),
      description: t("carouselEditor", "regenerateHint"),
    });
  }, [editingSlide, editedText, editedSubtitle, editedHighlightWord, slides, setSlides, toast, t]);

  const cancelEdit = () => {
    setEditingSlide(null);
    setEditedText("");
    setEditedSubtitle("");
    setEditedHighlightWord("");
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

  const downloadSlide = async (slide: Slide, format: ExportFormat = exportFormat) => {
    try {
      if (slide.imageUrl) {
        const blob = await convertSvgToFormat(slide.imageUrl, { format });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `slide-${slide.number}.${getFileExtension(format)}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      // Mark as exported on first download (locks editing)
      if (onFirstExport && !isLocked) {
        await onFirstExport();
      }

      toast({
        title: t("carouselPreview", "downloadStarted"),
        description: t("carouselPreview", "slideDownloaded").replace("{number}", String(slide.number)),
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: t("carouselPreview", "downloadError"),
        description: t("carouselPreview", "couldNotDownload"),
        variant: "destructive",
      });
    }
  };

  const downloadAsZip = async (format: ExportFormat = exportFormat) => {
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
            const blob = await convertSvgToFormat(slide.imageUrl, { format });
            folder.file(`slide-${slide.number}.${getFileExtension(format)}`, blob);
          } catch (err) {
            console.error(`Error converting slide ${slide.number}:`, err);
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

      // Mark as exported on first download (locks editing)
      if (onFirstExport && !isLocked) {
        await onFirstExport();
      }

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
      {/* Watermark notice - only shown when not locked */}
      {isPro && !isLocked && (
        <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-600 dark:text-blue-400 font-medium">
              {t("carouselEditor", "watermarkNotice") || "Marca d'água de proteção"}
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">
              {t("carouselEditor", "watermarkNoticeDesc") || "A marca d'água \"Feito com Audissel\" aparece apenas no modo de edição. Após finalizar, os slides exportados não terão marca d'água."}
            </p>
          </div>
        </div>
      )}

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

            {/* Watermark Overlay - Only in edit mode and not locked */}
            {isPro && !isLocked && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Multiple diagonal watermarks */}
                <div className="absolute inset-0 flex flex-col items-center justify-center -rotate-45 scale-150">
                  {[-200, -100, 0, 100, 200].map((offset) => (
                    <div
                      key={offset}
                      className="whitespace-nowrap text-foreground/[0.06] text-base font-bold tracking-wider select-none"
                      style={{ transform: `translateY(${offset}px)` }}
                    >
                      Feito com Audissel • Feito com Audissel • Feito com Audissel • Feito com Audissel
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Click to edit overlay - Pro only, not locked, not editing */}
            {isPro && !isLocked && editingSlide === null && (
              <div
                onClick={() => startEdit(currentSlide)}
                className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-all cursor-pointer group"
              >
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium">
                    {t("carouselEditor", "clickToEdit") || "Clique para editar"}
                  </span>
                </div>
              </div>
            )}

            {/* Navigation arrows */}
            <button
              onClick={(e) => { e.stopPropagation(); goToSlide(currentSlide - 1); }}
              disabled={currentSlide === 0}
              className={cn(
                "absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center transition-opacity z-10",
                currentSlide === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-background"
              )}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); goToSlide(currentSlide + 1); }}
              disabled={currentSlide === slides.length - 1}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center transition-opacity z-10",
                currentSlide === slides.length - 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-background"
              )}
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Locked indicator */}
            {isLocked && (
              <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-green-500/90 backdrop-blur text-white text-xs font-medium flex items-center gap-1 z-10">
                <CheckCircle className="w-3 h-3" />
                {t("carouselEditor", "finalized") || "Finalizado"}
              </div>
            )}

            {/* Regenerating overlay */}
            {isRegenerating && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-20">
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

      {/* Thumbnail navigation with drag and drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-2 overflow-x-auto pb-2 justify-center px-4">
            {slides.map((slide, index) => {
              const isModified = slide.text !== originalSlides[index]?.text;
              return (
                <SortableSlide
                  key={`slide-${index}`}
                  slide={slide}
                  index={index}
                  isActive={currentSlide === index}
                  isModified={isModified}
                  onClick={() => goToSlide(index)}
                  disabled={!isPro}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Auto-save indicator with status */}
      {isPro && (saveStatus !== "idle" || hasUnsavedChanges()) && (
        <div className={cn(
          "flex items-center justify-center gap-2 text-xs py-2 px-4 rounded-full mx-auto w-fit transition-all",
          saveStatus === "saving" && "bg-muted text-muted-foreground",
          saveStatus === "saved" && "bg-green-500/10 text-green-600 dark:text-green-400",
          saveStatus === "error" && "bg-destructive/10 text-destructive",
          saveStatus === "idle" && hasUnsavedChanges() && "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        )}>
          {saveStatus === "saving" && (
            <>
              <LoaderIcon className="w-3 h-3 animate-spin" />
              {t("carouselEditor", "autoSaving")}
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <CheckCircle className="w-3 h-3" />
              {t("carouselEditor", "saved")}
            </>
          )}
          {saveStatus === "error" && (
            <>
              <AlertCircle className="w-3 h-3" />
              {t("carouselEditor", "saveError")}
            </>
          )}
          {saveStatus === "idle" && hasUnsavedChanges() && (
            <>
              <Save className="w-3 h-3" />
              {t("carouselEditor", "unsavedChanges")}
            </>
          )}
        </div>
      )}

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
            
            {isPro && editingSlide === null && !isLocked && (
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
            <div className="space-y-4">
              {/* Cover slide specific fields */}
              {currentSlide === 0 && (
                <div className="space-y-3 p-3 bg-muted/50 rounded-lg border border-border/50">
                  <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Opções da Capa
                  </h5>

                  <div className="space-y-2">
                    <Label htmlFor="subtitle" className="text-sm">
                      Subtítulo
                      <span className="text-xs text-muted-foreground ml-1">(opcional)</span>
                    </Label>
                    <Input
                      id="subtitle"
                      value={editedSubtitle}
                      onChange={(e) => setEditedSubtitle(e.target.value)}
                      placeholder="Ex: O segredo que ninguém te contou..."
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Aparece acima ou abaixo do título principal
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="highlightWord" className="text-sm">
                      Palavra em Destaque
                      <span className="text-xs text-muted-foreground ml-1">(opcional)</span>
                    </Label>
                    <Input
                      id="highlightWord"
                      value={editedHighlightWord}
                      onChange={(e) => setEditedHighlightWord(e.target.value)}
                      placeholder="Ex: segredo"
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Uma palavra do título que será destacada com cor de fundo
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm">
                  {currentSlide === 0 ? "Título Principal" : "Texto do Slide"}
                </Label>
                <Textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="min-h-[120px] resize-none"
                  placeholder={t("carouselEditor", "enterText")}
                />
              </div>

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
            <div className="space-y-2">
              {/* Show subtitle for cover slide */}
              {currentSlide === 0 && currentSlideData?.subtitle && (
                <p className="text-sm text-muted-foreground italic">
                  Subtítulo: {currentSlideData.subtitle}
                </p>
              )}
              <p className="text-foreground whitespace-pre-wrap">{currentSlideData?.text}</p>
              {/* Show highlight word for cover slide */}
              {currentSlide === 0 && currentSlideData?.highlightWord && (
                <p className="text-xs text-muted-foreground">
                  Destaque: <span className="bg-accent/20 text-accent px-1 rounded">{currentSlideData.highlightWord}</span>
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Regenerate Button - hidden when locked */}
      {isPro && hasChanges && editingSlide === null && !isLocked && (
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

      {/* Export Format Selector */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-sm text-muted-foreground">Formato:</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="min-w-[100px] justify-between">
              <span className="flex items-center gap-2">
                {exportFormat === 'svg' && <FileImage className="w-4 h-4" />}
                {exportFormat === 'png' && <Image className="w-4 h-4" />}
                {exportFormat === 'jpg' && <Image className="w-4 h-4" />}
                {exportFormat.toUpperCase()}
              </span>
              <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            <DropdownMenuItem onClick={() => setExportFormat('png')} className="cursor-pointer">
              <Image className="w-4 h-4 mr-2" />
              PNG
              <span className="ml-2 text-xs text-muted-foreground">(Recomendado)</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setExportFormat('jpg')} className="cursor-pointer">
              <Image className="w-4 h-4 mr-2" />
              JPG
              <span className="ml-2 text-xs text-muted-foreground">(Menor tamanho)</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setExportFormat('svg')} className="cursor-pointer">
              <FileImage className="w-4 h-4 mr-2" />
              SVG
              <span className="ml-2 text-xs text-muted-foreground">(Vetorial)</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {isPro ? (
          <Button
            variant="accent"
            size="lg"
            onClick={() => downloadAsZip()}
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
