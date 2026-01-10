import { useState } from "react";
import { Layout, Image, Type, Lock, Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/useLanguage";
import { useSubscription } from "@/hooks/useSubscription";
import { LockedFeature } from "@/components/ui/locked-feature";
import {
  CoverTemplateType,
  ContentTemplateType,
  COVER_TEMPLATES,
  CONTENT_TEMPLATES,
  canAccessTemplate,
  getTemplateName,
} from "@/lib/templates";
import { PlanTier } from "@/lib/plans";

interface LayoutTemplateSelectorProps {
  selectedCoverTemplate: CoverTemplateType;
  selectedContentTemplate: ContentTemplateType;
  onCoverTemplateChange: (template: CoverTemplateType) => void;
  onContentTemplateChange: (template: ContentTemplateType) => void;
  isCreator: boolean;
}

const LayoutTemplateSelector = ({
  selectedCoverTemplate,
  selectedContentTemplate,
  onCoverTemplateChange,
  onContentTemplateChange,
  isCreator,
}: LayoutTemplateSelectorProps) => {
  const { language } = useLanguage();
  const { plan } = useSubscription();
  const [activeTab, setActiveTab] = useState<"cover" | "content">("cover");

  const langKey = language === "pt-BR" ? "pt" : "en";

  // Translations
  const translations = {
    pt: {
      title: "Templates de Layout",
      subtitle: "Escolha o estilo visual do seu carrossel",
      coverTab: "Capa",
      contentTab: "Conteúdo",
      coverDescription: "Template para o primeiro slide (capa)",
      contentDescription: "Template para os slides de conteúdo",
      requiresImage: "Requer upload de imagem",
      noImageRequired: "Não requer imagem",
      lockedTitle: "Templates de Layout",
      lockedDescription: "Personalize o layout dos seus carrosséis com templates premium",
      lockedFeatures: [
        "3 templates de capa",
        "4 templates de conteúdo",
        "Upload de imagens por slide",
        "Layouts profissionais",
      ],
      selected: "Selecionado",
      default: "Padrão",
      imageNote: "As imagens serão solicitadas na etapa de visualização",
    },
    en: {
      title: "Layout Templates",
      subtitle: "Choose your carousel visual style",
      coverTab: "Cover",
      contentTab: "Content",
      coverDescription: "Template for the first slide (cover)",
      contentDescription: "Template for content slides",
      requiresImage: "Requires image upload",
      noImageRequired: "No image required",
      lockedTitle: "Layout Templates",
      lockedDescription: "Customize your carousel layout with premium templates",
      lockedFeatures: [
        "3 cover templates",
        "4 content templates",
        "Per-slide image upload",
        "Professional layouts",
      ],
      selected: "Selected",
      default: "Default",
      imageNote: "Images will be requested in the preview step",
    },
  };

  const t = translations[langKey];

  // Show locked state for non-Creator users
  if (!isCreator) {
    return (
      <LockedFeature
        requiredPlan="creator"
        title={t.lockedTitle}
        description={t.lockedDescription}
        icon={Layout}
        features={t.lockedFeatures}
        hasAccess={false}
      />
    );
  }

  const renderCoverTemplates = () => {
    const templates = Object.entries(COVER_TEMPLATES);

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t.coverDescription}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {templates.map(([id, meta]) => {
            const templateId = id as CoverTemplateType;
            const isSelected = selectedCoverTemplate === templateId;
            const hasAccess = canAccessTemplate(plan as PlanTier, templateId);

            return (
              <button
                key={templateId}
                onClick={() => hasAccess && onCoverTemplateChange(templateId)}
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
                <div className="aspect-square bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                  <CoverTemplatePreview type={templateId} />
                </div>

                {/* Template info */}
                <div className="p-3 border-t bg-background">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-left min-w-0">
                      <p className="font-medium text-sm truncate">
                        {getTemplateName(templateId, langKey)}
                      </p>
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
      </div>
    );
  };

  const renderContentTemplates = () => {
    const templates = Object.entries(CONTENT_TEMPLATES);

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t.contentDescription}</p>
        <div className="grid grid-cols-2 gap-3">
          {templates.map(([id, meta]) => {
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
      </div>
    );
  };

  // Check if any selected template requires images
  const selectedCoverMeta = COVER_TEMPLATES[selectedCoverTemplate];
  const selectedContentMeta = CONTENT_TEMPLATES[selectedContentTemplate];
  const requiresImages = selectedCoverMeta?.requiresImage || selectedContentMeta?.requiresImage;

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-accent/5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Layout className="w-4 h-4 text-accent" />
          <h3 className="font-semibold">{t.title}</h3>
          <Badge variant="secondary" className="text-[10px] ml-auto bg-accent/20 text-accent">
            Creator+
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "cover" | "content")} className="p-4">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="cover" className="gap-1.5">
            <Image className="w-4 h-4" />
            <span>{t.coverTab}</span>
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-1.5">
            <Type className="w-4 h-4" />
            <span>{t.contentTab}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cover">{renderCoverTemplates()}</TabsContent>
        <TabsContent value="content">{renderContentTemplates()}</TabsContent>
      </Tabs>

      {/* Image note */}
      {requiresImages && (
        <div className="px-4 pb-4">
          <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {t.imageNote}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Cover template preview components
const CoverTemplatePreview = ({ type }: { type: CoverTemplateType }) => {
  switch (type) {
    case "cover_full_image":
      return (
        <div className="w-full h-full p-3 flex flex-col items-center justify-center">
          <div className="w-full h-full bg-gradient-to-br from-accent/30 to-accent/10 rounded-md flex flex-col items-center justify-center p-2 relative">
            <Image className="w-6 h-6 text-accent/50 absolute inset-0 m-auto opacity-30" />
            <div className="space-y-1 text-center relative z-10">
              <div className="w-16 h-2 bg-white/80 rounded mx-auto" />
              <div className="w-12 h-1.5 bg-white/50 rounded mx-auto" />
            </div>
          </div>
        </div>
      );
    case "cover_split_images":
      return (
        <div className="w-full h-full p-3">
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-1 rounded-md overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-accent/20 flex items-center justify-center">
                <Image className="w-3 h-3 text-accent/40" />
              </div>
            ))}
          </div>
        </div>
      );
    case "cover_gradient_overlay":
      return (
        <div className="w-full h-full p-3">
          <div className="w-full h-full bg-gradient-to-b from-accent/50 to-black/80 rounded-md flex flex-col items-center justify-end p-2">
            <div className="space-y-1 text-center">
              <div className="w-14 h-2 bg-white/80 rounded mx-auto" />
              <div className="w-10 h-1.5 bg-white/50 rounded mx-auto" />
            </div>
          </div>
        </div>
      );
    default:
      return null;
  }
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

export default LayoutTemplateSelector;
