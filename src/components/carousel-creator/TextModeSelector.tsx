import { Minimize2, Sparkles, FileText, CheckCircle2, Heart, Briefcase, Zap, AlignLeft, AlignCenter, AlignRight, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, Type, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { TEXT_MODES, TextModeId, getTextModeLabel, AVAILABLE_FONTS, FontId } from "@/lib/constants";
import { useLanguage, useTranslation } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LockedFeature } from "@/components/ui/locked-feature";

export type CreativeTone = "emotional" | "professional" | "provocative";
export type TextAlignment = 'left' | 'center' | 'right';
export type VerticalAlignment = 'top' | 'middle' | 'bottom';

interface TextModeSelectorProps {
  selectedMode: TextModeId;
  setSelectedMode: (mode: TextModeId) => void;
  creativeTone: CreativeTone;
  setCreativeTone: (tone: CreativeTone) => void;
  // Creator+ customization props
  fontId?: FontId;
  onFontChange?: (fontId: FontId) => void;
  textAlignment?: TextAlignment;
  onTextAlignmentChange?: (alignment: TextAlignment) => void;
  verticalAlignment?: VerticalAlignment;
  onVerticalAlignmentChange?: (alignment: VerticalAlignment) => void;
  isCreator?: boolean;
}

const iconMap = {
  Minimize2,
  Sparkles,
  FileText,
};

const TextModeSelector = ({
  selectedMode,
  setSelectedMode,
  creativeTone,
  setCreativeTone,
  fontId = 'inter',
  onFontChange,
  textAlignment = 'center',
  onTextAlignmentChange,
  verticalAlignment = 'middle',
  onVerticalAlignmentChange,
  isCreator = false,
}: TextModeSelectorProps) => {
  const { language } = useLanguage();
  const { t } = useTranslation();

  const handleModeChange = (mode: TextModeId) => {
    setSelectedMode(mode);
  };

  // Show tone options for all modes except "compact"
  const showToneOptions = selectedMode !== "compact";

  const tones = [
    {
      id: "emotional" as CreativeTone,
      name: t("toneSelector", "emotional"),
      description: t("toneSelector", "emotionalDesc"),
      icon: Heart,
      gradient: "from-pink-500/20 to-rose-500/20",
      iconColor: "text-pink-500",
      borderColor: "border-pink-500/50",
    },
    {
      id: "professional" as CreativeTone,
      name: t("toneSelector", "professional"),
      description: t("toneSelector", "professionalDesc"),
      icon: Briefcase,
      gradient: "from-blue-500/20 to-cyan-500/20",
      iconColor: "text-blue-500",
      borderColor: "border-blue-500/50",
    },
    {
      id: "provocative" as CreativeTone,
      name: t("toneSelector", "provocative"),
      description: t("toneSelector", "provocativeDesc"),
      icon: Zap,
      gradient: "from-orange-500/20 to-amber-500/20",
      iconColor: "text-orange-500",
      borderColor: "border-orange-500/50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Text Mode Selection */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">{t("textMode", "title")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("textMode", "subtitle")}
          </p>
        </div>

        <div className="space-y-3">
          {TEXT_MODES.map((mode) => {
            const isSelected = selectedMode === mode.id;
            const IconComponent = iconMap[mode.icon as keyof typeof iconMap];

            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => handleModeChange(mode.id)}
                className={cn(
                  "w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left",
                  isSelected
                    ? "border-accent bg-accent/5"
                    : "border-border hover:border-accent/50"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  isSelected ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {IconComponent && <IconComponent className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{getTextModeLabel(mode.nameKey, language)}</span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-accent" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {getTextModeLabel(mode.descriptionKey, language)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Helper text for single mode */}
        {selectedMode === "single" && (
          <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            💡 {t("textMode", "singleModeHint")}
          </p>
        )}
      </div>

      {/* Tone Selection - shown for all modes except compact */}
      {showToneOptions && (
        <div className="space-y-4 pt-4 border-t border-border">
          <div>
            <h3 className="text-lg font-semibold mb-1">{t("toneSelector", "title")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("toneSelector", "subtitle")}
            </p>
          </div>

          <div className="grid gap-3">
            {tones.map((tone) => {
              const Icon = tone.icon;
              const isSelected = creativeTone === tone.id;

              return (
                <Card
                  key={tone.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    isSelected
                      ? `${tone.borderColor} bg-gradient-to-br ${tone.gradient}`
                      : "hover:border-muted-foreground/30"
                  )}
                  onClick={() => setCreativeTone(tone.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                        isSelected ? "bg-background/80" : "bg-muted"
                      )}>
                        <Icon className={cn("w-5 h-5", tone.iconColor)} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{tone.name}</h4>
                          {isSelected && (
                            <span className="text-xs bg-background/80 px-2 py-0.5 rounded-full">
                              {t("toneSelector", "selected")}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {tone.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Font + Alignment - Creator+ only */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold">
            {t("textMode", "textCustomization")}
          </h3>
          <Badge variant="secondary" className="text-[10px] bg-accent/20 text-accent">Creator+</Badge>
        </div>

        {isCreator ? (
          <div className="space-y-4">
            {/* Horizontal Alignment */}
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {t("textMode", "horizontalAlignment")}
              </p>
              <div className="flex gap-2">
                {([
                  { value: 'left' as TextAlignment, icon: AlignLeft, label: t("textMode", "left") },
                  { value: 'center' as TextAlignment, icon: AlignCenter, label: t("textMode", "center") },
                  { value: 'right' as TextAlignment, icon: AlignRight, label: t("textMode", "right") }
                ]).map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => onTextAlignmentChange?.(value)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
                      textAlignment === value
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-accent/50"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Vertical Alignment */}
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {t("textMode", "verticalAlignment")}
              </p>
              <div className="flex gap-2">
                {([
                  { value: 'top' as VerticalAlignment, icon: AlignVerticalJustifyStart, label: t("textMode", "top") },
                  { value: 'middle' as VerticalAlignment, icon: AlignVerticalJustifyCenter, label: t("textMode", "middle") },
                  { value: 'bottom' as VerticalAlignment, icon: AlignVerticalJustifyEnd, label: t("textMode", "bottom") }
                ]).map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => onVerticalAlignmentChange?.(value)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
                      verticalAlignment === value
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-accent/50"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Font Selection */}
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {t("textMode", "font")}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {AVAILABLE_FONTS.map((font) => (
                  <button
                    key={font.id}
                    onClick={() => onFontChange?.(font.id)}
                    className={cn(
                      "p-3 rounded-lg border-2 transition-all text-center",
                      fontId === font.id
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-accent/50"
                    )}
                  >
                    <span
                      className="block text-lg font-medium truncate"
                      style={{ fontFamily: font.family }}
                    >
                      Abc
                    </span>
                    <span className="text-xs text-muted-foreground mt-1 block truncate">
                      {font.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <LockedFeature
            requiredPlan="creator"
            title={t("textMode", "fontAndAlignment")}
            description={t("textMode", "customizeFontAndAlignment")}
            icon={Type}
            features={[
              t("textMode", "exclusiveFonts"),
              t("textMode", "customAlignment"),
              t("textMode", "realtimePreview")
            ]}
            hasAccess={false}
          />
        )}
      </div>
    </div>
  );
};

export default TextModeSelector;
