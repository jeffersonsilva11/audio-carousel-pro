import { Lock, CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { TEMPLATES, TemplateId, getTemplateLabel } from "@/lib/constants";
import { useSubscription } from "@/hooks/useSubscription";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/translations";
import { getPlanPrice } from "@/lib/localization";

interface TemplateSelectorProps {
  selectedTemplate: TemplateId;
  setSelectedTemplate: (template: TemplateId) => void;
}

const TemplateSelector = ({ selectedTemplate, setSelectedTemplate }: TemplateSelectorProps) => {
  const { isCreator, isAgency } = useSubscription();
  const { language } = useLanguage();

  const canSelectTemplate = (templateId: TemplateId) => {
    const template = TEMPLATES.find(t => t.id === templateId);
    if (!template) return false;
    if (template.requiredPlan === 'free') return true;
    if (template.requiredPlan === 'creator') return isCreator || isAgency;
    return true;
  };

  const handleSelect = (templateId: TemplateId) => {
    if (canSelectTemplate(templateId)) {
      setSelectedTemplate(templateId);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-1">Template</h3>
        <p className="text-sm text-muted-foreground">
          Escolha o estilo visual do seu carrossel
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {TEMPLATES.map((template) => {
          const isSelected = selectedTemplate === template.id;
          const canSelect = canSelectTemplate(template.id);
          const isPremium = template.requiredPlan === 'creator';

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => handleSelect(template.id)}
              disabled={!canSelect}
              className={cn(
                "relative group rounded-xl border-2 p-3 transition-all text-left",
                isSelected 
                  ? "border-accent bg-accent/5" 
                  : canSelect 
                    ? "border-border hover:border-accent/50" 
                    : "border-border/50 opacity-60 cursor-not-allowed"
              )}
            >
              {/* Template Preview */}
              <div className="aspect-square rounded-lg overflow-hidden mb-3 relative bg-muted">
                <TemplatePreview templateId={template.id} />
                
                {/* Overlay for locked templates */}
                {!canSelect && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                    <Lock className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Template Info */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{getTemplateLabel(template.nameKey, language)}</span>
                  {isPremium && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                      Creator+
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {getTemplateLabel(template.descriptionKey, language)}
                </p>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Info about premium templates */}
      {!isCreator && !isAgency && (
        <p className="text-xs text-muted-foreground text-center">
          {t("templateSelector", "premiumInfo", language).replace("{price}", getPlanPrice("creator", language))}
        </p>
      )}
    </div>
  );
};

// Mini preview components for each template type
const TemplatePreview = ({ templateId }: { templateId: TemplateId }) => {
  switch (templateId) {
    case 'solid':
      return <SolidTemplatePreview />;
    case 'gradient':
      return <GradientTemplatePreview />;
    case 'image_top':
      return <ImageTopTemplatePreview />;
    default:
      return null;
  }
};

const SolidTemplatePreview = () => (
  <div className="w-full h-full bg-foreground flex flex-col items-center justify-center p-4">
    {/* Profile */}
    <div className="absolute top-2 left-2 flex items-center gap-1.5">
      <div className="w-4 h-4 rounded-full bg-background/20" />
      <div className="space-y-0.5">
        <div className="w-8 h-1 bg-background/30 rounded" />
        <div className="w-6 h-1 bg-background/20 rounded" />
      </div>
    </div>
    
    {/* Text lines */}
    <div className="space-y-2 w-full px-4">
      <div className="w-full h-2 bg-background/30 rounded" />
      <div className="w-4/5 h-2 bg-background/20 rounded mx-auto" />
      <div className="w-3/5 h-2 bg-background/20 rounded mx-auto" />
    </div>
  </div>
);

const GradientTemplatePreview = () => (
  <div className="w-full h-full relative">
    {/* Fake image background with gradient pattern */}
    <div 
      className="absolute inset-0"
      style={{
        background: 'linear-gradient(135deg, hsl(var(--accent)/0.3) 0%, hsl(var(--primary)/0.4) 50%, hsl(var(--accent)/0.2) 100%)'
      }}
    />
    
    {/* Dark overlay */}
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />
    
    {/* Profile */}
    <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
      <div className="w-4 h-4 rounded-full bg-white/30" />
      <div className="space-y-0.5">
        <div className="w-8 h-1 bg-white/40 rounded" />
        <div className="w-6 h-1 bg-white/30 rounded" />
      </div>
    </div>
    
    {/* Text lines */}
    <div className="absolute bottom-4 left-0 right-0 space-y-2 px-4 z-10">
      <div className="w-full h-2 bg-white/50 rounded" />
      <div className="w-4/5 h-2 bg-white/40 rounded" />
      <div className="w-3/5 h-2 bg-white/30 rounded" />
    </div>

    {/* AI spark icon */}
    <div className="absolute top-2 right-2">
      <Sparkles className="w-3 h-3 text-white/50" />
    </div>
  </div>
);

const ImageTopTemplatePreview = () => (
  <div className="w-full h-full flex flex-col">
    {/* Image area with pattern */}
    <div 
      className="flex-1 relative"
      style={{
        background: 'linear-gradient(135deg, hsl(var(--accent)/0.3) 0%, hsl(var(--primary)/0.4) 100%)'
      }}
    >
      {/* AI spark icon */}
      <div className="absolute top-1 right-1">
        <Sparkles className="w-2.5 h-2.5 text-white/50" />
      </div>
    </div>
    
    {/* Text area */}
    <div className="h-2/5 bg-foreground p-2 relative">
      {/* Profile */}
      <div className="absolute top-1 left-1 flex items-center gap-1">
        <div className="w-3 h-3 rounded-full bg-background/20" />
        <div className="w-6 h-1 bg-background/30 rounded" />
      </div>
      
      {/* Text lines */}
      <div className="mt-4 space-y-1 px-1">
        <div className="w-full h-1.5 bg-background/30 rounded" />
        <div className="w-4/5 h-1.5 bg-background/20 rounded" />
      </div>
    </div>
  </div>
);

export default TemplateSelector;
