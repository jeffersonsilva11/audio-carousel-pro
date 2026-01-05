import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useSubscription } from "@/hooks/useSubscription";
import { usePlansConfig } from "@/hooks/usePlansConfig";
import { PlanTier } from "@/lib/plans";
import { t } from "@/lib/translations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, Crown, Loader2, Sparkles, AlertTriangle, Heart, Gift, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PlansModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CancellationStep = "plans" | "cancel_confirm" | "cancel_reason" | "cancel_offer" | "cancel_final";

const cancellationReasons = [
  { id: "expensive", label: { "pt-BR": "Muito caro para mim", en: "Too expensive for me", es: "Demasiado caro para mí" } },
  { id: "not_using", label: { "pt-BR": "Não estou usando o suficiente", en: "Not using it enough", es: "No lo uso suficiente" } },
  { id: "missing_features", label: { "pt-BR": "Faltam recursos que preciso", en: "Missing features I need", es: "Faltan funciones que necesito" } },
  { id: "found_alternative", label: { "pt-BR": "Encontrei outra solução", en: "Found another solution", es: "Encontré otra solución" } },
  { id: "temporary", label: { "pt-BR": "Só preciso pausar por um tempo", en: "Just need to pause for a while", es: "Solo necesito pausar un tiempo" } },
  { id: "other", label: { "pt-BR": "Outro motivo", en: "Other reason", es: "Otro motivo" } },
];

export default function PlansModal({ open, onOpenChange }: PlansModalProps) {
  const { language } = useLanguage();
  const { plan: currentPlan, createCheckout, openCustomerPortal, isPro } = useSubscription();
  const { plans, getPlanPrice, getPlanName, getPlanDescription, getPlanFeatures, getPlanLimitations } = usePlansConfig();
  const [loading, setLoading] = useState<PlanTier | null>(null);
  const [step, setStep] = useState<CancellationStep>("plans");
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  // Get plan order for comparison
  const getPlanOrder = (tier: string) => {
    const index = plans.findIndex(p => p.tier === tier);
    return index >= 0 ? index : -1;
  };

  // Map language to currency
  const getCurrency = () => {
    switch (language) {
      case "en": return "usd";
      case "es": return "eur";
      default: return "brl";
    }
  };

  const handleUpgrade = async (planTier: PlanTier) => {
    if (planTier === "free" || planTier === currentPlan) return;

    setLoading(planTier);
    try {
      await createCheckout(planTier, getCurrency());
      onOpenChange(false);
    } catch (error) {
      toast.error(t("common", "error", language));
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      await openCustomerPortal();
      onOpenChange(false);
    } catch (error) {
      toast.error(t("common", "error", language));
    }
  };

  const handleStartCancellation = () => {
    setStep("cancel_confirm");
  };

  const handleCancelConfirm = () => {
    setStep("cancel_reason");
  };

  const handleReasonSelect = (reason: string) => {
    setSelectedReason(reason);
    // Special offer for certain reasons
    if (reason === "expensive" || reason === "temporary") {
      setStep("cancel_offer");
    } else {
      setStep("cancel_final");
    }
  };

  const handleAcceptOffer = () => {
    toast.success(
      language === "pt-BR"
        ? "Ótimo! Seu desconto será aplicado na próxima fatura."
        : language === "es"
          ? "¡Genial! Tu descuento se aplicará en la próxima factura."
          : "Great! Your discount will be applied to the next invoice."
    );
    setStep("plans");
    onOpenChange(false);
  };

  const handleFinalCancel = async () => {
    try {
      await openCustomerPortal();
      setStep("plans");
      onOpenChange(false);
    } catch (error) {
      toast.error(t("common", "error", language));
    }
  };

  const handleClose = () => {
    setStep("plans");
    setSelectedReason(null);
    onOpenChange(false);
  };

  const renderCancellationFlow = () => {
    if (step === "cancel_confirm") {
      return (
        <div className="space-y-6 py-4">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">
              {language === "pt-BR" ? "Tem certeza que deseja cancelar?" : language === "es" ? "¿Estás seguro de que quieres cancelar?" : "Are you sure you want to cancel?"}
            </h3>
            <p className="text-muted-foreground">
              {language === "pt-BR"
                ? "Você perderá acesso a todos os recursos premium e seu histórico de carrosséis."
                : language === "es"
                  ? "Perderás acceso a todas las funciones premium y tu historial de carruseles."
                  : "You'll lose access to all premium features and your carousel history."}
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="font-medium text-sm">
              {language === "pt-BR" ? "O que você vai perder:" : language === "es" ? "Lo que perderás:" : "What you'll lose:"}
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• {language === "pt-BR" ? "Carrosséis sem marca d'água" : language === "es" ? "Carruseles sin marca de agua" : "Carousels without watermark"}</li>
              <li>• {language === "pt-BR" ? "Editor visual avançado" : language === "es" ? "Editor visual avanzado" : "Advanced visual editor"}</li>
              <li>• {language === "pt-BR" ? "Histórico completo" : language === "es" ? "Historial completo" : "Complete history"}</li>
              <li>• {language === "pt-BR" ? "Download em ZIP" : language === "es" ? "Descarga en ZIP" : "ZIP download"}</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep("plans")}>
              {language === "pt-BR" ? "Voltar" : language === "es" ? "Volver" : "Go back"}
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleCancelConfirm}>
              {language === "pt-BR" ? "Continuar cancelamento" : language === "es" ? "Continuar cancelación" : "Continue cancellation"}
            </Button>
          </div>
        </div>
      );
    }

    if (step === "cancel_reason") {
      return (
        <div className="space-y-6 py-4">
          <div className="text-center">
            <h3 className="text-xl font-bold mb-2">
              {language === "pt-BR" ? "Por que você está cancelando?" : language === "es" ? "¿Por qué estás cancelando?" : "Why are you canceling?"}
            </h3>
            <p className="text-muted-foreground text-sm">
              {language === "pt-BR"
                ? "Seu feedback nos ajuda a melhorar o Audisell"
                : language === "es"
                  ? "Tu feedback nos ayuda a mejorar Audisell"
                  : "Your feedback helps us improve Audisell"}
            </p>
          </div>

          <div className="space-y-2">
            {cancellationReasons.map((reason) => (
              <button
                key={reason.id}
                onClick={() => handleReasonSelect(reason.id)}
                className={cn(
                  "w-full p-3 text-left rounded-lg border transition-all hover:border-accent hover:bg-accent/5",
                  selectedReason === reason.id ? "border-accent bg-accent/10" : "border-border"
                )}
              >
                {reason.label[language]}
              </button>
            ))}
          </div>

          <Button variant="outline" className="w-full" onClick={() => setStep("cancel_confirm")}>
            {t("common", "back", language)}
          </Button>
        </div>
      );
    }

    if (step === "cancel_offer") {
      return (
        <div className="space-y-6 py-4">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-xl font-bold mb-2">
              {language === "pt-BR" ? "Espera! Temos uma oferta especial" : language === "es" ? "¡Espera! Tenemos una oferta especial" : "Wait! We have a special offer"}
            </h3>
            <p className="text-muted-foreground">
              {language === "pt-BR"
                ? "Que tal 50% de desconto no próximo mês?"
                : language === "es"
                  ? "¿Qué tal un 50% de descuento en el próximo mes?"
                  : "How about 50% off next month?"}
            </p>
          </div>

          <Card className="border-accent bg-gradient-to-br from-accent/5 to-transparent">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-accent mb-1">50% OFF</p>
              <p className="text-sm text-muted-foreground">
                {language === "pt-BR" ? "No próximo mês" : language === "es" ? "El próximo mes" : "Next month"}
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep("cancel_final")}>
              {language === "pt-BR" ? "Não, obrigado" : language === "es" ? "No, gracias" : "No, thanks"}
            </Button>
            <Button variant="accent" className="flex-1" onClick={handleAcceptOffer}>
              <Heart className="w-4 h-4 mr-2" />
              {language === "pt-BR" ? "Aceitar oferta" : language === "es" ? "Aceptar oferta" : "Accept offer"}
            </Button>
          </div>
        </div>
      );
    }

    if (step === "cancel_final") {
      return (
        <div className="space-y-6 py-4">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">
              {language === "pt-BR" ? "Sentiremos sua falta" : language === "es" ? "Te extrañaremos" : "We'll miss you"}
            </h3>
            <p className="text-muted-foreground">
              {language === "pt-BR"
                ? "Você pode voltar a qualquer momento. Seu histórico será mantido por 30 dias."
                : language === "es"
                  ? "Puedes volver en cualquier momento. Tu historial se mantendrá por 30 días."
                  : "You can come back anytime. Your history will be kept for 30 days."}
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep("plans")}>
              {language === "pt-BR" ? "Ficar" : language === "es" ? "Quedarme" : "Stay"}
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleFinalCancel}>
              {language === "pt-BR" ? "Cancelar assinatura" : language === "es" ? "Cancelar suscripción" : "Cancel subscription"}
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {step === "plans"
              ? (language === "pt-BR" ? "Escolha seu plano" : language === "es" ? "Elige tu plan" : "Choose your plan")
              : (language === "pt-BR" ? "Cancelar assinatura" : language === "es" ? "Cancelar suscripción" : "Cancel subscription")}
          </DialogTitle>
        </DialogHeader>

        {step !== "plans" ? (
          renderCancellationFlow()
        ) : (
          <>
            <div className={`grid gap-4 py-4 ${plans.length === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
              {plans.map((plan) => {
                const planTier = plan.tier as PlanTier;
                const isCurrentPlan = currentPlan === planTier;
                const isPopular = planTier === "creator";
                const canUpgrade = getPlanOrder(planTier) > getPlanOrder(currentPlan);
                const canDowngrade = getPlanOrder(planTier) < getPlanOrder(currentPlan) && isPro;
                const features = getPlanFeatures(planTier, language);
                const limitations = getPlanLimitations(planTier, language);

                return (
                  <Card
                    key={planTier}
                    className={cn(
                      "relative transition-all",
                      isCurrentPlan && "border-accent ring-2 ring-accent/20",
                      isPopular && !isCurrentPlan && "border-accent/50"
                    )}
                  >
                    {isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-accent text-accent-foreground text-xs font-medium px-3 py-1 rounded-full">
                          {language === "pt-BR" ? "Seu plano" : language === "es" ? "Tu plan" : "Your plan"}
                        </span>
                      </div>
                    )}
                    {isPopular && !isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-accent/20 text-accent text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          {language === "pt-BR" ? "Popular" : language === "es" ? "Popular" : "Popular"}
                        </span>
                      </div>
                    )}

                    <CardHeader className="pb-2 pt-6">
                      <CardTitle className="flex items-center gap-2">
                        {planTier !== "free" && <Crown className="w-4 h-4 text-accent" />}
                        {getPlanName(planTier, language)}
                      </CardTitle>
                      <CardDescription>{getPlanDescription(planTier, language)}</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div>
                        <span className="text-3xl font-bold">{getPlanPrice(planTier, language)}</span>
                        {planTier !== "free" && (
                          <span className="text-muted-foreground text-sm">{t("common", "perMonth", language)}</span>
                        )}
                      </div>

                      <ul className="space-y-2 text-sm">
                        {features.slice(0, 5).map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                        {limitations.length > 0 && limitations.slice(0, 2).map((limitation, index) => (
                          <li key={`lim-${index}`} className="flex items-start gap-2 text-muted-foreground">
                            <X className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                            <span>{limitation}</span>
                          </li>
                        ))}
                      </ul>

                      {isCurrentPlan ? (
                        <Button variant="outline" className="w-full" disabled>
                          {language === "pt-BR" ? "Plano atual" : language === "es" ? "Plan actual" : "Current plan"}
                        </Button>
                      ) : canUpgrade ? (
                        <Button
                          variant={isPopular ? "accent" : "default"}
                          className="w-full"
                          onClick={() => handleUpgrade(planTier)}
                          disabled={loading !== null}
                        >
                          {loading === planTier ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <ArrowRight className="w-4 h-4 mr-2" />
                              {language === "pt-BR" ? "Fazer upgrade" : language === "es" ? "Hacer upgrade" : "Upgrade"}
                            </>
                          )}
                        </Button>
                      ) : canDowngrade ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={handleManageSubscription}
                        >
                          {language === "pt-BR" ? "Gerenciar plano" : language === "es" ? "Gestionar plan" : "Manage plan"}
                        </Button>
                      ) : (
                        <Button variant="outline" className="w-full" disabled>
                          {language === "pt-BR" ? "Indisponível" : language === "es" ? "No disponible" : "Unavailable"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {isPro && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {language === "pt-BR"
                      ? "Deseja cancelar sua assinatura?"
                      : language === "es"
                        ? "¿Deseas cancelar tu suscripción?"
                        : "Want to cancel your subscription?"}
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleStartCancellation} className="text-destructive hover:text-destructive">
                    {language === "pt-BR" ? "Cancelar plano" : language === "es" ? "Cancelar plan" : "Cancel plan"}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
