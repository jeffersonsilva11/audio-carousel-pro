import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useTranslation, useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Clock,
  Copy,
  Crown,
  Download,
  FileArchive,
  FileImage,
  FileText,
  Image as ImageIcon,
  Loader2,
  Mic,
  Mic2,
  RefreshCw,
  Share2,
  Trash2,
  Type
} from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { formatLocalizedDate, formatDuration, formatInteger, formatFileSize, formatRelativeTime, formatDaysRemaining, getDaysRemainingUrgency } from "@/lib/localization";
import { ExportFormat, convertSvgToFormat, getFileExtension } from "@/lib/imageConverter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CarouselDetailSkeleton from "@/components/skeletons/CarouselDetailSkeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface SlideScript {
  number: number;
  type: string;
  text: string;
  emoji?: string;
}

interface CarouselScript {
  slides: SlideScript[];
  title?: string;
}

interface CarouselData {
  id: string;
  tone: string;
  style: string;
  format: string;
  status: string;
  slide_count: number;
  image_urls: string[] | null;
  created_at: string;
  updated_at: string;
  has_watermark: boolean | null;
  transcription: string | null;
  processing_time: number | null;
  audio_duration: number | null;
  audio_size: number | null;
  script: CarouselScript | null;
  language: string | null;
  images_cleaned_at: string | null;
  // Template fields (Creator+ only)
  cover_template: string | null;
  content_template: string | null;
  template_config: Record<string, unknown> | null;
}

const CarouselDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const { isPro, createCheckout } = useSubscription();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [carousel, setCarousel] = useState<CarouselData | null>(null);
  const [loadingCarousel, setLoadingCarousel] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("png");


  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchCarousel();
    }
  }, [user, id]);

  const fetchCarousel = async () => {
    try {
      const { data, error } = await supabase
        .from("carousels")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error(t("carouselDetail", "carouselNotFound"));
        navigate("/dashboard");
        return;
      }
      setCarousel(data);
    } catch (error) {
      console.error("Error fetching carousel:", error);
      toast.error(t("carouselDetail", "loadError"));
      navigate("/dashboard");
    } finally {
      setLoadingCarousel(false);
    }
  };

  const handleRegenerateWithoutWatermark = async () => {
    if (!user || !isPro || !carousel) return;

    setRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("regenerate-without-watermark", {
        body: { carouselId: carousel.id, userId: user.id }
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || t("common", "errorUnexpected"));
      }

      toast.success(t("carouselDetail", "watermarkRemoved"));
      await fetchCarousel();
    } catch (error) {
      console.error("Regeneration error:", error);
      toast.error(t("carouselDetail", "watermarkError"));
    } finally {
      setRegenerating(false);
    }
  };

  const handleDownloadSingle = async (url: string, index: number) => {
    try {
      const blob = await convertSvgToFormat(url, { format: exportFormat });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `slide-${index + 1}.${getFileExtension(exportFormat)}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Download error:", error);
      toast.error(t("carouselDetail", "downloadError"));
    }
  };

  const handleDownloadAll = async () => {
    if (!carousel?.image_urls || carousel.image_urls.length === 0) return;

    setDownloading(true);
    try {
      const zip = new JSZip();

      await Promise.all(
        carousel.image_urls.map(async (url, index) => {
          try {
            const blob = await convertSvgToFormat(url, { format: exportFormat });
            zip.file(`slide-${index + 1}.${getFileExtension(exportFormat)}`, blob);
          } catch (err) {
            console.error(`Error converting slide ${index + 1}:`, err);
          }
        })
      );

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `carousel-${carousel.id.slice(0, 8)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast.success(t("carouselDetail", "downloadStarted"));
    } catch (error) {
      console.error("ZIP download error:", error);
      toast.error(t("carouselDetail", "zipError"));
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!carousel) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("carousels")
        .delete()
        .eq("id", carousel.id);

      if (error) throw error;

      toast.success(t("carouselDetail", "carouselDeleted"));
      navigate("/dashboard");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(t("carouselDetail", "deleteError"));
    } finally {
      setDeleting(false);
    }
  };

  const handleShare = async () => {
    if (!carousel?.image_urls?.[0]) return;

    try {
      await navigator.clipboard.writeText(carousel.image_urls[0]);
      toast.success(t("carouselDetail", "linkCopied"));
    } catch {
      toast.error(t("carouselDetail", "copyError"));
    }
  };

  const handleCopyTranscription = async () => {
    if (!carousel?.transcription) return;

    try {
      await navigator.clipboard.writeText(carousel.transcription);
      toast.success(t("carouselDetail", "transcriptionCopied"));
    } catch {
      toast.error(t("carouselDetail", "copyError"));
    }
  };

  const getWordCount = (text: string | null): number => {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const getSlideTypeLabel = (type: string): string => {
    const types: Record<string, string> = {
      cover: t("carouselDetail", "slideCover"),
      content: t("carouselDetail", "slideContent"),
      cta: t("carouselDetail", "slideCta"),
    };
    return types[type] || type;
  };

  const getToneLabel = (tone: string) => {
    const tones: Record<string, string> = {
      EMOTIONAL: t("toneShowcase", "emotional"),
      PROFESSIONAL: t("toneShowcase", "professional"),
      PROVOCATIVE: t("toneShowcase", "provocative")
    };
    return tones[tone] || tone;
  };

  const getStyleLabel = (style: string) => {
    const styles: Record<string, string> = {
      BLACK_WHITE: t("carouselDetail", "blackWhite"),
      GRADIENT: t("carouselDetail", "gradient"),
      COLORFUL: t("carouselDetail", "colorful")
    };
    return styles[style] || style;
  };

  const getFormatLabel = (format: string) => {
    const formats: Record<string, string> = {
      POST_SQUARE: t("carouselDetail", "squarePost"),
      STORY_VERTICAL: t("carouselDetail", "storyVertical"),
      REELS_VERTICAL: t("carouselDetail", "reelsVertical")
    };
    return formats[format] || format;
  };

  const getStatusLabel = (status: string) => {
    if (status === "COMPLETED") return t("carouselDetail", "ready");
    if (status === "PROCESSING") return t("carouselDetail", "processing");
    return t("carouselDetail", "errorStatus");
  };

  if (loading || loadingCarousel) {
    return <CarouselDetailSkeleton />;
  }

  if (!carousel) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("carouselDetail", "back")}
              </Button>
              <div className="h-6 w-px bg-border hidden sm:block" />
              <a href="/" className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Mic2 className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-sm">Audisell</span>
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t("carouselDetail", "delete")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("carouselDetail", "deleteCarousel")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("carouselDetail", "deleteConfirmation")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common", "cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("carouselDetail", "delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Carousel Preview */}
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                {carousel.image_urls && carousel.image_urls.length > 0 ? (
                  <div className="relative">
                    <Carousel className="w-full" opts={{ loop: true }}>
                      <CarouselContent>
                        {carousel.image_urls.map((url, index) => (
                          <CarouselItem key={index}>
                            <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                              <img
                                src={url}
                                alt={`Slide ${index + 1}`}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious className="left-2" />
                      <CarouselNext className="right-2" />
                    </Carousel>
                    <div className="text-center mt-4 text-sm text-muted-foreground">
                      {carousel.image_urls.length} {t("carouselDetail", "slides")}
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                    <div className="text-center">
                      <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {carousel.status === "PROCESSING" ? t("carouselDetail", "processingStatus") : t("carouselDetail", "noImages")}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Thumbnails */}
            {carousel.image_urls && carousel.image_urls.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {carousel.image_urls.map((url, index) => (
                  <button
                    key={index}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      currentSlide === index ? "border-accent" : "border-transparent hover:border-accent/50"
                    }`}
                    onClick={() => setCurrentSlide(index)}
                    title={`${t("carouselDetail", "goToSlide")} ${index + 1}`}
                  >
                    <img
                      src={url}
                      alt={`Thumb ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details & Actions */}
          <div className="space-y-6">
            {/* Title & Status */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{getToneLabel(carousel.tone)}</h1>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  carousel.status === "COMPLETED" ? "bg-green-500/10 text-green-500" :
                  carousel.status === "PROCESSING" ? "bg-yellow-500/10 text-yellow-500" :
                  "bg-red-500/10 text-red-500"
                }`}>
                  {getStatusLabel(carousel.status)}
                </span>
                {carousel.has_watermark && (
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-500">
                    Watermark
                  </span>
                )}
              </div>
              <p className="text-muted-foreground">
                {getStyleLabel(carousel.style)} • {getFormatLabel(carousel.format)} • {formatInteger(carousel.slide_count, language)} {t("carouselDetail", "slides")}
              </p>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="flex items-center gap-3 p-3">
                  <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{t("carouselDetail", "createdAt")}</p>
                    <p className="text-sm font-medium truncate" title={formatLocalizedDate(carousel.created_at, language, "withTime")}>
                      {formatRelativeTime(carousel.created_at, language)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              {carousel.processing_time != null && carousel.processing_time > 0 && (
                <Card>
                  <CardContent className="flex items-center gap-3 p-3">
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t("carouselDetail", "processingTime")}</p>
                      <p className="text-sm font-medium">
                        {formatDuration(carousel.processing_time, language)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {carousel.audio_duration != null && carousel.audio_duration > 0 && (
                <Card>
                  <CardContent className="flex items-center gap-3 p-3">
                    <Mic className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t("carouselDetail", "audioDuration")}</p>
                      <p className="text-sm font-medium">
                        {formatDuration(carousel.audio_duration, language)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {carousel.transcription && (
                <Card>
                  <CardContent className="flex items-center gap-3 p-3">
                    <Type className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t("carouselDetail", "wordCount")}</p>
                      <p className="text-sm font-medium">
                        {formatInteger(getWordCount(carousel.transcription), language)} {t("carouselDetail", "words")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Images expiration status */}
            {carousel.images_cleaned_at ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm">
                <ImageIcon className="w-4 h-4 flex-shrink-0" />
                <span>{t("carouselDetail", "imagesExpired")}</span>
              </div>
            ) : carousel.status === "COMPLETED" && carousel.image_urls && carousel.image_urls.length > 0 && (
              (() => {
                const urgency = getDaysRemainingUrgency(carousel.created_at);
                const urgencyStyles = {
                  critical: "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400",
                  warning: "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400",
                  normal: "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400",
                  expired: "bg-gray-500/10 border-gray-500/20 text-gray-700 dark:text-gray-400"
                };
                return (
                  <div className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${urgencyStyles[urgency]}`}>
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span>{formatDaysRemaining(carousel.created_at, language)}</span>
                  </div>
                );
              })()
            )}

            {/* Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("carouselDetail", "actions")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Export Format Selector */}
                {carousel.status === "COMPLETED" && carousel.image_urls && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm text-muted-foreground">{t("carouselDetail", "exportFormat") || "Formato:"}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="min-w-[120px] justify-between">
                          <span className="flex items-center gap-2">
                            {exportFormat === "svg" && <FileImage className="w-4 h-4" />}
                            {exportFormat === "png" && <ImageIcon className="w-4 h-4" />}
                            {exportFormat === "jpg" && <ImageIcon className="w-4 h-4" />}
                            {exportFormat.toUpperCase()}
                          </span>
                          <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setExportFormat("png")} className="cursor-pointer">
                          <ImageIcon className="w-4 h-4 mr-2" />
                          PNG
                          <span className="ml-2 text-xs text-muted-foreground">(Recomendado)</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setExportFormat("jpg")} className="cursor-pointer">
                          <ImageIcon className="w-4 h-4 mr-2" />
                          JPG
                          <span className="ml-2 text-xs text-muted-foreground">(Menor tamanho)</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setExportFormat("svg")} className="cursor-pointer">
                          <FileImage className="w-4 h-4 mr-2" />
                          SVG
                          <span className="ml-2 text-xs text-muted-foreground">(Vetorial)</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                {/* Download All */}
                {carousel.status === "COMPLETED" && carousel.image_urls && (
                  <>
                    {isPro ? (
                      <Button 
                        variant="accent" 
                        className="w-full" 
                        onClick={handleDownloadAll}
                        disabled={downloading}
                      >
                        {downloading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <FileArchive className="w-4 h-4 mr-2" />
                        )}
                        {t("carouselDetail", "downloadAllZip")}
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => carousel.image_urls && handleDownloadSingle(carousel.image_urls[0], 0)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {t("carouselDetail", "downloadFirst")}
                      </Button>
                    )}
                  </>
                )}

                {/* Remove Watermark */}
                {carousel.has_watermark && carousel.status === "COMPLETED" && (
                  isPro ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleRegenerateWithoutWatermark}
                      disabled={regenerating}
                    >
                      {regenerating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      {t("carouselDetail", "removeWatermark")}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full text-accent border-accent/30 hover:bg-accent/10"
                      onClick={() => createCheckout()}
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      {t("carouselDetail", "upgradeProWatermark")}
                    </Button>
                  )
                )}

                {/* Upgrade for ZIP */}
                {!isPro && carousel.status === "COMPLETED" && (
                  <div className="text-center p-4 rounded-lg bg-accent/5 border border-accent/20">
                    <Crown className="w-6 h-6 text-accent mx-auto mb-2" />
                    <p className="text-sm font-medium mb-1">{t("carouselDetail", "subscribeProFeatures")}</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      {t("carouselDetail", "proFeaturesDesc")}
                    </p>
                    <Button variant="accent" size="sm" onClick={() => createCheckout()}>
                      {t("carouselDetail", "subscribePro")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Script & Transcription Tabs */}
            {(carousel.script || carousel.transcription) && (
              <Card>
                <Tabs defaultValue={carousel.script ? "script" : "transcription"}>
                  <CardHeader className="pb-0">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="script" disabled={!carousel.script}>
                        <FileText className="w-4 h-4 mr-2" />
                        {t("carouselDetail", "scriptContent")}
                      </TabsTrigger>
                      <TabsTrigger value="transcription" disabled={!carousel.transcription}>
                        <Mic className="w-4 h-4 mr-2" />
                        {t("carouselDetail", "transcription")}
                      </TabsTrigger>
                    </TabsList>
                  </CardHeader>

                  <CardContent className="pt-4">
                    {/* Script Tab */}
                    <TabsContent value="script" className="mt-0 space-y-3">
                      {carousel.script?.slides?.map((slide, index) => (
                        <div
                          key={index}
                          className="p-3 rounded-lg bg-muted/50 border border-border/50"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {slide.number}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {getSlideTypeLabel(slide.type)}
                            </Badge>
                            {slide.emoji && (
                              <span className="text-sm">{slide.emoji}</span>
                            )}
                          </div>
                          <p className="text-sm">{slide.text}</p>
                        </div>
                      ))}
                      {!carousel.script?.slides?.length && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {t("carouselDetail", "noScriptContent")}
                        </p>
                      )}
                    </TabsContent>

                    {/* Transcription Tab */}
                    <TabsContent value="transcription" className="mt-0">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-muted-foreground">
                          {t("carouselDetail", "transcriptionDesc")}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyTranscription}
                          className="h-7 text-xs"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          {t("carouselDetail", "copyText")}
                        </Button>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/30 border border-border/50 max-h-60 overflow-y-auto">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {carousel.transcription}
                        </p>
                      </div>
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CarouselDetail;