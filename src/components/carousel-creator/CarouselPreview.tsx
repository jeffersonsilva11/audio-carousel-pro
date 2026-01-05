import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, ChevronDown, Download, FolderArchive, Loader2, Image, FileImage } from "lucide-react";
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

interface Slide {
  number: number;
  type: string;
  text: string;
  imageUrl?: string;
}

interface CarouselPreviewProps {
  slides: Slide[];
  onDownloadAll: () => void;
  isPro?: boolean;
}

const CarouselPreview = ({ slides, onDownloadAll, isPro = false }: CarouselPreviewProps) => {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("png");
  const { toast } = useToast();

  const goToSlide = (index: number) => {
    if (index >= 0 && index < slides.length) {
      setCurrentSlide(index);
    }
  };

  const downloadSlide = async (slide: Slide) => {
    try {
      if (slide.imageUrl) {
        const blob = await convertSvgToFormat(slide.imageUrl, { format: exportFormat });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `slide-${slide.number}.${getFileExtension(exportFormat)}`;
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
      console.error("Download error:", error);
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

      // Convert and add all slides to zip
      for (const slide of slides) {
        if (slide.imageUrl) {
          try {
            const blob = await convertSvgToFormat(slide.imageUrl, { format: exportFormat });
            folder.file(`slide-${slide.number}.${getFileExtension(exportFormat)}`, blob);
          } catch (err) {
            console.error(`Error converting slide ${slide.number}:`, err);
          }
        }
      }

      // Generate and download zip
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
          </div>

          {/* Slide info */}
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{t("carouselPreview", "slide")} {currentSlide + 1}</span>
              {" "}{t("carouselPreview", "of")} {slides.length}
              {currentSlideData?.type && (
                <span className="ml-2 text-accent">• {currentSlideData.type}</span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Thumbnail navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 justify-center">
        {slides.map((slide, index) => (
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
          </button>
        ))}
      </div>

      {/* Export Format Selector */}
      <div className="flex items-center justify-center gap-3">
        <span className="text-sm text-muted-foreground">Formato:</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="min-w-[120px] justify-between">
              <span className="flex items-center gap-2">
                {exportFormat === "svg" && <FileImage className="w-4 h-4" />}
                {exportFormat === "png" && <Image className="w-4 h-4" />}
                {exportFormat === "jpg" && <Image className="w-4 h-4" />}
                {exportFormat.toUpperCase()}
              </span>
              <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            <DropdownMenuItem onClick={() => setExportFormat("png")} className="cursor-pointer">
              <Image className="w-4 h-4 mr-2" />
              PNG
              <span className="ml-2 text-xs text-muted-foreground">(Recomendado)</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setExportFormat("jpg")} className="cursor-pointer">
              <Image className="w-4 h-4 mr-2" />
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
            onClick={onDownloadAll}
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

      {/* Slide text preview */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            {t("carouselPreview", "slideText").replace("{number}", String(currentSlide + 1))}
          </h4>
          <p className="text-foreground">{currentSlideData?.text}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CarouselPreview;