import { useState } from "react";
import { Minimize2, Sparkles, FileText, CheckCircle2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TEXT_MODES, TextModeId } from "@/lib/constants";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export type CreativeTone = "emotional" | "professional" | "provocative";

interface TextModeSelectorProps {
  selectedMode: TextModeId;
  setSelectedMode: (mode: TextModeId) => void;
  creativeTone: CreativeTone;
  setCreativeTone: (tone: CreativeTone) => void;
}

const CREATIVE_TONES: { id: CreativeTone; label: string; description: string }[] = [
  { id: "emotional", label: "Emocional", description: "Conecta pelo sentimento" },
  { id: "professional", label: "Profissional", description: "Tom sério e confiável" },
  { id: "provocative", label: "Provocador", description: "Desperta curiosidade" },
];

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
  const [isCreativeOpen, setIsCreativeOpen] = useState(selectedMode === "creative");

  const handleModeChange = (mode: TextModeId) => {
    setSelectedMode(mode);
    if (mode === "creative") {
      setIsCreativeOpen(true);
    }
  };

  return (
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
          const isCreative = mode.id === "creative";

          return (
            <div key={mode.id}>
              <button
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
                    <span className="font-medium">{mode.name}</span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-accent" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {mode.description}
                  </p>
                </div>

                {isCreative && isSelected && (
                  <ChevronDown className={cn(
                    "w-5 h-5 text-muted-foreground transition-transform shrink-0",
                    isCreativeOpen && "rotate-180"
                  )} />
                )}
              </button>

              {/* Creative mode sub-options */}
              {isCreative && isSelected && (
                <Collapsible open={isCreativeOpen} onOpenChange={setIsCreativeOpen}>
                  <CollapsibleContent>
                    <div className="ml-14 mt-3 p-4 bg-muted/50 rounded-lg border border-border">
                      <Label className="text-sm font-medium mb-3 block">
                        Escolha o tom criativo:
                      </Label>
                      <RadioGroup
                        value={creativeTone}
                        onValueChange={(value) => setCreativeTone(value as CreativeTone)}
                        className="space-y-2"
                      >
                        {CREATIVE_TONES.map((tone) => (
                          <label
                            key={tone.id}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all",
                              creativeTone === tone.id
                                ? "bg-accent/10 border border-accent/30"
                                : "hover:bg-muted border border-transparent"
                            )}
                          >
                            <RadioGroupItem value={tone.id} id={tone.id} />
                            <div className="flex-1">
                              <span className="text-sm font-medium">{tone.label}</span>
                              <p className="text-xs text-muted-foreground">{tone.description}</p>
                            </div>
                          </label>
                        ))}
                      </RadioGroup>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
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
  );
};

export default TextModeSelector;
