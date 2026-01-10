import { cn } from "@/lib/utils";
import { ProfileIdentity } from "./ProfileIdentitySelector";
import { StyleType } from "./StyleSelector";
import { FormatType } from "./FormatSelector";
import { TemplateId, GRADIENT_PRESETS, AVAILABLE_FONTS, FontId, GradientId } from "@/lib/constants";
import { TextAlignment } from "./AdvancedTemplateEditor";
import { CoverTemplateType, ContentTemplateType, templateRequiresImage } from "@/lib/templates";
import { motion } from "framer-motion";
import { Eye, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
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
  // Customization props
  fontId?: FontId;
  gradientId?: GradientId;
  customGradientColors?: string[];
  textAlignment?: TextAlignment;
  // New layout template props (Creator+ only)
  coverTemplate?: CoverTemplateType;
  contentTemplate?: ContentTemplateType;
}

// Sample content for different tones (simulated preview) - using translations
const getSampleContent = (language: string) => ({
  EMOTIONAL: [
    { type: "HOOK", text: t("livePreview", "sampleEmotionalHook", language) },
    { type: "SETUP", text: t("livePreview", "sampleEmotionalSetup", language) },
    { type: "CONFLICT", text: t("livePreview", "sampleEmotionalConflict", language) },
    { type: "RESOLUTION", text: t("livePreview", "sampleEmotionalResolution", language) },
    { type: "CTA", text: t("livePreview", "sampleEmotionalCTA", language) },
    { type: "SIGNATURE", text: "" },
  ],
  PROFESSIONAL: [
    { type: "HOOK", text: t("livePreview", "sampleProfessionalHook", language) },
    { type: "WHY", text: t("livePreview", "sampleProfessionalWhy", language) },
    { type: "HOW", text: t("livePreview", "sampleProfessionalHow", language) },
    { type: "WHAT", text: t("livePreview", "sampleProfessionalWhat", language) },
    { type: "CTA", text: t("livePreview", "sampleProfessionalCTA", language) },
    { type: "SIGNATURE", text: "" },
  ],
  PROVOCATIVE: [
    { type: "HOOK", text: t("livePreview", "sampleProvocativeHook", language) },
    { type: "PATTERN_BREAK", text: t("livePreview", "sampleProvocativePatternBreak", language) },
    { type: "UNCOMFORTABLE_TRUTH", text: t("livePreview", "sampleProvocativeUncomfortableTruth", language) },
    { type: "REFRAME", text: t("livePreview", "sampleProvocativeReframe", language) },
    { type: "CTA", text: t("livePreview", "sampleProvocativeCTA", language) },
    { type: "SIGNATURE", text: "" },
  ],
});

const LiveCarouselPreview = ({
  profile,
  style,
  format,
  template,
  tone,
  slideCount,
  className,
  fontId = 'inter',
  gradientId = 'none',
  customGradientColors,
  textAlignment = 'center',
  coverTemplate = 'cover_full_image',
  contentTemplate = 'content_text_only',
}: LiveCarouselPreviewProps) => {
  const { language } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);

  const isDark = style === "BLACK_WHITE";
  const hasGradient = gradientId && gradientId !== 'none';

  // Check if current slide uses a template that requires images
  const isCoverSlide = currentSlide === 0;
  const currentTemplateRequiresImage = isCoverSlide
    ? templateRequiresImage(coverTemplate)
    : templateRequiresImage(contentTemplate);

  // Get gradient colors
  const getGradientColors = (): string[] | null => {
    if (gradientId === 'custom' && customGradientColors && customGradientColors.length >= 2) {
      return customGradientColors;
    }
    if (gradientId && gradientId !== 'none') {
      const preset = GRADIENT_PRESETS.find(g => g.id === gradientId);
      return preset?.colors ? [...preset.colors] : null;
    }
    return null;
  };

  const gradientColors = getGradientColors();

  // Get font family from fontId
  const fontFamily = AVAILABLE_FONTS.find(f => f.id === fontId)?.family || 'Inter, system-ui, sans-serif';

  // Background style - solid color or gradient
  const bgColor = hasGradient ? '' : (isDark ? "bg-[#0A0A0A]" : "bg-white");
  const bgStyle = gradientColors
    ? { background: `linear-gradient(135deg, ${gradientColors.join(', ')})` }
    : {};

  // Text color - white on gradients/dark, dark on light
  const useWhiteText = hasGradient || isDark;
  const textColor = useWhiteText ? "text-white" : "text-[#0A0A0A]";
  const mutedColor = useWhiteText ? "text-white/70" : "text-[#0A0A0A]/70";
  const borderColor = useWhiteText ? "border-white/10" : "border-[#0A0A0A]/10";

  // Text alignment - only horizontal, keep vertical centered
  const textAlignClass = {
    'left': 'text-left',
    'center': 'text-center',
    'right': 'text-right',
  }[textAlignment] || 'text-center';

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

  // Get sample content based on tone (with translations)
  const sampleContent = getSampleContent(language);
  const sampleSlides = sampleContent[tone as keyof typeof sampleContent] || sampleContent.PROFESSIONAL;
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
      {/* Header with warning badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Eye className="w-4 h-4" />
          <span>{t("livePreview", "title", language)}</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
          {t("livePreview", "onlyDesign", language)}
        </span>
      </div>

      {/* Preview Card */}
      <div className="relative">
        <motion.div
          key={`${style}-${format}-${currentSlide}-${gradientId}-${fontId}-${textAlignment}-${coverTemplate}-${contentTemplate}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "relative rounded-xl overflow-hidden shadow-lg mx-auto",
            bgColor,
            getAspectRatio(),
            format === "STORY" ? "max-w-[200px]" : "max-w-[280px]"
          )}
          style={{ ...bgStyle, fontFamily }}
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
                    alt={profile.name ? `${profile.name}'s avatar` : "Profile avatar"}
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

          {/* Content - Layout varies based on template */}
          {isCoverSlide ? (
            // Cover slide layouts
            <div className={cn("absolute inset-0 flex flex-col", textColor)}>
              {coverTemplate === 'cover_split_images' ? (
                // 2x2 grid layout
                <>
                  <div className="grid grid-cols-2 gap-1 p-2 pt-8 flex-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "rounded flex items-center justify-center",
                          isDark ? "bg-white/10" : "bg-black/5"
                        )}
                      >
                        <ImageIcon className="w-3 h-3 opacity-30" />
                      </div>
                    ))}
                  </div>
                  <div className={cn("p-2 pb-4", textAlignClass)}>
                    <p className="text-[10px] font-semibold leading-tight">
                      {currentContent?.text}
                    </p>
                  </div>
                </>
              ) : coverTemplate === 'cover_gradient_overlay' ? (
                // Gradient overlay with centered text
                <>
                  <div className="absolute inset-0 bg-gradient-to-b from-accent/40 to-black/80" />
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <p className={cn("text-xs font-bold text-center text-white drop-shadow-lg")}>
                      {currentContent?.text}
                    </p>
                  </div>
                </>
              ) : (
                // Default full image layout
                <>
                  {currentTemplateRequiresImage && (
                    <div className={cn(
                      "absolute inset-0 flex items-center justify-center",
                      isDark ? "bg-white/5" : "bg-black/5"
                    )}>
                      <ImageIcon className="w-6 h-6 opacity-20" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                    <p className={cn("text-xs font-semibold text-white", textAlignClass)}>
                      {currentContent?.text}
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            // Content slide layouts
            <div className={cn("absolute inset-0 flex", textColor)}>
              {contentTemplate === 'content_image_top' ? (
                // Image top, text bottom
                <div className="flex flex-col w-full">
                  <div className={cn(
                    "flex-1 m-2 mt-8 rounded flex items-center justify-center",
                    isDark ? "bg-white/10" : "bg-black/5"
                  )}>
                    <ImageIcon className="w-4 h-4 opacity-30" />
                  </div>
                  <div className={cn("p-2 pb-4", textAlignClass)}>
                    <p className="text-[9px] leading-relaxed">
                      {isSignatureSlide ? `@${profile.username}` : currentContent?.text}
                    </p>
                  </div>
                </div>
              ) : contentTemplate === 'content_text_top' ? (
                // Text top, image bottom
                <div className="flex flex-col w-full">
                  <div className={cn("p-2 pt-8", textAlignClass)}>
                    <p className="text-[9px] leading-relaxed">
                      {isSignatureSlide ? `@${profile.username}` : currentContent?.text}
                    </p>
                  </div>
                  <div className={cn(
                    "flex-1 m-2 mb-4 rounded flex items-center justify-center",
                    isDark ? "bg-white/10" : "bg-black/5"
                  )}>
                    <ImageIcon className="w-4 h-4 opacity-30" />
                  </div>
                </div>
              ) : contentTemplate === 'content_split' ? (
                // Split layout (alternating sides)
                <div className={cn(
                  "flex w-full pt-8 pb-4 gap-1 px-1",
                  currentSlide % 2 === 0 ? "flex-row" : "flex-row-reverse"
                )}>
                  <div className={cn(
                    "w-1/2 rounded flex items-center justify-center",
                    isDark ? "bg-white/10" : "bg-black/5"
                  )}>
                    <ImageIcon className="w-3 h-3 opacity-30" />
                  </div>
                  <div className={cn("w-1/2 flex items-center p-1", textAlignClass)}>
                    <p className="text-[8px] leading-relaxed">
                      {isSignatureSlide ? `@${profile.username}` : currentContent?.text}
                    </p>
                  </div>
                </div>
              ) : (
                // Default text only
                <div className="flex items-center justify-center w-full px-4">
                  <div className={cn("space-y-1 w-full", textAlignClass)}>
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
              )}
            </div>
          )}

          {/* Legacy template indicator */}
          {template === "gradient" && !hasGradient && (
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
      <div className="flex justify-center gap-1.5" role="tablist" aria-label={t("livePreview", "slideNavigation", language)}>
        {visibleSlides.map((_, index) => (
          <button
            key={index}
            type="button"
            role="tab"
            onClick={() => setCurrentSlide(index)}
            aria-label={`${t("livePreview", "goToSlide", language)} ${index + 1}`}
            aria-selected={index === currentSlide}
            aria-current={index === currentSlide ? "true" : undefined}
            className={cn(
              "w-6 h-6 rounded-full transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2",
              index === currentSlide
                ? "bg-accent"
                : "bg-transparent hover:bg-muted-foreground/20"
            )}
          >
            <span className={cn(
              "rounded-full transition-all",
              index === currentSlide
                ? "w-4 h-1.5 bg-accent-foreground"
                : "w-1.5 h-1.5 bg-muted-foreground/50"
            )} />
          </button>
        ))}
      </div>

      {/* Warning text with better visibility */}
      <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
        <p className="text-xs text-center text-amber-700 dark:text-amber-300">
          {t("livePreview", "description", language)}
        </p>
      </div>
    </div>
  );
};

export default LiveCarouselPreview;
