import {
  Settings2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/hooks/useLanguage";
import { LockedFeature } from "@/components/ui/locked-feature";

export type SubtitlePosition = 'above' | 'below';

interface AdvancedOptionsEditorProps {
  subtitlePosition: SubtitlePosition;
  showNavigationDots: boolean;
  showNavigationArrow: boolean;
  onSubtitlePositionChange: (position: SubtitlePosition) => void;
  onNavigationDotsChange: (show: boolean) => void;
  onNavigationArrowChange: (show: boolean) => void;
  isCreator: boolean;
}

const AdvancedOptionsEditor = ({
  subtitlePosition,
  showNavigationDots,
  showNavigationArrow,
  onSubtitlePositionChange,
  onNavigationDotsChange,
  onNavigationArrowChange,
  isCreator,
}: AdvancedOptionsEditorProps) => {
  const { language } = useLanguage();

  // Get localized feature list for locked state
  const getLockedFeatures = () => {
    const features = {
      "pt-BR": [
        "Posição do subtítulo customizável",
        "Pontos de navegação",
        "Setas de navegação"
      ],
      "es": [
        "Posición de subtítulo personalizable",
        "Puntos de navegación",
        "Flechas de navegación"
      ],
      "en": [
        "Customizable subtitle position",
        "Navigation dots",
        "Navigation arrows"
      ]
    };
    return features[language] || features["en"];
  };

  if (!isCreator) {
    return (
      <LockedFeature
        requiredPlan="creator"
        title={language === "pt-BR" ? "Opções Avançadas" : language === "es" ? "Opciones Avanzadas" : "Advanced Options"}
        description={
          language === "pt-BR"
            ? "Controle elementos visuais dos seus slides"
            : language === "es"
            ? "Controla elementos visuales de tus slides"
            : "Control visual elements of your slides"
        }
        icon={Settings2}
        features={getLockedFeatures()}
        hasAccess={false}
      />
    );
  }

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <div className="p-4 bg-accent/5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-accent" />
          <h3 className="font-semibold">
            {language === "pt-BR" ? "Opções Avançadas" : language === "es" ? "Opciones Avanzadas" : "Advanced Options"}
          </h3>
          <Badge variant="secondary" className="text-[10px] ml-auto bg-accent/20 text-accent">Creator+</Badge>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Subtitle Position */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">
            {language === "pt-BR" ? "Posição do Subtítulo" : language === "es" ? "Posición del Subtítulo" : "Subtitle Position"}
          </h4>
          <div className="flex gap-2">
            {([
              {
                value: 'above' as SubtitlePosition,
                icon: ArrowUp,
                label: language === "pt-BR" ? 'Acima do Título' : language === "es" ? 'Arriba del Título' : 'Above Title'
              },
              {
                value: 'below' as SubtitlePosition,
                icon: ArrowDown,
                label: language === "pt-BR" ? 'Abaixo do Título' : language === "es" ? 'Debajo del Título' : 'Below Title'
              }
            ]).map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => onSubtitlePositionChange(value)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all",
                  subtitlePosition === value
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/50"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {language === "pt-BR"
              ? "Define onde o subtítulo aparece em relação ao título principal na capa"
              : language === "es"
              ? "Define dónde aparece el subtítulo en relación al título principal"
              : "Defines where the subtitle appears in relation to the main title"}
          </p>
        </div>

        {/* Navigation Options */}
        <div className="space-y-4 border-t border-border pt-4">
          <h4 className="text-sm font-medium">
            {language === "pt-BR" ? "Navegação Visual" : language === "es" ? "Navegación Visual" : "Visual Navigation"}
          </h4>

          {/* Navigation Dots */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm">
                {language === "pt-BR" ? "Pontos de Navegação" : language === "es" ? "Puntos de Navegación" : "Navigation Dots"}
              </Label>
              <p className="text-xs text-muted-foreground">
                {language === "pt-BR"
                  ? "Mostra indicadores de posição no rodapé dos slides"
                  : language === "es"
                  ? "Muestra indicadores de posición en el pie de los slides"
                  : "Shows position indicators at the bottom of slides"}
              </p>
            </div>
            <Switch
              checked={showNavigationDots}
              onCheckedChange={onNavigationDotsChange}
            />
          </div>

          {/* Navigation Arrow */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm">
                {language === "pt-BR" ? "Seta de Navegação" : language === "es" ? "Flecha de Navegación" : "Navigation Arrow"}
              </Label>
              <p className="text-xs text-muted-foreground">
                {language === "pt-BR"
                  ? "Mostra seta indicando próximo slide (exceto no último)"
                  : language === "es"
                  ? "Muestra flecha indicando el próximo slide (excepto en el último)"
                  : "Shows arrow indicating next slide (except on last)"}
              </p>
            </div>
            <Switch
              checked={showNavigationArrow}
              onCheckedChange={onNavigationArrowChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedOptionsEditor;
