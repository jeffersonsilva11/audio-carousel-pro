import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Zap, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";

const plans = [
  {
    name: "Amostra Grátis",
    description: "Experimente antes de assinar",
    price: "R$ 0",
    period: "",
    features: [
      "1 carrossel de teste",
      "Todos os 3 tons de voz",
      "Todos os formatos",
      "Com marca d'água",
    ],
    limitations: [
      "Sem histórico",
      "Sem download em ZIP",
    ],
    cta: "Testar Grátis",
    variant: "outline" as const,
    featured: false,
  },
  {
    name: "Pro",
    description: "Para criadores sérios",
    price: "R$ 29,90",
    period: "/mês",
    features: [
      "Carrosséis ilimitados",
      "Sem marca d'água",
      "Todos os 3 tons de voz",
      "Todos os formatos",
      "Download em ZIP",
      "Histórico completo",
      "Suporte prioritário",
    ],
    limitations: [],
    cta: "Começar Agora",
    variant: "default" as const,
    featured: true,
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPro, createCheckout } = useSubscription();
  const [loading, setLoading] = useState(false);

  const handleFreeTrial = () => {
    if (!user) {
      navigate("/auth");
    } else {
      navigate("/create");
    }
  };

  const handleProSubscribe = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    if (isPro) {
      navigate("/dashboard");
      return;
    }

    setLoading(true);
    try {
      await createCheckout();
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="pricing" className="py-24 md:py-32 bg-secondary/30">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-sm font-semibold text-accent mb-4 tracking-wide uppercase">
            Preços simples
          </span>
          <h2 className="text-display-sm md:text-display-md mb-4">
            Comece grátis, escale quando quiser
          </h2>
          <p className="text-body-lg text-muted-foreground">
            Sem taxas ocultas. Cancele quando quiser.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              variant={plan.featured ? "pricing-featured" : "pricing"}
              className={`relative ${plan.featured ? "md:-mt-4 md:mb-4" : ""}`}
            >
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-accent text-accent-foreground text-sm font-semibold rounded-full shadow-lg">
                    <Sparkles className="w-4 h-4" />
                    Mais popular
                  </span>
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <CardTitle className={`text-2xl ${plan.featured ? "" : ""}`}>
                  {plan.name}
                </CardTitle>
                <CardDescription className={plan.featured ? "text-primary-foreground/70" : ""}>
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="text-center">
                <div className="mb-8">
                  <span className="text-5xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span className={`text-lg ${plan.featured ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {plan.period}
                    </span>
                  )}
                </div>

                <ul className="space-y-4 text-left">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        plan.featured ? "bg-primary-foreground/20" : "bg-success/20"
                      }`}>
                        <Check className={`w-3 h-3 ${plan.featured ? "text-primary-foreground" : "text-success"}`} />
                      </div>
                      <span className={plan.featured ? "text-primary-foreground/90" : ""}>{feature}</span>
                    </li>
                  ))}
                  {plan.limitations.map((limitation) => (
                    <li key={limitation} className="flex items-start gap-3 opacity-50">
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs">—</span>
                      </div>
                      <span>{limitation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  variant={plan.featured ? "secondary" : "accent"}
                  size="lg"
                  className={`w-full ${plan.featured ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" : ""}`}
                  onClick={plan.featured ? handleProSubscribe : handleFreeTrial}
                  disabled={plan.featured && loading}
                >
                  {plan.featured && loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {plan.featured && <Zap className="w-4 h-4" />}
                      {plan.featured && isPro ? "Acessar Dashboard" : plan.cta}
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Trust Elements */}
        <div className="mt-16 text-center">
          <div className="inline-flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              Pagamento seguro via Stripe
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              Cancele quando quiser
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              Suporte em português
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
