import { Card, CardContent } from "@/components/ui/card";
import { Heart, Briefcase, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useLanguage";

export type ToneType = "EMOTIONAL" | "PROFESSIONAL" | "PROVOCATIVE";

interface ToneSelectorProps {
  selectedTone: ToneType;
  setSelectedTone: (tone: ToneType) => void;
}

const ToneSelector = ({ selectedTone, setSelectedTone }: ToneSelectorProps) => {
  const { t } = useTranslation();

  const tones = [
    {
      id: "EMOTIONAL" as ToneType,
      name: t("toneSelector", "emotional"),
      description: t("toneSelector", "emotionalDesc"),
      icon: Heart,
      gradient: "from-pink-500/20 to-rose-500/20",
      iconColor: "text-pink-500",
      borderColor: "border-pink-500/50",
    },
    {
      id: "PROFESSIONAL" as ToneType,
      name: t("toneSelector", "professional"),
      description: t("toneSelector", "professionalDesc"),
      icon: Briefcase,
      gradient: "from-blue-500/20 to-cyan-500/20",
      iconColor: "text-blue-500",
      borderColor: "border-blue-500/50",
    },
    {
      id: "PROVOCATIVE" as ToneType,
      name: t("toneSelector", "provocative"),
      description: t("toneSelector", "provocativeDesc"),
      icon: Zap,
      gradient: "from-orange-500/20 to-amber-500/20",
      iconColor: "text-orange-500",
      borderColor: "border-orange-500/50",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-1">{t("toneSelector", "title")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("toneSelector", "subtitle")}
        </p>
      </div>

      <div className="grid gap-4">
        {tones.map((tone) => {
          const Icon = tone.icon;
          const isSelected = selectedTone === tone.id;

          return (
            <Card
              key={tone.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                isSelected 
                  ? `${tone.borderColor} bg-gradient-to-br ${tone.gradient}` 
                  : "hover:border-muted-foreground/30"
              )}
              onClick={() => setSelectedTone(tone.id)}
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
  );
};

export default ToneSelector;