import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useLanguage, SupportedLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/translations";
import { getPlanPrice } from "@/lib/localization";
import { supabase } from "@/integrations/supabase/client";
import { useCarouselGeneration } from "@/hooks/useCarouselGeneration";
import { Button } from "@/components/ui/button";
import {
  Mic2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  ChevronLeft,
  Crown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { BRAND, TemplateId, TextModeId, SlideCountMode } from "@/lib/constants";

import AudioUploader from "@/components/carousel-creator/AudioUploader";
import { ToneType } from "@/components/carousel-creator/ToneSelector";
import StyleSelector, { StyleType } from "@/components/carousel-creator/StyleSelector";
import FormatSelector, { FormatType } from "@/components/carousel-creator/FormatSelector";
import ProcessingStatus from "@/components/carousel-creator/ProcessingStatus";
import CarouselPreview from "@/components/carousel-creator/CarouselPreview";
import CarouselEditView from "@/components/carousel-creator/CarouselEditView";
import CarouselDownloadView from "@/components/carousel-creator/CarouselDownloadView";
// ExportFormatSelector removed - format is already chosen in customize step
import ProfileIdentitySelector, { ProfileIdentity } from "@/components/carousel-creator/ProfileIdentitySelector";
// TemplateSelector removed - cover options now in AdvancedTemplateEditor
import TextModeSelector, { CreativeTone } from "@/components/carousel-creator/TextModeSelector";
import SlideCountSelector from "@/components/carousel-creator/SlideCountSelector";
import LanguageSelector from "@/components/carousel-creator/LanguageSelector";
import AdvancedTemplateEditor, { TemplateCustomization } from "@/components/carousel-creator/AdvancedTemplateEditor";
import CoverOptionsEditor from "@/components/carousel-creator/CoverOptionsEditor";
import AdvancedOptionsEditor from "@/components/carousel-creator/AdvancedOptionsEditor";
import LayoutTemplateSelector from "@/components/carousel-creator/LayoutTemplateSelector";
import SlideImageUploader from "@/components/carousel-creator/SlideImageUploader";
import { CoverTemplateType, ContentTemplateType, templateRequiresImage } from "@/lib/templates";
import LiveCarouselPreview from "@/components/carousel-creator/LiveCarouselPreview";
import { FontId, GradientId } from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Step = "upload" | "customize" | "processing" | "preview";

const getSteps = (lang: SupportedLanguage) => [
  { id: "upload" as const, title: t("create", "audioStep", lang), description: t("create", "audioStepDesc", lang) },
  { id: "customize" as const, title: t("create", "customizeStep", lang), description: t("create", "customizeStepDesc", lang) },
  { id: "processing" as const, title: t("create", "processingStep", lang), description: t("create", "processingStepDesc", lang) },
  { id: "preview" as const, title: t("create", "readyStep", lang), description: t("create", "readyStepDesc", lang) },
];

interface Slide {
  number: number;
  type: string;
  text: string;
  imageUrl?: string;
}

const CreateCarousel = () => {
  const { user, loading, isEmailConfirmed, signOut } = useAuth();
  const { isPro, isCreator, createCheckout, loading: subLoading } = useSubscription();
  const { preferences, loading: prefsLoading, savePreferences } = useUserPreferences();
  const { language: siteLanguage } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { status, error, result, generateCarousel } = useCarouselGeneration();

  // Get translated steps
  const steps = getSteps(siteLanguage);

  // Language state for carousel generation (defaults to site language)
  const [carouselLanguage, setCarouselLanguage] = useState<SupportedLanguage>(siteLanguage);

  // Step management
  const [currentStep, setCurrentStep] = useState<Step>("upload");

  // Audio state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioRestoredFromStorage, setAudioRestoredFromStorage] = useState(false);

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
  // selectedTone is derived from creativeTone for DB storage
  const getToneTypeFromCreativeTone = (tone: CreativeTone): ToneType => {
    const map: Record<CreativeTone, ToneType> = {
      emotional: "EMOTIONAL",
      professional: "PROFESSIONAL",
      provocative: "PROVOCATIVE"
    };
    return map[tone];
  };
  const selectedTone = getToneTypeFromCreativeTone(creativeTone);
  const [selectedStyle, setSelectedStyle] = useState<StyleType>("BLACK_WHITE");
  const [selectedFormat, setSelectedFormat] = useState<FormatType>("POST_SQUARE");
  const [prefsInitialized, setPrefsInitialized] = useState(false);
  
  // Advanced template customization (Creator+ only)
  const [templateCustomization, setTemplateCustomization] = useState<TemplateCustomization>({
    fontId: 'inter' as FontId,
    gradientId: 'none' as GradientId,
    customGradientColors: undefined,
    slideImages: [],
    textAlignment: 'center',
    showNavigationDots: true,
    showNavigationArrow: true,
  });

  // Layout templates (Creator+ only)
  const [coverTemplate, setCoverTemplate] = useState<CoverTemplateType>('cover_full_image');
  const [contentTemplate, setContentTemplate] = useState<ContentTemplateType>('content_text_only');

  // Per-slide images for templates (Creator+ only)
  interface SlideImage {
    slideIndex: number;
    storagePath: string | null;
    publicUrl: string | null;
    position: 'main' | 'left' | 'right' | 'top' | 'bottom';
  }
  const [perSlideImages, setPerSlideImages] = useState<SlideImage[]>([]);

  // Generate a temporary carousel ID for image uploads during customize step
  const [tempCarouselId] = useState(() => crypto.randomUUID());

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedSlides, setGeneratedSlides] = useState<Slide[]>([]);

  // Usage limit state
  const [carouselCount, setCarouselCount] = useState<number>(0);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  
  // Regeneration state for batch processing
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratingProgress, setRegeneratingProgress] = useState<{ current: number; total: number } | null>(null);
  
  // Carousel ID for editing
  const [currentCarouselId, setCurrentCarouselId] = useState<string | null>(null);

  // Lock state - carousel is locked after first export
  const [isCarouselLocked, setIsCarouselLocked] = useState(false);

  // Validation state - show errors when user attempts to proceed
  const [showProfileValidation, setShowProfileValidation] = useState(false);

  // Function to mark carousel as exported (locks editing)
  const handleFirstExport = async () => {
    if (!currentCarouselId) return;

    try {
      const { error } = await supabase
        .from('carousels')
        .update({ exported_at: new Date().toISOString() })
        .eq('id', currentCarouselId);

      if (error) throw error;

      setIsCarouselLocked(true);
    } catch (err) {
      console.error('Error marking carousel as exported:', err);
    }
  };

  // Function to finalize editing with batch regeneration
  const handleFinalizeEdit = async (editedSlides: Slide[], changedIndices: number[]) => {
    if (!currentCarouselId || !user) return;

    setIsRegenerating(true);

    try {
      // Update script in database first
      await supabase
        .from('carousels')
        .update({ script: { slides: editedSlides } })
        .eq('id', currentCarouselId);

      // If there are changed slides, regenerate them
      if (changedIndices.length > 0) {
        setRegeneratingProgress({ current: 0, total: changedIndices.length });

        const updatedSlides = [...editedSlides];

        for (let i = 0; i < changedIndices.length; i++) {
          const slideIndex = changedIndices[i];
          setRegeneratingProgress({ current: i + 1, total: changedIndices.length });

          try {
            const { data, error: regenError } = await supabase.functions.invoke(
              "generate-carousel-images",
              {
                body: {
                  script: { slides: [editedSlides[slideIndex]] },
                  style: selectedStyle,
                  format: selectedFormat,
                  carouselId: currentCarouselId,
                  userId: user.id,
                  hasWatermark: !isPro,
                  regenerateSingle: true,
                  slideIndex,
                  totalSlides: editedSlides.length,
                  profile: profileIdentity.username ? profileIdentity : undefined,
                  customization: isCreator ? {
                    fontId: templateCustomization.fontId,
                    gradientId: templateCustomization.gradientId,
                    customGradientColors: templateCustomization.customGradientColors,
                    slideImages: perSlideImages.length > 0
                      ? Array.from({ length: editedSlides.length }, (_, i) => {
                          const perSlide = perSlideImages.find(img => img.slideIndex === i);
                          if (perSlide?.publicUrl) return perSlide.publicUrl;
                          return templateCustomization.slideImages?.[i] || null;
                        })
                      : templateCustomization.slideImages,
                    textAlignment: templateCustomization.textAlignment,
                    showNavigationDots: templateCustomization.showNavigationDots,
                    showNavigationArrow: templateCustomization.showNavigationArrow,
                    coverTemplate,
                    contentTemplate,
                  } : undefined
                }
              }
            );

            if (data?.slides?.[0]?.imageUrl) {
              updatedSlides[slideIndex] = {
                ...updatedSlides[slideIndex],
                imageUrl: data.slides[0].imageUrl
              };
            }
          } catch (slideError) {
            console.error(`Error regenerating slide ${slideIndex}:`, slideError);
          }
        }

        setGeneratedSlides(updatedSlides);
      }

      // Mark as finalized
      await supabase
        .from('carousels')
        .update({ exported_at: new Date().toISOString() })
        .eq('id', currentCarouselId);

      setIsCarouselLocked(true);
      toast({
        title: siteLanguage === "pt-BR" ? "Carrossel finalizado!" : siteLanguage === "es" ? "¡Carrusel finalizado!" : "Carousel finalized!",
        description: siteLanguage === "pt-BR"
          ? "Agora você pode baixar seus slides."
          : siteLanguage === "es"
          ? "Ahora puedes descargar tus slides."
          : "Now you can download your slides.",
      });
    } catch (err) {
      console.error('Error finalizing carousel:', err);
      toast({
        title: siteLanguage === "pt-BR" ? "Erro ao finalizar" : "Error finalizing",
        description: siteLanguage === "pt-BR" ? "Tente novamente." : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
      setRegeneratingProgress(null);
    }
  };

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
      // Use defaultCreativeTone if available, otherwise derive from defaultTone
      if (preferences.defaultCreativeTone) {
        setCreativeTone(preferences.defaultCreativeTone);
      } else if (preferences.defaultTone) {
        // Convert legacy ToneType to CreativeTone
        const toneMap: Record<string, CreativeTone> = {
          EMOTIONAL: "emotional",
          PROFESSIONAL: "professional",
          PROVOCATIVE: "provocative"
        };
        setCreativeTone(toneMap[preferences.defaultTone] || "professional");
      }
      setSlideCountMode(preferences.defaultSlideCountMode);
      setManualSlideCount(preferences.defaultManualSlideCount);
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
      defaultTone: selectedTone, // Derived from creativeTone
      defaultStyle: selectedStyle,
    });
  }, [
    profileIdentity, selectedTemplate, selectedTextMode, creativeTone,
    slideCountMode, manualSlideCount, selectedTone, selectedStyle, savePreferences
  ]);

  // Restore audio from sessionStorage on mount
  useEffect(() => {
    if (audioRestoredFromStorage) return;

    const savedAudioData = sessionStorage.getItem('carousel_audio_data');
    const savedAudioDuration = sessionStorage.getItem('carousel_audio_duration');
    const savedAudioName = sessionStorage.getItem('carousel_audio_name');
    const savedAudioType = sessionStorage.getItem('carousel_audio_type');
    const savedStep = sessionStorage.getItem('carousel_current_step');

    if (savedAudioData && savedAudioDuration && savedAudioName) {
      try {
        // Convert base64 back to File
        const byteString = atob(savedAudioData);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const mimeType = savedAudioType || 'audio/webm';
        const blob = new Blob([ab], { type: mimeType });
        const file = new File([blob], savedAudioName, { type: mimeType });

        setAudioFile(file);
        setAudioDuration(parseFloat(savedAudioDuration));

        // Restore step if it was on customize
        if (savedStep === 'customize') {
          setCurrentStep('customize');
        }

        toast({
          title: siteLanguage === "pt-BR" ? "Áudio restaurado" : siteLanguage === "es" ? "Audio restaurado" : "Audio restored",
          description: siteLanguage === "pt-BR"
            ? "Seu áudio anterior foi recuperado."
            : siteLanguage === "es"
            ? "Tu audio anterior fue recuperado."
            : "Your previous audio was recovered.",
        });
      } catch (err) {
        console.error('Error restoring audio from storage:', err);
        // Clear corrupted data
        sessionStorage.removeItem('carousel_audio_data');
        sessionStorage.removeItem('carousel_audio_duration');
        sessionStorage.removeItem('carousel_audio_name');
        sessionStorage.removeItem('carousel_audio_type');
        sessionStorage.removeItem('carousel_current_step');
      }
    }
    setAudioRestoredFromStorage(true);
  }, [audioRestoredFromStorage, siteLanguage, toast]);

  // Save audio to sessionStorage when it changes
  useEffect(() => {
    if (!audioFile || !audioDuration) {
      // Clear storage if no audio
      sessionStorage.removeItem('carousel_audio_data');
      sessionStorage.removeItem('carousel_audio_duration');
      sessionStorage.removeItem('carousel_audio_name');
      sessionStorage.removeItem('carousel_audio_type');
      return;
    }

    // Save audio as base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      if (base64) {
        sessionStorage.setItem('carousel_audio_data', base64);
        sessionStorage.setItem('carousel_audio_duration', String(audioDuration));
        sessionStorage.setItem('carousel_audio_name', audioFile.name);
        sessionStorage.setItem('carousel_audio_type', audioFile.type);
      }
    };
    reader.readAsDataURL(audioFile);
  }, [audioFile, audioDuration]);

  // Save current step to sessionStorage
  useEffect(() => {
    if (currentStep === 'customize') {
      sessionStorage.setItem('carousel_current_step', currentStep);
    } else if (currentStep === 'upload') {
      sessionStorage.removeItem('carousel_current_step');
    }
  }, [currentStep]);

  // Clear storage when carousel is generated successfully
  useEffect(() => {
    if (status === "COMPLETED") {
      sessionStorage.removeItem('carousel_audio_data');
      sessionStorage.removeItem('carousel_audio_duration');
      sessionStorage.removeItem('carousel_audio_name');
      sessionStorage.removeItem('carousel_audio_type');
      sessionStorage.removeItem('carousel_current_step');
    }
  }, [status]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Redirect to email verification if email not confirmed
  useEffect(() => {
    if (!loading && user && !isEmailConfirmed) {
      signOut().then(() => {
        navigate(`/auth/verify?email=${encodeURIComponent(user.email || "")}`);
      });
    }
  }, [user, loading, isEmailConfirmed, navigate, signOut]);

  // Handle retry parameter - load failed carousel data
  useEffect(() => {
    const retryId = searchParams.get('retry');
    if (retryId && user) {
      loadFailedCarousel(retryId);
    }
  }, [searchParams, user]);

  const loadFailedCarousel = async (carouselId: string) => {
    try {
      const { data: carousel, error } = await supabase
        .from('carousels')
        .select('*')
        .eq('id', carouselId)
        .eq('user_id', user?.id)
        .single();

      if (error || !carousel) {
        toast({
          title: "Erro",
          description: "Carrossel não encontrado ou você não tem permissão.",
          variant: "destructive",
        });
        return;
      }

      if (carousel.status !== 'FAILED') {
        toast({
          title: "Aviso",
          description: "Este carrossel não está em estado de falha.",
          variant: "destructive",
        });
        return;
      }

      // Load the carousel data
      setCurrentCarouselId(carouselId);

      // If there's a transcription, skip to customize step
      if (carousel.transcription) {
        setTranscription(carousel.transcription);
        setAudioUrl(carousel.audio_url || null);
        setSelectedTone(carousel.tone as ToneType || 'PROFESSIONAL');
        setSelectedStyle(carousel.style as StyleType || 'BLACK_WHITE');
        setSelectedFormat(carousel.format as FormatType || 'POST_SQUARE');
        setCurrentStep('customize');

        toast({
          title: "Carrossel carregado",
          description: "Continue de onde parou. O áudio original será usado.",
        });
      }
    } catch (err) {
      console.error('Error loading failed carousel:', err);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o carrossel.",
        variant: "destructive",
      });
    }
  };

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
        title: t("create", "carouselCreated", siteLanguage),
        description: isPro
          ? (siteLanguage === "pt-BR" ? "Revise os textos antes de baixar." : "Review the texts before downloading.")
          : t("create", "readyWithWatermark", siteLanguage),
      });
    } else if (status === "FAILED" && error) {
      toast({
        title: t("create", "generationError", siteLanguage),
        description: error,
        variant: "destructive",
      });
      setCurrentStep("customize");
      setIsProcessing(false);
    }
  }, [status, result, error, toast, isPro, siteLanguage]);

  const getCurrentStepIndex = () => steps.findIndex(s => s.id === currentStep);

  // Profile validation helper
  const isProfileValid = () => {
    return (
      profileIdentity.name.length >= 2 &&
      profileIdentity.username.length >= 2 &&
      profileIdentity.photoUrl !== null
    );
  };

  const canProceed = () => {
    switch (currentStep) {
      case "upload":
        // Can only proceed if audio file exists AND not currently recording
        return audioFile !== null && !isRecordingAudio;
      case "customize":
        // Require name, username and photo for profile identity
        return isProfileValid();
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (currentStep === "upload" && audioFile) {
      setCurrentStep("customize");
      // Reset validation state when entering customize step
      setShowProfileValidation(false);
    } else if (currentStep === "customize") {
      // Check profile validation first
      if (!isProfileValid()) {
        setShowProfileValidation(true);
        toast({
          title: t("create", "validationError", siteLanguage),
          description: t("create", "fillRequiredFields", siteLanguage),
          variant: "destructive",
        });
        return;
      }

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
          // Save template selections (Creator+ only)
          cover_template: isCreator ? coverTemplate : 'cover_full_image',
          content_template: isCreator ? contentTemplate : 'content_text_only',
        })
        .select()
        .single();

      if (insertError) throw insertError;
      
      // Store carousel ID for editing
      setCurrentCarouselId(carousel.id);
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
        language: carouselLanguage,
        profile: profileIdentity.username ? profileIdentity : undefined,
        customization: isCreator ? {
          fontId: templateCustomization.fontId,
          gradientId: templateCustomization.gradientId,
          customGradientColors: templateCustomization.customGradientColors,
          // Merge cover slideImages with per-slide images (per-slide takes priority)
          slideImages: perSlideImages.length > 0
            ? Array.from({ length: slideCountMode === "auto" ? 6 : manualSlideCount }, (_, i) => {
                const perSlide = perSlideImages.find(img => img.slideIndex === i);
                if (perSlide?.publicUrl) return perSlide.publicUrl;
                return templateCustomization.slideImages?.[i] || null;
              })
            : templateCustomization.slideImages,
          textAlignment: templateCustomization.textAlignment,
          showNavigationDots: templateCustomization.showNavigationDots,
          showNavigationArrow: templateCustomization.showNavigationArrow,
          coverTemplate,
          contentTemplate,
        } : undefined
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
              {t("create", "limitReachedTitle", siteLanguage)}
            </DialogTitle>
            <DialogDescription>
              {t("create", "limitReachedDesc", siteLanguage)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-accent/10 rounded-lg p-4 my-4">
            <div className="font-semibold text-lg mb-2">{t("create", "proPlan", siteLanguage)}</div>
            <div className="text-2xl font-bold text-accent mb-2">{getPlanPrice("starter", siteLanguage)}<span className="text-sm font-normal text-muted-foreground">{t("common", "perMonth", siteLanguage)}</span></div>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>✓ {t("create", "unlimitedCarousels", siteLanguage)}</li>
              <li>✓ {t("create", "noWatermark", siteLanguage)}</li>
              <li>✓ {t("create", "completeHistory", siteLanguage)}</li>
              <li>✓ {t("create", "zipDownload", siteLanguage)}</li>
            </ul>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)} className="w-full sm:w-auto">
              {t("common", "back", siteLanguage)}
            </Button>
            <Button variant="accent" onClick={handleUpgrade} disabled={checkoutLoading} className="w-full sm:w-auto">
              {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Crown className="w-4 h-4 mr-2" />}
              {t("create", "subscribePro", siteLanguage)}
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
      <main className={cn(
        "container mx-auto px-4 py-8",
        currentStep === "customize" ? "max-w-4xl" : "max-w-2xl"
      )}>
        {/* Free user warning - only show when subscription status is loaded and user is not Pro */}
        {!subLoading && !isPro && currentStep !== "processing" && currentStep !== "preview" && (
          <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                <Crown className="w-4 h-4 text-accent" />
              </div>
              <div className="text-sm">
                <span className="font-medium">{t("create", "freePlan", siteLanguage)}</span>
                <span className="text-muted-foreground"> • {carouselCount}/1 {t("create", "carouselUsed", siteLanguage)}</span>
                {carouselCount >= 1 && (
                  <span className="text-destructive ml-1">({t("create", "limitReached", siteLanguage)})</span>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowUpgradeDialog(true)} className="text-xs">
              {t("create", "upgradePro", siteLanguage)}
            </Button>
          </div>
        )}

        {/* Mobile step indicator */}
        <div className="md:hidden mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {t("create", "step", siteLanguage)} {getCurrentStepIndex() + 1} {t("create", "of", siteLanguage)} {steps.length}
            </span>
            <span className="text-sm font-medium">{steps[getCurrentStepIndex()]?.title}</span>
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
                <h1 className="text-2xl font-bold mb-2">{t("create", "uploadAudio", siteLanguage)}</h1>
                <p className="text-muted-foreground">{t("create", "uploadSubtitle", siteLanguage)}</p>
              </div>
              
              <AudioUploader
                audioFile={audioFile}
                setAudioFile={setAudioFile}
                audioDuration={audioDuration}
                setAudioDuration={setAudioDuration}
                onRecordingStateChange={setIsRecordingAudio}
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
              
              <div className="lg:grid lg:grid-cols-[1fr,280px] lg:gap-8">
                {/* Form options - Organized in logical order */}
                <div className="space-y-8">
                  {/* 1. Profile Identity */}
                  <ProfileIdentitySelector
                    profile={profileIdentity}
                    setProfile={setProfileIdentity}
                    showValidation={showProfileValidation}
                  />

                  {/* 2. Slide Count */}
                  <div className="border-t border-border pt-8">
                    <SlideCountSelector
                      mode={slideCountMode}
                      setMode={setSlideCountMode}
                      manualCount={manualSlideCount}
                      setManualCount={setManualSlideCount}
                    />
                  </div>

                  {/* 3. Language */}
                  <div className="border-t border-border pt-8">
                    <LanguageSelector
                      value={carouselLanguage}
                      onChange={setCarouselLanguage}
                    />
                  </div>

                  {/* 4. Text Mode + Tone + Font/Alignment (unified) */}
                  <div className="border-t border-border pt-8">
                    <TextModeSelector
                      selectedMode={selectedTextMode}
                      setSelectedMode={setSelectedTextMode}
                      creativeTone={creativeTone}
                      setCreativeTone={setCreativeTone}
                      fontId={templateCustomization.fontId}
                      onFontChange={(fontId) => setTemplateCustomization({ ...templateCustomization, fontId })}
                      textAlignment={templateCustomization.textAlignment}
                      onTextAlignmentChange={(textAlignment) => setTemplateCustomization({ ...templateCustomization, textAlignment })}
                      isCreator={isCreator}
                    />
                  </div>

                  {/* 5. Visual Style */}
                  <div className="border-t border-border pt-8">
                    <StyleSelector
                      selectedStyle={selectedStyle}
                      setSelectedStyle={setSelectedStyle}
                    />
                  </div>

                  {/* 6. Format */}
                  <div className="border-t border-border pt-8">
                    <FormatSelector
                      selectedFormat={selectedFormat}
                      setSelectedFormat={setSelectedFormat}
                    />
                  </div>

                  {/* 7. Cover Options - Creator+ only */}
                  <div className="border-t border-border pt-8">
                    <CoverOptionsEditor
                      gradientId={templateCustomization.gradientId}
                      customGradientColors={templateCustomization.customGradientColors}
                      slideImages={templateCustomization.slideImages}
                      onGradientChange={(gradientId, customColors) =>
                        setTemplateCustomization({
                          ...templateCustomization,
                          gradientId,
                          customGradientColors: customColors
                        })
                      }
                      onSlideImagesChange={(slideImages) =>
                        setTemplateCustomization({ ...templateCustomization, slideImages })
                      }
                      slideCount={manualSlideCount}
                      isCreator={isCreator}
                      userId={user?.id}
                    />
                  </div>

                  {/* 8. Layout Templates - Creator+ only */}
                  <div className="border-t border-border pt-8">
                    <LayoutTemplateSelector
                      selectedCoverTemplate={coverTemplate}
                      selectedContentTemplate={contentTemplate}
                      onCoverTemplateChange={setCoverTemplate}
                      onContentTemplateChange={setContentTemplate}
                      isCreator={isCreator}
                    />
                  </div>

                  {/* 8.5 Per-Slide Image Upload - Creator+ only, shown when templates require images */}
                  {isCreator && (templateRequiresImage(coverTemplate) || templateRequiresImage(contentTemplate)) && (
                    <div className="border-t border-border pt-8">
                      <SlideImageUploader
                        carouselId={tempCarouselId}
                        userId={user?.id || ''}
                        slideCount={slideCountMode === "auto" ? 6 : manualSlideCount}
                        coverTemplate={coverTemplate}
                        contentTemplate={contentTemplate}
                        slideImages={perSlideImages}
                        onSlideImagesChange={setPerSlideImages}
                        isCreator={isCreator}
                      />
                    </div>
                  )}

                  {/* 9. Advanced Options - Creator+ only */}
                  <div className="border-t border-border pt-8">
                    <AdvancedOptionsEditor
                      showNavigationDots={templateCustomization.showNavigationDots}
                      showNavigationArrow={templateCustomization.showNavigationArrow}
                      onNavigationDotsChange={(showNavigationDots) =>
                        setTemplateCustomization({ ...templateCustomization, showNavigationDots })
                      }
                      onNavigationArrowChange={(showNavigationArrow) =>
                        setTemplateCustomization({ ...templateCustomization, showNavigationArrow })
                      }
                      isCreator={isCreator}
                    />
                  </div>
                </div>

                {/* Live Preview - Sticky sidebar on desktop */}
                <div className="hidden lg:block">
                  <div className="sticky top-24">
                    <LiveCarouselPreview
                      profile={profileIdentity}
                      style={selectedStyle}
                      format={selectedFormat}
                      template={selectedTemplate}
                      tone={selectedTone}
                      slideCount={slideCountMode === "auto" ? 6 : manualSlideCount}
                      fontId={templateCustomization.fontId}
                      gradientId={templateCustomization.gradientId}
                      customGradientColors={templateCustomization.customGradientColors}
                      textAlignment={templateCustomization.textAlignment}
                      coverTemplate={coverTemplate}
                      contentTemplate={contentTemplate}
                    />
                  </div>
                </div>
              </div>

              {/* Mobile Live Preview - Collapsible */}
              <div className="lg:hidden border-t border-border pt-8 mt-8">
                <LiveCarouselPreview
                  profile={profileIdentity}
                  style={selectedStyle}
                  format={selectedFormat}
                  template={selectedTemplate}
                  tone={selectedTone}
                  slideCount={slideCountMode === "auto" ? 6 : manualSlideCount}
                  fontId={templateCustomization.fontId}
                  gradientId={templateCustomization.gradientId}
                  customGradientColors={templateCustomization.customGradientColors}
                  textAlignment={templateCustomization.textAlignment}
                  coverTemplate={coverTemplate}
                  contentTemplate={contentTemplate}
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
                <h1 className="text-2xl font-bold mb-2">
                  {isCarouselLocked
                    ? (siteLanguage === "pt-BR" ? "Pronto para baixar! 🎉" : siteLanguage === "es" ? "¡Listo para descargar! 🎉" : "Ready to download! 🎉")
                    : (isPro
                      ? (siteLanguage === "pt-BR" ? "Revise seu carrossel" : siteLanguage === "es" ? "Revisa tu carrusel" : "Review your carousel")
                      : t("create", "carouselReady", siteLanguage) + " 🎉")}
                </h1>
                <p className="text-muted-foreground">
                  {isCarouselLocked
                    ? (siteLanguage === "pt-BR" ? "Escolha o formato e baixe seus slides" : siteLanguage === "es" ? "Elige el formato y descarga tus slides" : "Choose the format and download your slides")
                    : (isPro
                      ? (siteLanguage === "pt-BR" ? "Edite os textos se necessário e finalize" : siteLanguage === "es" ? "Edita los textos si es necesario y finaliza" : "Edit the texts if needed and finalize")
                      : t("create", "generatedSuccess", siteLanguage))}
                  {" "}• {generatedSlides.length} slides
                </p>
                {!isPro && (
                  <p className="text-sm text-amber-500 mt-2">
                    ⚠️ {t("create", "watermarkWarning", siteLanguage)}
                  </p>
                )}
              </div>

              {/* Locked = Download view */}
              {isCarouselLocked ? (
                <>
                  <CarouselDownloadView
                    slides={generatedSlides}
                    isPro={isPro}
                  />
                  <div className="flex justify-center mt-6 pt-6 border-t border-border">
                    <Button
                      variant="outline"
                      onClick={() => navigate("/dashboard")}
                    >
                      {t("create", "viewDashboard", siteLanguage)}
                    </Button>
                  </div>
                </>
              ) : isPro ? (
                <CarouselEditView
                  slides={generatedSlides}
                  onSlidesUpdate={setGeneratedSlides}
                  onFinalize={handleFinalizeEdit}
                  isRegenerating={isRegenerating}
                  regeneratingProgress={regeneratingProgress || undefined}
                  format={selectedFormat}
                />
              ) : (
                <>
                  <CarouselPreview
                    slides={generatedSlides}
                    onDownloadAll={handleDownloadAll}
                    isPro={isPro}
                  />
                  <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6 border-t border-border pt-6">
                    <Button
                      variant="accent"
                      onClick={() => setShowUpgradeDialog(true)}
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      {t("create", "removeWatermark", siteLanguage)}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/dashboard")}
                    >
                      {t("create", "viewDashboard", siteLanguage)}
                    </Button>
                  </div>
                </>
              )}
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
