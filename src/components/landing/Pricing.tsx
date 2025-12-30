import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Zap, Loader2, Crown, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/translations";
import { PLANS, PLAN_ORDER, PlanTier } from "@/lib/plans";

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { plan: currentPlan, createCheckout } = useSubscription();
  const { language } = useLanguage();
  const [loading, setLoading] = useState<PlanTier | null>(null);

  const handlePlanAction = async (planTier: PlanTier) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    if (planTier === "free") {
      navigate("/create");
      return;
    }

    if (currentPlan === planTier) {
      navigate("/dashboard");
      return;
    }

    setLoading(planTier);
    try {
      await createCheckout(planTier);
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setLoading(null);
    }
  };

  const getPlanIcon = (tier: PlanTier) => {
    switch (tier) {
      case "agency": return ImageIcon;
      case "creator": return Crown;
      case "starter": return Zap;
      default: return Sparkles;
    }
  };

  const getFeaturedPlan = () => "creator";

  return (
    <section id="pricing" className="py-24 md:py-32 bg-secondary/30">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-sm font-semibold text-accent mb-4 tracking-wide uppercase">
            {t("pricing", "sectionTitle", language)}
          </span>
          <h2 className="text-display-sm md:text-display-md mb-4">
            {t("pricing", "title", language)}
          </h2>
          <p className="text-body-lg text-muted-foreground">
            {t("pricing", "subtitle", language)}
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {PLAN_ORDER.map((tier) => {
            const plan = PLANS[tier];
            const isFeatured = tier === getFeaturedPlan();
            const isCurrentPlan = currentPlan === tier;
            const Icon = getPlanIcon(tier);

            return (
              <Card
                key={tier}
                variant={isFeatured ? "pricing-featured" : "pricing"}
                className={`relative ${isFeatured ? "lg:-mt-4 lg:mb-4 scale-105" : ""}`}
              >
                {isFeatured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-accent text-accent-foreground text-sm font-semibold rounded-full shadow-lg">
                      <Sparkles className="w-4 h-4" />
                      {t("pricing", "mostPopular", language)}
                    </span>
                  </div>
                )}

                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4">
                    <span className="inline-flex items-center px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
                      {t("pricing", "yourPlan", language)}
                    </span>
                  </div>
                )}

                <CardHeader className="text-center pb-2">
                  <div className="mx-auto w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                    <Icon className={`w-6 h-6 ${isFeatured ? "text-primary-foreground" : "text-accent"}`} />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription className={isFeatured ? "text-primary-foreground/70" : ""}>
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="text-center">
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.priceDisplay}</span>
                    {tier !== "free" && (
                      <span className={`text-sm ${isFeatured ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {t("common", "perMonth", language)}
                      </span>
                    )}
                  </div>

                  <div className="text-left space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isFeatured ? "bg-primary-foreground/20" : "bg-success/20"
                        }`}>
                          <Check className={`w-3 h-3 ${isFeatured ? "text-primary-foreground" : "text-success"}`} />
                        </div>
                        <span className={`text-sm ${isFeatured ? "text-primary-foreground/90" : ""}`}>{feature}</span>
                      </div>
                    ))}
                    {plan.limitations.map((limitation) => (
                      <div key={limitation} className="flex items-start gap-2 opacity-50">
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs">—</span>
                        </div>
                        <span className="text-sm">{limitation}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>

                <CardFooter>
                  <Button
                    variant={isFeatured ? "secondary" : tier === "free" ? "outline" : "accent"}
                    size="lg"
                    className={`w-full ${isFeatured ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" : ""}`}
                    onClick={() => handlePlanAction(tier)}
                    disabled={loading === tier}
                  >
                    {loading === tier ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        {isCurrentPlan 
                          ? t("pricing", "currentPlan", language) 
                          : tier === "free" 
                            ? t("pricing", "testFree", language) 
                            : t("pricing", "subscribe", language)}
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Trust Elements */}
        <div className="mt-16 text-center">
          <div className="inline-flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              {t("pricing", "securePayment", language)}
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              {t("pricing", "cancelAnytime", language)}
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              {t("pricing", "supportInLanguage", language)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
