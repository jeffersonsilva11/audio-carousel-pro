import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Mic2, 
  ArrowLeft, 
  ArrowRight, 
  Loader2,
  Check,
  ChevronLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import AudioUploader from "@/components/carousel-creator/AudioUploader";
import ToneSelector, { ToneType } from "@/components/carousel-creator/ToneSelector";
import StyleSelector, { StyleType } from "@/components/carousel-creator/StyleSelector";
import FormatSelector, { FormatType } from "@/components/carousel-creator/FormatSelector";
import ProcessingStatus from "@/components/carousel-creator/ProcessingStatus";

type Step = "upload" | "customize" | "processing" | "preview";

const steps: { id: Step; title: string; description: string }[] = [
  { id: "upload", title: "Áudio", description: "Envie ou grave" },
  { id: "customize", title: "Personalizar", description: "Tom e estilo" },
  { id: "processing", title: "Processando", description: "IA trabalhando" },
  { id: "preview", title: "Pronto", description: "Baixe" },
];

const CreateCarousel = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Step management
  const [currentStep, setCurrentStep] = useState<Step>("upload");

  // Audio state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);

  // Customization state
  const [selectedTone, setSelectedTone] = useState<ToneType>("PROFESSIONAL");
  const [selectedStyle, setSelectedStyle] = useState<StyleType>("BLACK_WHITE");
  const [selectedFormat, setSelectedFormat] = useState<FormatType>("POST_SQUARE");

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("QUEUED");
  const [carouselId, setCarouselId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const getCurrentStepIndex = () => steps.findIndex(s => s.id === currentStep);

  const canProceed = () => {
    switch (currentStep) {
      case "upload":
        return audioFile !== null;
      case "customize":
        return true;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (currentStep === "upload" && audioFile) {
      setCurrentStep("customize");
    } else if (currentStep === "customize") {
      await startGeneration();
    }
  };

  const handleBack = () => {
    if (currentStep === "customize") {
      setCurrentStep("upload");
    }
  };

  const startGeneration = async () => {
    if (!user || !audioFile) return;

    setIsProcessing(true);
    setCurrentStep("processing");
    setProcessingStatus("TRANSCRIBING");

    try {
      // Create carousel record in database
      const { data: carousel, error: insertError } = await supabase
        .from("carousels")
        .insert({
          user_id: user.id,
          tone: selectedTone,
          style: selectedStyle,
          format: selectedFormat,
          audio_size: audioFile.size,
          audio_duration: audioDuration,
          status: "TRANSCRIBING",
        })
        .select()
        .single();

      if (insertError) throw insertError;
      setCarouselId(carousel.id);

      // Simulate processing steps (in production, this would be handled by edge functions)
      await simulateProcessing(carousel.id);

    } catch (error) {
      console.error("Error starting generation:", error);
      toast({
        title: "Erro ao gerar carrossel",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
      setCurrentStep("customize");
      setIsProcessing(false);
    }
  };

  const simulateProcessing = async (id: string) => {
    // Simulate transcription
    await new Promise(r => setTimeout(r, 2000));
    setProcessingStatus("SCRIPTING");
    await supabase.from("carousels").update({ status: "SCRIPTING" }).eq("id", id);

    // Simulate scripting
    await new Promise(r => setTimeout(r, 2500));
    setProcessingStatus("GENERATING");
    await supabase.from("carousels").update({ status: "GENERATING" }).eq("id", id);

    // Simulate image generation
    await new Promise(r => setTimeout(r, 3000));
    setProcessingStatus("COMPLETED");
    await supabase.from("carousels").update({ 
      status: "COMPLETED",
      slide_count: 6,
      transcription: "Transcrição simulada do áudio...",
      script: {
        tone: selectedTone,
        slides: [
          { number: 1, type: "HOOK", text: "Seu hook aqui" },
          { number: 2, type: "CONTENT", text: "Slide 2" },
          { number: 3, type: "CONTENT", text: "Slide 3" },
          { number: 4, type: "CONTENT", text: "Slide 4" },
          { number: 5, type: "CTA", text: "Slide 5" },
          { number: 6, type: "SIGNATURE", text: "@seuinstagram" },
        ]
      }
    }).eq("id", id);

    setIsProcessing(false);
    setCurrentStep("preview");
    
    toast({
      title: "Carrossel criado!",
      description: "Seu carrossel está pronto para download.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/dashboard")}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <a href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                  <Mic2 className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold tracking-tight hidden sm:block">
                  Carrossel<span className="text-accent">AI</span>
                </span>
              </a>
            </div>

            {/* Step indicator */}
            <div className="hidden md:flex items-center gap-2">
              {steps.map((step, index) => {
                const currentIndex = getCurrentStepIndex();
                const isActive = step.id === currentStep;
                const isCompleted = index < currentIndex;
                const isPending = index > currentIndex;

                return (
                  <div key={step.id} className="flex items-center">
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all",
                      isActive && "bg-accent text-accent-foreground",
                      isCompleted && "text-accent",
                      isPending && "text-muted-foreground"
                    )}>
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium",
                        isActive && "bg-accent-foreground/20",
                        isCompleted && "bg-accent/20",
                        isPending && "bg-muted"
                      )}>
                        {isCompleted ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span className="font-medium">{step.title}</span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={cn(
                        "w-8 h-0.5 mx-1",
                        isCompleted ? "bg-accent" : "bg-muted"
                      )} />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="w-20" />
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Mobile step indicator */}
        <div className="md:hidden mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Passo {getCurrentStepIndex() + 1} de {steps.length}
            </span>
            <span className="text-sm font-medium">
              {steps[getCurrentStepIndex()]?.title}
            </span>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent transition-all"
              style={{ width: `${((getCurrentStepIndex() + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="space-y-6">
          {currentStep === "upload" && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">Envie seu áudio</h1>
                <p className="text-muted-foreground">
                  Grave ou faça upload de um áudio de até 60 segundos
                </p>
              </div>
              
              <AudioUploader
                audioFile={audioFile}
                setAudioFile={setAudioFile}
                audioDuration={audioDuration}
                setAudioDuration={setAudioDuration}
              />
            </>
          )}

          {currentStep === "customize" && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">Personalize seu carrossel</h1>
                <p className="text-muted-foreground">
                  Escolha como a IA vai criar seu conteúdo
                </p>
              </div>
              
              <div className="space-y-8">
                <ToneSelector 
                  selectedTone={selectedTone} 
                  setSelectedTone={setSelectedTone} 
                />
                <StyleSelector 
                  selectedStyle={selectedStyle} 
                  setSelectedStyle={setSelectedStyle} 
                />
                <FormatSelector 
                  selectedFormat={selectedFormat} 
                  setSelectedFormat={setSelectedFormat} 
                />
              </div>
            </>
          )}

          {currentStep === "processing" && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">Gerando seu carrossel</h1>
                <p className="text-muted-foreground">
                  Nossa IA está trabalhando no seu conteúdo
                </p>
              </div>
              
              <ProcessingStatus status={processingStatus} />
            </>
          )}

          {currentStep === "preview" && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">Carrossel pronto! 🎉</h1>
                <p className="text-muted-foreground">
                  Seu carrossel foi gerado com sucesso
                </p>
              </div>
              
              <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
                <CardContent className="p-8 text-center">
                  <div className="w-24 h-24 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
                    <Check className="w-12 h-12 text-accent" />
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-2">
                    6 slides criados
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Tom: {selectedTone === "EMOTIONAL" ? "Emocional" : selectedTone === "PROFESSIONAL" ? "Profissional" : "Provocador"}
                    {" • "}
                    Formato: {selectedFormat === "POST_SQUARE" ? "1:1" : selectedFormat === "POST_PORTRAIT" ? "4:5" : "9:16"}
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button variant="accent" size="lg">
                      Baixar todas as imagens
                    </Button>
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={() => navigate("/dashboard")}
                    >
                      Ver no Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Navigation buttons */}
        {(currentStep === "upload" || currentStep === "customize") && (
          <div className="flex justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === "upload"}
              className={cn(currentStep === "upload" && "invisible")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>

            <Button
              variant="accent"
              onClick={handleNext}
              disabled={!canProceed() || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : currentStep === "customize" ? (
                <>
                  Gerar Carrossel
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Continuar
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default CreateCarousel;
