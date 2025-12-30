import { Wand2, SlidersHorizontal, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SLIDE_COUNT_OPTIONS, SlideCountMode, getSlideCountLabel } from "@/lib/constants";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/hooks/useLanguage";

interface SlideCountSelectorProps {
  mode: SlideCountMode;
  setMode: (mode: SlideCountMode) => void;
  manualCount: number;
  setManualCount: (count: number) => void;
}

const SlideCountSelector = ({ 
  mode, 
  setMode, 
  manualCount, 
  setManualCount 
}: SlideCountSelectorProps) => {
  const { language } = useLanguage();
  
  const handleModeChange = (newMode: SlideCountMode) => {
    setMode(newMode);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-1">Quantidade de Slides</h3>
        <p className="text-sm text-muted-foreground">
          Defina quantos slides seu carrossel terá
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Automatic Mode */}
        <button
          type="button"
          onClick={() => handleModeChange("auto")}
          className={cn(
            "relative flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left",
            mode === "auto"
              ? "border-accent bg-accent/5"
              : "border-border hover:border-accent/50"
          )}
        >
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
            mode === "auto" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
          )}>
            <Wand2 className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{getSlideCountLabel(SLIDE_COUNT_OPTIONS.auto.labelKey, language)}</span>
              {mode === "auto" && (
                <CheckCircle2 className="w-4 h-4 text-accent" />
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {getSlideCountLabel(SLIDE_COUNT_OPTIONS.auto.descriptionKey, language)}
            </p>
          </div>
        </button>

        {/* Manual Mode */}
        <button
          type="button"
          onClick={() => handleModeChange("manual")}
          className={cn(
            "relative flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left",
            mode === "manual"
              ? "border-accent bg-accent/5"
              : "border-border hover:border-accent/50"
          )}
        >
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
            mode === "manual" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
          )}>
            <SlidersHorizontal className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{getSlideCountLabel(SLIDE_COUNT_OPTIONS.manual.labelKey, language)}</span>
              {mode === "manual" && (
                <CheckCircle2 className="w-4 h-4 text-accent" />
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {getSlideCountLabel(SLIDE_COUNT_OPTIONS.manual.descriptionKey, language)}
            </p>
          </div>
        </button>
      </div>

      {/* Manual Slider */}
      {mode === "manual" && (
        <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Número de slides</span>
            <span className="text-2xl font-bold text-accent">{manualCount}</span>
          </div>
          
          <Slider
            value={[manualCount]}
            onValueChange={(value) => setManualCount(value[0])}
            min={3}
            max={10}
            step={1}
            className="w-full"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>3 slides</span>
            <span>10 slides</span>
          </div>

          {/* Visual preview of slide count */}
          <div className="flex justify-center gap-1 pt-2">
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "w-6 h-8 rounded transition-all",
                  i < manualCount
                    ? "bg-accent"
                    : "bg-muted-foreground/20"
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Helper text */}
      <p className="text-xs text-muted-foreground">
        {mode === "auto" 
          ? "💡 A IA analisará seu conteúdo e criará o número ideal de slides para melhor engajamento."
          : `💡 Seu carrossel terá exatamente ${manualCount} slides. A IA adaptará o conteúdo para caber.`
        }
      </p>
    </div>
  );
};

export default SlideCountSelector;
