import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
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
  Clock,
  Crown,
  Download,
  FileArchive,
  Image as ImageIcon,
  Loader2,
  Mic2,
  RefreshCw,
  Share2,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import JSZip from "jszip";
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
}

const CarouselDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const { isPro, createCheckout } = useSubscription();
  const navigate = useNavigate();
  const [carousel, setCarousel] = useState<CarouselData | null>(null);
  const [loadingCarousel, setLoadingCarousel] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

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
        toast.error("Carrossel não encontrado");
        navigate("/dashboard");
        return;
      }
      setCarousel(data);
    } catch (error) {
      console.error("Error fetching carousel:", error);
      toast.error("Erro ao carregar carrossel");
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
        throw new Error(data?.error || error?.message || "Erro ao regenerar");
      }

      toast.success("Marca d'água removida com sucesso!");
      await fetchCarousel();
    } catch (error) {
      console.error("Regeneration error:", error);
      toast.error("Erro ao remover marca d'água");
    } finally {
      setRegenerating(false);
    }
  };

  const handleDownloadSingle = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `slide-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      toast.error("Erro ao baixar imagem");
    }
  };

  const handleDownloadAll = async () => {
    if (!carousel?.image_urls || carousel.image_urls.length === 0) return;

    setDownloading(true);
    try {
      const zip = new JSZip();
      
      await Promise.all(
        carousel.image_urls.map(async (url, index) => {
          const response = await fetch(url);
          const blob = await response.blob();
          zip.file(`slide-${index + 1}.png`, blob);
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
      
      toast.success("Download iniciado!");
    } catch (error) {
      toast.error("Erro ao criar arquivo ZIP");
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

      toast.success("Carrossel excluído");
      navigate("/dashboard");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Erro ao excluir carrossel");
    } finally {
      setDeleting(false);
    }
  };

  const handleShare = async () => {
    if (!carousel?.image_urls?.[0]) return;

    try {
      await navigator.clipboard.writeText(carousel.image_urls[0]);
      toast.success("Link copiado para a área de transferência");
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  const getToneLabel = (tone: string) => {
    const tones: Record<string, string> = {
      EMOTIONAL: "Emocional",
      PROFESSIONAL: "Profissional",
      PROVOCATIVE: "Provocador"
    };
    return tones[tone] || tone;
  };

  const getStyleLabel = (style: string) => {
    const styles: Record<string, string> = {
      BLACK_WHITE: "Preto & Branco",
      GRADIENT: "Gradiente",
      COLORFUL: "Colorido"
    };
    return styles[style] || style;
  };

  const getFormatLabel = (format: string) => {
    const formats: Record<string, string> = {
      POST_SQUARE: "Post Quadrado",
      STORY_VERTICAL: "Story Vertical",
      REELS_VERTICAL: "Reels Vertical"
    };
    return formats[format] || format;
  };

  if (loading || loadingCarousel) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
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
                Voltar
              </Button>
              <div className="h-6 w-px bg-border hidden sm:block" />
              <a href="/" className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Mic2 className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-sm">
                  Carrossel<span className="text-accent">AI</span>
                </span>
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir carrossel?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. O carrossel e todas as imagens serão permanentemente excluídos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir"}
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
                                onLoad={() => setCurrentSlide(index)}
                              />
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious className="left-2" />
                      <CarouselNext className="right-2" />
                    </Carousel>
                    <div className="text-center mt-4 text-sm text-muted-foreground">
                      {carousel.image_urls.length} slides
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                    <div className="text-center">
                      <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {carousel.status === "PROCESSING" ? "Processando..." : "Sem imagens"}
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
                    className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 border-transparent hover:border-accent/50 transition-colors"
                    onClick={() => handleDownloadSingle(url, index)}
                    title={`Baixar slide ${index + 1}`}
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
                  {carousel.status === "COMPLETED" ? "Pronto" : 
                   carousel.status === "PROCESSING" ? "Processando" : "Erro"}
                </span>
                {carousel.has_watermark && (
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-500">
                    Watermark
                  </span>
                )}
              </div>
              <p className="text-muted-foreground">
                {getStyleLabel(carousel.style)} • {getFormatLabel(carousel.format)} • {carousel.slide_count} slides
              </p>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Criado em</p>
                    <p className="text-sm font-medium">
                      {format(new Date(carousel.created_at), "d MMM yyyy, HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </CardContent>
              </Card>
              {carousel.processing_time && (
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Tempo de processamento</p>
                      <p className="text-sm font-medium">
                        {Math.round(carousel.processing_time)}s
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
                        Baixar Todas (ZIP)
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => carousel.image_urls && handleDownloadSingle(carousel.image_urls[0], 0)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Baixar Primeira Imagem
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
                      Remover Marca d'água
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full text-accent border-accent/30 hover:bg-accent/10"
                      onClick={() => createCheckout()}
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Upgrade Pro para Remover Watermark
                    </Button>
                  )
                )}

                {/* Upgrade for ZIP */}
                {!isPro && carousel.status === "COMPLETED" && (
                  <div className="text-center p-4 rounded-lg bg-accent/5 border border-accent/20">
                    <Crown className="w-6 h-6 text-accent mx-auto mb-2" />
                    <p className="text-sm font-medium mb-1">Assine Pro para mais recursos</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Download em ZIP, sem marca d'água e carrosséis ilimitados
                    </p>
                    <Button variant="accent" size="sm" onClick={() => createCheckout()}>
                      Assinar Pro - R$ 29,90/mês
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transcription */}
            {carousel.transcription && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Transcrição</CardTitle>
                  <CardDescription>Texto extraído do áudio</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {carousel.transcription}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CarouselDetail;
