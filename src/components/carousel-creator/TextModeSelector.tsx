import { Minimize2, Sparkles, FileText, CheckCircle2, Heart, Briefcase, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { TEXT_MODES, TextModeId, getTextModeLabel } from "@/lib/constants";
import { useLanguage, useTranslation } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";

export type CreativeTone = "emotional" | "professional" | "provocative";

interface TextModeSelectorProps {
  selectedMode: TextModeId;
  setSelectedMode: (mode: TextModeId) => void;
  creativeTone: CreativeTone;
  setCreativeTone: (tone: CreativeTone) => void;
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
  setCreativeTone
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
          <h3 className="text-lg font-semibold mb-1">Modo de Texto</h3>
          <p className="text-sm text-muted-foreground">
            Como a IA deve processar seu conteúdo
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
            💡 O modo Texto Único gera uma imagem com texto mais longo, ideal para threads ou conteúdo educativo denso.
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
    </div>
  );
};

export default TextModeSelector;
