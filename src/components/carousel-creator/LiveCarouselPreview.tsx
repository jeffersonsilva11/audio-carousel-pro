import { cn } from "@/lib/utils";
import { ProfileIdentity } from "./ProfileIdentitySelector";
import { StyleType } from "./StyleSelector";
import { FormatType } from "./FormatSelector";
import { TemplateId } from "@/lib/constants";
import { motion } from "framer-motion";
import { Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/translations";

interface LiveCarouselPreviewProps {
  profile: ProfileIdentity;
  style: StyleType;
  format: FormatType;
  template: TemplateId;
  tone: string;
  slideCount: number;
  className?: string;
}

// Sample content for different tones (simulated preview)
const SAMPLE_CONTENT = {
  EMOTIONAL: [
    { type: "HOOK", text: "Você não está sozinho nessa jornada..." },
    { type: "SETUP", text: "Eu também passei por isso há 3 anos" },
    { type: "CONFLICT", text: "O ponto de virada veio quando..." },
    { type: "RESOLUTION", text: "Hoje eu entendo que a dor foi necessária" },
    { type: "CTA", text: "E você, qual foi seu momento de virada?" },
    { type: "SIGNATURE", text: "" },
  ],
  PROFESSIONAL: [
    { type: "HOOK", text: "87% das empresas cometem esse erro" },
    { type: "WHY", text: "O motivo é simples: falta de estratégia" },
    { type: "HOW", text: "O framework que usamos é em 3 passos" },
    { type: "WHAT", text: "Implemente hoje e veja resultados em 7 dias" },
    { type: "CTA", text: "Quer o guia completo? Comente 'EU QUERO'" },
    { type: "SIGNATURE", text: "" },
  ],
  PROVOCATIVE: [
    { type: "HOOK", text: "Você não é produtivo. Você é ansioso." },
    { type: "PATTERN_BREAK", text: "Acordar às 5h não te faz melhor" },
    { type: "UNCOMFORTABLE_TRUTH", text: "Você confunde movimento com progresso" },
    { type: "REFRAME", text: "Menos horas, mais foco, melhores resultados" },
    { type: "CTA", text: "Quando você vai parar de se enganar?" },
    { type: "SIGNATURE", text: "" },
  ],
};

const LiveCarouselPreview = ({
  profile,
  style,
  format,
  template,
  tone,
  slideCount,
  className,
}: LiveCarouselPreviewProps) => {
  const { language } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const isDark = style === "BLACK_WHITE";
  const bgColor = isDark ? "bg-[#0A0A0A]" : "bg-white";
  const textColor = isDark ? "text-white" : "text-[#0A0A0A]";
  const mutedColor = isDark ? "text-white/70" : "text-[#0A0A0A]/70";
  const borderColor = isDark ? "border-white/10" : "border-[#0A0A0A]/10";

  // Get aspect ratio based on format
  const getAspectRatio = () => {
    switch (format) {
      case "POST_PORTRAIT":
        return "aspect-[4/5]";
      case "STORY":
        return "aspect-[9/16]";
      default:
        return "aspect-square";
    }
  };

  // Get sample content based on tone
  const sampleSlides = SAMPLE_CONTENT[tone as keyof typeof SAMPLE_CONTENT] || SAMPLE_CONTENT.PROFESSIONAL;
  const visibleSlides = sampleSlides.slice(0, Math.min(slideCount, sampleSlides.length));

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Calculate position classes based on avatarPosition
  const getPositionClasses = () => {
    switch (profile.avatarPosition) {
      case "top-right":
        return "top-2 right-2 flex-row-reverse";
      case "bottom-left":
        return "bottom-2 left-2";
      case "bottom-right":
        return "bottom-2 right-2 flex-row-reverse";
      default:
        return "top-2 left-2";
    }
  };

  const getTextAlign = () => {
    return profile.avatarPosition.includes("right") ? "text-right" : "text-left";
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % visibleSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + visibleSlides.length) % visibleSlides.length);
  };

  const currentContent = visibleSlides[currentSlide];
  const isSignatureSlide = currentContent?.type === "SIGNATURE";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Eye className="w-4 h-4" />
        <span>{t("livePreview", "title", language)}</span>
      </div>

      {/* Preview Card */}
      <div className="relative">
        <motion.div
          key={`${style}-${format}-${currentSlide}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "relative rounded-xl overflow-hidden shadow-lg mx-auto",
            bgColor,
            getAspectRatio(),
            format === "STORY" ? "max-w-[200px]" : "max-w-[280px]"
          )}
        >
          {/* Slide counter */}
          <div
            className={cn(
              "absolute top-2 right-2 text-xs font-medium z-10",
              textColor,
              "opacity-50"
            )}
          >
            {currentSlide + 1}/{visibleSlides.length}
          </div>

          {/* Profile identity */}
          {profile.username && (
            <div
              className={cn(
                "absolute flex items-center gap-1.5 z-10",
                getPositionClasses()
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "w-6 h-6 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0",
                  isDark ? "bg-white/15" : "bg-[#0A0A0A]/10"
                )}
              >
                {profile.photoUrl ? (
                  <img
                    src={profile.photoUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className={cn("text-[10px] font-semibold", textColor)}>
                    {getInitials(profile.name)}
                  </span>
                )}
              </div>

              {/* Name and username */}
              <div className={getTextAlign()}>
                {profile.displayMode === "name_and_username" && profile.name && (
                  <p
                    className={cn("text-[10px] font-semibold leading-tight", textColor)}
                  >
                    {profile.name}
                  </p>
                )}
                <p className={cn("text-[10px] leading-tight", mutedColor)}>
                  @{profile.username}
                </p>
              </div>
            </div>
          )}

          {/* Content */}
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center px-4",
              textColor
            )}
          >
            <div className="text-center space-y-1">
              {isSignatureSlide ? (
                <>
                  {profile.name && (
                    <p className="text-sm font-semibold">{profile.name}</p>
                  )}
                  {profile.username && (
                    <p className={cn("text-xs", mutedColor)}>@{profile.username}</p>
                  )}
                </>
              ) : (
                <p className="text-xs font-medium leading-relaxed px-2">
                  {currentContent?.text}
                </p>
              )}
            </div>
          </div>

          {/* Template indicator */}
          {template === "gradient" && (
            <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-primary/20 pointer-events-none" />
          )}
        </motion.div>

        {/* Navigation arrows */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm shadow-sm border border-border hover:bg-background"
          onClick={prevSlide}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm shadow-sm border border-border hover:bg-background"
          onClick={nextSlide}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Slide dots */}
      <div className="flex justify-center gap-1.5">
        {visibleSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all",
              index === currentSlide
                ? "bg-accent w-4"
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
          />
        ))}
      </div>

      {/* Info text */}
      <p className="text-xs text-center text-muted-foreground">
        {t("livePreview", "description", language)}
      </p>
    </div>
  );
};

export default LiveCarouselPreview;
