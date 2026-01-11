import { Image, Type, Layout, Lock, Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/hooks/useLanguage";
import { useSubscription } from "@/hooks/useSubscription";
import { LockedFeature } from "@/components/ui/locked-feature";
import {
  ContentTemplateType,
  CONTENT_TEMPLATES,
  canAccessTemplate,
  getTemplateName,
  templateRequiresImage,
} from "@/lib/templates";
import { PlanTier } from "@/lib/plans";

interface ContentCustomizationProps {
  selectedContentTemplate: ContentTemplateType;
  onContentTemplateChange: (template: ContentTemplateType) => void;
  isCreator: boolean;
}

const ContentCustomization = ({
  selectedContentTemplate,
  onContentTemplateChange,
  isCreator,
}: ContentCustomizationProps) => {
  const { language } = useLanguage();
  const { plan } = useSubscription();

  const langKey = language === "pt-BR" ? "pt" : language === "es" ? "es" : "en";

  // Translations
  const translations = {
    pt: {
      title: "Layout do Conteúdo",
      subtitle: "Configure o visual dos slides de conteúdo",
      description: "Escolha como o texto e imagens serão organizados nos slides",
      requiresImage: "Requer imagem",
      noImageRequired: "Só texto",
      default: "Padrão",
      imageNote: "As imagens serão solicitadas na seção de upload abaixo",
      lockedFeatures: [
        "4 templates de conteúdo",
        "Upload de imagens por slide",
        "Layouts profissionais",
      ],
    },
    en: {
      title: "Content Layout",
      subtitle: "Configure the visual of content slides",
      description: "Choose how text and images are organized on slides",
      requiresImage: "Requires image",
      noImageRequired: "Text only",
      default: "Default",
      imageNote: "Images will be requested in the upload section below",
      lockedFeatures: [
        "4 content templates",
        "Per-slide image upload",
        "Professional layouts",
      ],
    },
    es: {
      title: "Diseño del Contenido",
      subtitle: "Configura el visual de las diapositivas de contenido",
      description: "Elige cómo se organizan texto e imágenes en las diapositivas",
      requiresImage: "Requiere imagen",
      noImageRequired: "Solo texto",
      default: "Predeterminado",
      imageNote: "Las imágenes se solicitarán en la sección de subida debajo",
      lockedFeatures: [
        "4 plantillas de contenido",
        "Subida de imágenes por diapositiva",
        "Diseños profesionales",
      ],
    },
  };

  const t = translations[langKey as keyof typeof translations];

  // Show locked state for non-Creator users
  if (!isCreator) {
    return (
      <LockedFeature
        requiredPlan="creator"
        title={t.title}
        description={t.subtitle}
        icon={Type}
        features={t.lockedFeatures}
        hasAccess={false}
      />
    );
  }

  const requiresImages = templateRequiresImage(selectedContentTemplate);

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-accent/5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-accent" />
          <h3 className="font-semibold">{t.title}</h3>
          <Badge variant="secondary" className="text-[10px] ml-auto bg-accent/20 text-accent">
            Creator+
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
      </div>

      <div className="p-4 space-y-4">
        <p className="text-sm text-muted-foreground">{t.description}</p>

        <div className="grid grid-cols-2 gap-3">
          {Object.entries(CONTENT_TEMPLATES).map(([id, meta]) => {
            const templateId = id as ContentTemplateType;
            const isSelected = selectedContentTemplate === templateId;
            const hasAccess = canAccessTemplate(plan as PlanTier, templateId);
            const isDefault = templateId === "content_text_only";

            return (
              <button
                key={templateId}
                onClick={() => hasAccess && onContentTemplateChange(templateId)}
                disabled={!hasAccess}
                className={cn(
                  "relative flex flex-col rounded-lg border-2 transition-all overflow-hidden",
                  isSelected
                    ? "border-accent ring-2 ring-accent/20"
                    : hasAccess
                    ? "border-border hover:border-accent/50"
                    : "border-border/50 opacity-60 cursor-not-allowed"
                )}
              >
                {/* Preview thumbnail */}
                <div className="aspect-[4/5] bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                  <ContentTemplatePreview type={templateId} />
                </div>

                {/* Template info */}
                <div className="p-3 border-t bg-background">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-left min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-sm truncate">
                          {getTemplateName(templateId, langKey)}
                        </p>
                        {isDefault && (
                          <Badge variant="secondary" className="text-[8px] px-1 py-0">
                            {t.default}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {meta.requiresImage ? t.requiresImage : t.noImageRequired}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-accent-foreground" />
                      </div>
                    )}
                    {!hasAccess && (
                      <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Image note */}
        {requiresImages && (
          <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {t.imageNote}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Content template preview components
const ContentTemplatePreview = ({ type }: { type: ContentTemplateType }) => {
  switch (type) {
    case "content_text_only":
      return (
        <div className="w-full h-full p-3">
          <div className="w-full h-full bg-muted-foreground/10 rounded-md flex flex-col items-start justify-center p-3 gap-1.5">
            <div className="w-full h-2 bg-foreground/20 rounded" />
            <div className="w-4/5 h-2 bg-foreground/20 rounded" />
            <div className="w-full h-2 bg-foreground/20 rounded" />
            <div className="w-3/5 h-2 bg-foreground/20 rounded" />
          </div>
        </div>
      );
    case "content_image_top":
      return (
        <div className="w-full h-full p-3">
          <div className="w-full h-full bg-muted-foreground/10 rounded-md flex flex-col overflow-hidden">
            <div className="h-2/5 bg-accent/20 flex items-center justify-center">
              <Image className="w-4 h-4 text-accent/40" />
            </div>
            <div className="flex-1 p-2 flex flex-col gap-1">
              <div className="w-full h-1.5 bg-foreground/20 rounded" />
              <div className="w-4/5 h-1.5 bg-foreground/20 rounded" />
              <div className="w-full h-1.5 bg-foreground/20 rounded" />
            </div>
          </div>
        </div>
      );
    case "content_text_top":
      return (
        <div className="w-full h-full p-3">
          <div className="w-full h-full bg-muted-foreground/10 rounded-md flex flex-col overflow-hidden">
            <div className="flex-1 p-2 flex flex-col gap-1">
              <div className="w-full h-1.5 bg-foreground/20 rounded" />
              <div className="w-4/5 h-1.5 bg-foreground/20 rounded" />
              <div className="w-full h-1.5 bg-foreground/20 rounded" />
            </div>
            <div className="h-2/5 bg-accent/20 flex items-center justify-center">
              <Image className="w-4 h-4 text-accent/40" />
            </div>
          </div>
        </div>
      );
    case "content_split":
      return (
        <div className="w-full h-full p-3">
          <div className="w-full h-full bg-muted-foreground/10 rounded-md flex overflow-hidden">
            <div className="w-1/2 bg-accent/20 flex items-center justify-center">
              <Image className="w-4 h-4 text-accent/40" />
            </div>
            <div className="w-1/2 p-2 flex flex-col justify-center gap-1">
              <div className="w-full h-1.5 bg-foreground/20 rounded" />
              <div className="w-4/5 h-1.5 bg-foreground/20 rounded" />
              <div className="w-full h-1.5 bg-foreground/20 rounded" />
              <div className="w-3/5 h-1.5 bg-foreground/20 rounded" />
            </div>
          </div>
        </div>
      );
    default:
      return null;
  }
};

export default ContentCustomization;
