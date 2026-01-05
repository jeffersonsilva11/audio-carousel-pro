import { useState } from "react";
import { Lock, Sparkles, Crown, Loader2, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/hooks/useLanguage";
import { useSubscription } from "@/hooks/useSubscription";
import { getPlanPrice } from "@/lib/localization";

export type RequiredPlan = "starter" | "creator";

interface LockedFeatureProps {
  /** The plan required to unlock this feature */
  requiredPlan: RequiredPlan;
  /** Title of the locked feature */
  title: string;
  /** Description of what the feature does */
  description?: string;
  /** Icon to display */
  icon?: LucideIcon;
  /** Additional features to list */
  features?: string[];
  /** Compact mode for inline usage */
  compact?: boolean;
  /** Custom class name */
  className?: string;
  /** Children to render when unlocked */
  children?: React.ReactNode;
  /** Whether the user has access (override for custom logic) */
  hasAccess?: boolean;
}

const PLAN_LABELS: Record<RequiredPlan, { en: string; pt: string; es: string }> = {
  starter: { en: "Starter", pt: "Starter", es: "Starter" },
  creator: { en: "Creator", pt: "Creator", es: "Creator" },
};

const PLAN_COLORS: Record<RequiredPlan, string> = {
  starter: "from-blue-500/20 to-cyan-500/20 border-blue-500/30",
  creator: "from-accent/20 to-orange-500/20 border-accent/30",
};

export function LockedFeature({
  requiredPlan,
  title,
  description,
  icon: Icon,
  features,
  compact = false,
  className,
  children,
  hasAccess,
}: LockedFeatureProps) {
  const { language } = useLanguage();
  const { isPro, isCreator, createCheckout } = useSubscription();
  const [loading, setLoading] = useState(false);

  // Determine if user has access
  const userHasAccess = hasAccess ?? (
    requiredPlan === "starter" ? isPro : isCreator
  );

  // If user has access, render children
  if (userHasAccess) {
    return <>{children}</>;
  }

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      await createCheckout(requiredPlan);
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setLoading(false);
    }
  };

  const planLabel = PLAN_LABELS[requiredPlan][language === "pt-BR" ? "pt" : language === "es" ? "es" : "en"];
  const price = getPlanPrice(requiredPlan, language);

  const upgradeText = {
    "pt-BR": `Upgrade para ${planLabel}`,
    "es": `Upgrade a ${planLabel}`,
    "en": `Upgrade to ${planLabel}`,
  }[language] || `Upgrade to ${planLabel}`;

  const lockedText = {
    "pt-BR": "Recurso bloqueado",
    "es": "Función bloqueada",
    "en": "Locked feature",
  }[language] || "Locked feature";

  const unlockText = {
    "pt-BR": "Desbloqueie com",
    "es": "Desbloquea con",
    "en": "Unlock with",
  }[language] || "Unlock with";

  // Compact mode - just an icon with tooltip
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded-md",
                "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground",
                "transition-colors cursor-pointer",
                className
              )}
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
              <span className="text-xs font-medium">{planLabel}+</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2">
              <p className="font-medium">{title}</p>
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
              <p className="text-xs text-accent">
                {unlockText} {planLabel} ({price}/
                {language === "pt-BR" ? "mês" : language === "es" ? "mes" : "mo"})
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full card mode
  return (
    <div
      className={cn(
        "relative border rounded-xl overflow-hidden",
        "bg-gradient-to-br",
        PLAN_COLORS[requiredPlan],
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-background/50">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Icon className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{title}</h3>
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] shrink-0",
                  requiredPlan === "creator" && "bg-accent/20 text-accent"
                )}
              >
                {planLabel}+
              </Badge>
            </div>
            {description && (
              <p className="text-sm text-muted-foreground truncate">{description}</p>
            )}
          </div>
          <Lock className="w-5 h-5 text-muted-foreground shrink-0" />
        </div>
      </div>

      {/* Features list */}
      {features && features.length > 0 && (
        <div className="p-4 space-y-2">
          {features.map((feature, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="text-muted-foreground">{feature}</span>
            </div>
          ))}
        </div>
      )}

      {/* Upgrade CTA */}
      <div className="p-4 pt-0">
        <Button
          variant="accent"
          className="w-full"
          onClick={handleUpgrade}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Crown className="w-4 h-4 mr-2" />
          )}
          {upgradeText} - {price}/
          {language === "pt-BR" ? "mês" : language === "es" ? "mes" : "mo"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Inline locked badge - shows a small badge next to a label
 */
interface LockedBadgeProps {
  requiredPlan: RequiredPlan;
  className?: string;
}

export function LockedBadge({ requiredPlan, className }: LockedBadgeProps) {
  const { language } = useLanguage();
  const planLabel = PLAN_LABELS[requiredPlan][language === "pt-BR" ? "pt" : language === "es" ? "es" : "en"];

  return (
    <Badge
      variant="secondary"
      className={cn(
        "text-[10px] gap-1",
        requiredPlan === "creator" && "bg-accent/20 text-accent border-accent/30",
        className
      )}
    >
      <Lock className="w-2.5 h-2.5" />
      {planLabel}+
    </Badge>
  );
}

export default LockedFeature;
