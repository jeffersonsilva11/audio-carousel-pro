import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { supabase } from "@/integrations/supabase/client";
import { useCarouselGeneration } from "@/hooks/useCarouselGeneration";
import { Button } from "@/components/ui/button";
import { 
  Mic2, 
  ArrowLeft, 
  ArrowRight, 
  Loader2,
  ChevronLeft,
  Crown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { BRAND, TemplateId, TextModeId, SlideCountMode } from "@/lib/constants";

import AudioUploader from "@/components/carousel-creator/AudioUploader";
import ToneSelector, { ToneType } from "@/components/carousel-creator/ToneSelector";
import StyleSelector, { StyleType } from "@/components/carousel-creator/StyleSelector";
import FormatSelector, { FormatType } from "@/components/carousel-creator/FormatSelector";
import ProcessingStatus from "@/components/carousel-creator/ProcessingStatus";
import CarouselPreview from "@/components/carousel-creator/CarouselPreview";
import ProfileIdentitySelector, { ProfileIdentity } from "@/components/carousel-creator/ProfileIdentitySelector";
import TemplateSelector from "@/components/carousel-creator/TemplateSelector";
import TextModeSelector, { CreativeTone } from "@/components/carousel-creator/TextModeSelector";
import SlideCountSelector from "@/components/carousel-creator/SlideCountSelector";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Step = "upload" | "customize" | "processing" | "preview";

const steps: { id: Step; title: string; description: string }[] = [
  { id: "upload", title: "Áudio", description: "Envie ou grave" },
  { id: "customize", title: "Personalizar", description: "Tom e estilo" },
  { id: "processing", title: "Processando", description: "IA trabalhando" },
  { id: "preview", title: "Pronto", description: "Baixe" },
];

interface Slide {
  number: number;
  type: string;
  text: string;
  imageUrl?: string;
}

const CreateCarousel = () => {
  const { user, loading } = useAuth();
  const { isPro, createCheckout, loading: subLoading } = useSubscription();
  const { preferences, loading: prefsLoading, savePreferences } = useUserPreferences();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { status, error, result, generateCarousel } = useCarouselGeneration();

  // Step management
  const [currentStep, setCurrentStep] = useState<Step>("upload");

  // Audio state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);

  // Profile identity state - initialized from preferences
  const [profileIdentity, setProfileIdentity] = useState<ProfileIdentity>({
    name: '',
    username: '',
    photoUrl: null,
    avatarPosition: 'top-left',
    displayMode: 'name_and_username',
  });

  // Customization state - initialized from preferences
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("solid");
  const [selectedTextMode, setSelectedTextMode] = useState<TextModeId>("compact");
  const [creativeTone, setCreativeTone] = useState<CreativeTone>("professional");
  const [slideCountMode, setSlideCountMode] = useState<SlideCountMode>("auto");
  const [manualSlideCount, setManualSlideCount] = useState(6);
  const [selectedTone, setSelectedTone] = useState<ToneType>("PROFESSIONAL");
  const [selectedStyle, setSelectedStyle] = useState<StyleType>("BLACK_WHITE");
  const [selectedFormat, setSelectedFormat] = useState<FormatType>("POST_SQUARE");
  const [prefsInitialized, setPrefsInitialized] = useState(false);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedSlides, setGeneratedSlides] = useState<Slide[]>([]);

  // Usage limit state
  const [carouselCount, setCarouselCount] = useState<number>(0);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Initialize state from preferences when loaded
  useEffect(() => {
    if (!prefsLoading && !prefsInitialized) {
      setProfileIdentity({
        name: preferences.name,
        username: preferences.username,
        photoUrl: preferences.photoUrl,
        avatarPosition: preferences.avatarPosition,
        displayMode: preferences.displayMode,
      });
      setSelectedTemplate(preferences.defaultTemplate);
      setSelectedTextMode(preferences.defaultTextMode);
      setCreativeTone(preferences.defaultCreativeTone);
      setSlideCountMode(preferences.defaultSlideCountMode);
      setManualSlideCount(preferences.defaultManualSlideCount);
      setSelectedTone(preferences.defaultTone as ToneType);
      setSelectedStyle(preferences.defaultStyle as StyleType);
      setPrefsInitialized(true);
    }
  }, [preferences, prefsLoading, prefsInitialized]);

  // Save preferences when customization step is completed
  const saveCurrentPreferences = useCallback(() => {
    savePreferences({
      name: profileIdentity.name,
      username: profileIdentity.username,
      photoUrl: profileIdentity.photoUrl,
      avatarPosition: profileIdentity.avatarPosition,
      displayMode: profileIdentity.displayMode,
      defaultTemplate: selectedTemplate,
      defaultTextMode: selectedTextMode,
      defaultCreativeTone: creativeTone,
      defaultSlideCountMode: slideCountMode,
      defaultManualSlideCount: manualSlideCount,
      defaultTone: selectedTone,
      defaultStyle: selectedStyle,
    });
  }, [
    profileIdentity, selectedTemplate, selectedTextMode, creativeTone,
    slideCountMode, manualSlideCount, selectedTone, selectedStyle, savePreferences
  ]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Fetch carousel count for usage limits
  useEffect(() => {
    if (user) {
      fetchCarouselCount();
    }
  }, [user]);

  const fetchCarouselCount = async () => {
    if (!user) return;
    
    const { count, error } = await supabase
      .from("carousels")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (!error && count !== null) {
      setCarouselCount(count);
    }
  };

  // Watch for status changes
  useEffect(() => {
    if (status === "COMPLETED" && result) {
      setGeneratedSlides(result.slides);
      setCurrentStep("preview");
      setIsProcessing(false);
      toast({
        title: "Carrossel criado!",
        description: isPro 
          ? "Seu carrossel está pronto para download." 
          : "Seu carrossel está pronto (com marca d'água).",
      });
    } else if (status === "FAILED" && error) {
      toast({
        title: "Erro ao gerar carrossel",
        description: error,
        variant: "destructive",
      });
      setCurrentStep("customize");
      setIsProcessing(false);
    }
  }, [status, result, error, toast, isPro]);

  const getCurrentStepIndex = () => steps.findIndex(s => s.id === currentStep);

  const canProceed = () => {
    switch (currentStep) {
      case "upload":
        return audioFile !== null;
      case "customize":
        // Require at least username for profile identity
        return profileIdentity.username.length >= 2;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (currentStep === "upload" && audioFile) {
      setCurrentStep("customize");
    } else if (currentStep === "customize") {
      // Check usage limit for free users
      if (!isPro && carouselCount >= 1) {
        setShowUpgradeDialog(true);
        return;
      }
      // Save preferences before generating
      saveCurrentPreferences();
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
          has_watermark: !isPro,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Start the real AI generation
      await generateCarousel({
        audioFile,
        textMode: selectedTextMode,
        creativeTone,
        slideCountMode,
        slideCount: manualSlideCount,
        template: selectedTemplate,
        style: selectedStyle,
        format: selectedFormat,
        carouselId: carousel.id,
        userId: user.id,
        isPro,
        language: 'pt-BR'
      });

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Tente novamente mais tarde.";
      console.error("Error starting generation:", err);
      toast({
        title: "Erro ao gerar carrossel",
        description: errorMessage,
        variant: "destructive",
      });
      setCurrentStep("customize");
      setIsProcessing(false);
    }
  };

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    try {
      await createCheckout();
      setShowUpgradeDialog(false);
    } catch (error) {
      toast({
        title: "Erro ao iniciar checkout",
        description: "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (generatedSlides.length === 0) return;

    try {
      for (const slide of generatedSlides) {
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
          
          // Small delay between downloads
          await new Promise(r => setTimeout(r, 200));
        }
      }
      
      toast({
        title: "Download concluído",
        description: `${generatedSlides.length} slides baixados com sucesso.`,
      });
    } catch (err) {
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar os slides.",
        variant: "destructive",
      });
    }
  };

  if (loading || subLoading || prefsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-accent" />
              Limite atingido
            </DialogTitle>
            <DialogDescription>
              Você já criou seu carrossel grátis. Assine o Pro para criar carrosséis ilimitados e sem marca d'água!
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-accent/10 rounded-lg p-4 my-4">
            <div className="font-semibold text-lg mb-2">Plano Pro</div>
            <div className="text-2xl font-bold text-accent mb-2">R$ 29,90<span className="text-sm font-normal text-muted-foreground">/mês</span></div>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>✓ Carrosséis ilimitados</li>
              <li>✓ Sem marca d'água</li>
              <li>✓ Histórico completo</li>
              <li>✓ Download em ZIP</li>
            </ul>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowUpgradeDialog(false)}
              className="w-full sm:w-auto"
            >
              Voltar
            </Button>
            <Button 
              variant="accent" 
              onClick={handleUpgrade}
              disabled={checkoutLoading}
              className="w-full sm:w-auto"
            >
              {checkoutLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Crown className="w-4 h-4 mr-2" />
              )}
              Assinar Pro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  {BRAND.name}
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
                        {isCompleted ? "✓" : index + 1}
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

            {/* Pro badge or upgrade */}
            <div className="flex items-center gap-2">
              {isPro ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full">
                  <Crown className="w-3 h-3" />
                  Pro
                </span>
              ) : (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowUpgradeDialog(true)}
                  className="text-accent text-xs"
                >
                  <Crown className="w-3 h-3 mr-1" />
                  Upgrade
                </Button>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Free user warning */}
        {!isPro && currentStep !== "processing" && currentStep !== "preview" && (
          <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                <Crown className="w-4 h-4 text-accent" />
              </div>
              <div className="text-sm">
                <span className="font-medium">Plano Grátis</span>
                <span className="text-muted-foreground"> • {carouselCount}/1 carrossel usado</span>
                {carouselCount >= 1 && (
                  <span className="text-destructive ml-1">(limite atingido)</span>
                )}
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowUpgradeDialog(true)}
              className="text-xs"
            >
              Upgrade Pro
            </Button>
          </div>
        )}

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
                <ProfileIdentitySelector
                  profile={profileIdentity}
                  setProfile={setProfileIdentity}
                />
                
                <div className="border-t border-border pt-8">
                  <TemplateSelector
                    selectedTemplate={selectedTemplate}
                    setSelectedTemplate={setSelectedTemplate}
                  />
                </div>
                
                <div className="border-t border-border pt-8">
                  <TextModeSelector
                    selectedMode={selectedTextMode}
                    setSelectedMode={setSelectedTextMode}
                    creativeTone={creativeTone}
                    setCreativeTone={setCreativeTone}
                  />
                </div>
                
                <div className="border-t border-border pt-8">
                  <SlideCountSelector
                    mode={slideCountMode}
                    setMode={setSlideCountMode}
                    manualCount={manualSlideCount}
                    setManualCount={setManualSlideCount}
                  />
                </div>
                
                <div className="border-t border-border pt-8">
                  <ToneSelector 
                    selectedTone={selectedTone} 
                    setSelectedTone={setSelectedTone} 
                  />
                </div>
                
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
              
              <ProcessingStatus status={status} />
            </>
          )}

          {currentStep === "preview" && generatedSlides.length > 0 && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">Carrossel pronto! 🎉</h1>
                <p className="text-muted-foreground">
                  Seu carrossel foi gerado com sucesso • {generatedSlides.length} slides
                </p>
                {!isPro && (
                  <p className="text-sm text-amber-500 mt-2">
                    ⚠️ Este carrossel contém marca d'água. Assine o Pro para remover.
                  </p>
                )}
              </div>
              
              <CarouselPreview 
                slides={generatedSlides} 
                onDownloadAll={handleDownloadAll}
                isPro={isPro}
              />

              <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
                {!isPro && (
                  <Button 
                    variant="accent"
                    onClick={() => setShowUpgradeDialog(true)}
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Remover marca d'água
                  </Button>
                )}
                <Button 
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                >
                  Ver no Dashboard
                </Button>
              </div>
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
