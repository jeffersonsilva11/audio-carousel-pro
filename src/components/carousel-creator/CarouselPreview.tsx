import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Download, Share2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Slide {
  number: number;
  type: string;
  text: string;
  imageUrl?: string;
}

interface CarouselPreviewProps {
  slides: Slide[];
  onDownloadAll: () => void;
}

const CarouselPreview = ({ slides, onDownloadAll }: CarouselPreviewProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { toast } = useToast();

  const goToSlide = (index: number) => {
    if (index >= 0 && index < slides.length) {
      setCurrentSlide(index);
    }
  };

  const downloadSlide = async (slide: Slide) => {
    try {
      // For SVG data URLs, convert to blob and download
      if (slide.imageUrl?.startsWith("data:image/svg+xml")) {
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
        title: "Download iniciado",
        description: `Slide ${slide.number} baixado com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o slide.",
        variant: "destructive",
      });
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
                alt={`Slide ${currentSlide + 1}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                Carregando...
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
              <span className="font-medium text-foreground">Slide {currentSlide + 1}</span>
              {" "}de {slides.length}
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

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button 
          variant="accent" 
          size="lg" 
          onClick={onDownloadAll}
          className="flex-1 sm:flex-initial"
        >
          <Download className="w-4 h-4 mr-2" />
          Baixar todas ({slides.length} slides)
        </Button>
        <Button 
          variant="outline" 
          size="lg"
          onClick={() => downloadSlide(currentSlideData)}
          className="flex-1 sm:flex-initial"
        >
          <Download className="w-4 h-4 mr-2" />
          Baixar slide atual
        </Button>
      </div>

      {/* Slide text preview */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            Texto do slide {currentSlide + 1}:
          </h4>
          <p className="text-foreground">{currentSlideData?.text}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CarouselPreview;
