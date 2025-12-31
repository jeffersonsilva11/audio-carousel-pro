import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/translations";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { LottieAnimation } from "@/components/animations/LottieAnimations";
import {
  Mic2,
  Sparkles,
  Image,
  User,
  Instagram,
  Upload,
  Camera,
  ChevronRight,
  ChevronLeft,
  Check,
  Zap,
  Palette,
  X
} from "lucide-react";

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
}

const TOTAL_STEPS = 4;

const OnboardingModal = ({ open, onComplete }: OnboardingModalProps) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [selectedTone, setSelectedTone] = useState<string>("PROFESSIONAL");
  const [selectedStyle, setSelectedStyle] = useState<string>("BLACK_WHITE");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize from user metadata
  useEffect(() => {
    if (user?.user_metadata?.name) {
      setName(user.user_metadata.name);
    }
  }, [user]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: t("profileSettings", "invalidFile", language),
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t("profileSettings", "fileTooLarge", language),
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/profile-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('carousel-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('carousel-images')
        .getPublicUrl(fileName);

      setPhotoUrl(publicUrl);
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: t("profileSettings", "uploadError", language),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Update profile with onboarding data
      const { error } = await supabase
        .from('profiles')
        .update({
          name,
          instagram_handle: username ? `@${username.replace('@', '')}` : null,
          profile_image: photoUrl,
          default_tone: selectedTone,
          default_style: selectedStyle,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: t("onboarding", "welcomeComplete", language),
        description: t("onboarding", "welcomeCompleteDesc", language),
      });

      onComplete();
      navigate('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        title: t("common", "error", language),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!user) return;
    
    // Mark onboarding as completed even if skipped
    await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);
    
    onComplete();
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, TOTAL_STEPS));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const progress = (step / TOTAL_STEPS) * 100;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';
  };

  const tones = [
    { id: "EMOTIONAL", icon: Sparkles, color: "text-pink-500", bgColor: "bg-pink-500/10" },
    { id: "PROFESSIONAL", icon: Zap, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { id: "PROVOCATIVE", icon: Mic2, color: "text-orange-500", bgColor: "bg-orange-500/10" },
  ];

  const styles = [
    { id: "BLACK_WHITE", bg: "bg-black", text: "text-white", label: "Preto" },
    { id: "WHITE_BLACK", bg: "bg-white border", text: "text-black", label: "Branco" },
  ];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden" hideCloseButton>
        {/* Header with progress */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">
              {t("onboarding", "stepOf", language).replace("{current}", String(step)).replace("{total}", String(TOTAL_STEPS))}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground"
            >
              {t("onboarding", "skip", language)}
            </Button>
          </div>
          <Progress value={progress} className="h-1" />
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="text-center space-y-6">
              <div className="relative inline-flex">
                <LottieAnimation type="success" size={100} loop={false} />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  {t("onboarding", "welcomeTitle", language)}
                </h2>
                <p className="text-muted-foreground">
                  {t("onboarding", "welcomeDesc", language)}
                </p>
              </div>

              {/* Feature highlights */}
              <div className="grid gap-3 text-left">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <Mic2 className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{t("onboarding", "feature1Title", language)}</p>
                    <p className="text-xs text-muted-foreground">{t("onboarding", "feature1Desc", language)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{t("onboarding", "feature2Title", language)}</p>
                    <p className="text-xs text-muted-foreground">{t("onboarding", "feature2Desc", language)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <Image className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{t("onboarding", "feature3Title", language)}</p>
                    <p className="text-xs text-muted-foreground">{t("onboarding", "feature3Desc", language)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Profile Setup */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold mb-2">
                  {t("onboarding", "profileTitle", language)}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {t("onboarding", "profileDesc", language)}
                </p>
              </div>

              {/* Photo upload */}
              <div className="flex justify-center">
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className={cn(
                      "w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-dashed border-border transition-colors hover:border-accent",
                      photoUrl && "border-solid border-accent"
                    )}
                  >
                    {uploading ? (
                      <LottieAnimation type="processing" size={40} />
                    ) : photoUrl ? (
                      <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : name ? (
                      <span className="text-2xl font-bold text-muted-foreground">
                        {getInitials(name)}
                      </span>
                    ) : (
                      <Camera className="w-8 h-8 text-muted-foreground" />
                    )}
                  </button>
                  {!photoUrl && (
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center">
                      <Upload className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>

              {/* Name and Username */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("onboarding", "yourName", language)}</Label>
                  <Input
                    id="name"
                    placeholder={t("onboarding", "namePlaceholder", language)}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={50}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Instagram (opcional)</Label>
                  <div className="relative">
                    <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="username"
                      placeholder="seuusername"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace('@', '').replace(/\s/g, ''))}
                      className="pl-10"
                      maxLength={30}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Tone Selection */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold mb-2">
                  {t("onboarding", "toneTitle", language)}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {t("onboarding", "toneDesc", language)}
                </p>
              </div>

              <div className="space-y-3">
                {tones.map((tone) => {
                  const Icon = tone.icon;
                  return (
                    <button
                      key={tone.id}
                      onClick={() => setSelectedTone(tone.id)}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left",
                        selectedTone === tone.id
                          ? "border-accent bg-accent/5"
                          : "border-border hover:border-accent/50"
                      )}
                    >
                      <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", tone.bgColor)}>
                        <Icon className={cn("w-6 h-6", tone.color)} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{t("tones", tone.id.toLowerCase(), language)}</p>
                        <p className="text-sm text-muted-foreground">
                          {t("tones", `${tone.id.toLowerCase()}Desc`, language)}
                        </p>
                      </div>
                      {selectedTone === tone.id && (
                        <Check className="w-5 h-5 text-accent" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 4: Style Selection */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold mb-2">
                  {t("onboarding", "styleTitle", language)}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {t("onboarding", "styleDesc", language)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {styles.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={cn(
                      "relative aspect-[4/5] rounded-xl overflow-hidden border-2 transition-all",
                      selectedStyle === style.id
                        ? "border-accent ring-2 ring-accent ring-offset-2 ring-offset-background"
                        : "border-border hover:border-accent/50"
                    )}
                  >
                    <div className={cn("w-full h-full flex items-center justify-center p-4", style.bg)}>
                      <p className={cn("text-center text-sm font-medium", style.text)}>
                        {t("onboarding", "sampleText", language)}
                      </p>
                    </div>
                    <div className="absolute bottom-2 inset-x-2 text-center">
                      <span className={cn(
                        "text-xs font-medium px-2 py-1 rounded-full",
                        style.id === "BLACK_WHITE" ? "bg-white/20 text-white" : "bg-black/10 text-black"
                      )}>
                        {style.label}
                      </span>
                    </div>
                    {selectedStyle === style.id && (
                      <div className="absolute top-2 right-2">
                        <div className="w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center">
                          <Check className="w-4 h-4" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <p className="text-center text-sm text-muted-foreground">
                {t("onboarding", "changeAnytime", language)}
              </p>
            </div>
          )}
        </div>

        {/* Footer with navigation */}
        <div className="p-4 border-t flex items-center justify-between">
          {step > 1 ? (
            <Button variant="ghost" onClick={prevStep}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t("common", "back", language)}
            </Button>
          ) : (
            <div />
          )}
          
          {step < TOTAL_STEPS ? (
            <Button onClick={nextStep}>
              {t("common", "next", language)}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={saving}>
              {saving ? (
                <LottieAnimation type="processing" size={20} className="mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-1" />
              )}
              {t("onboarding", "finish", language)}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingModal;
