import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, Check, ArrowRight, Loader2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useLandingContent } from "@/hooks/useLandingContent";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const ScarcityBanner = () => {
  const { language } = useLanguage();
  const { getContent } = useLandingContent();
  const [realSpotsFilled, setRealSpotsFilled] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if scarcity is enabled
  const enabled = getContent("scarcity", "enabled", language) === "true";

  // Fetch real subscriber count from database
  useEffect(() => {
    const fetchSubscriberCount = async () => {
      try {
        // Count active subscriptions for creator and agency tiers
        const { count, error } = await supabase
          .from("subscriptions")
          .select("*", { count: "exact", head: true })
          .in("tier", ["creator", "agency"])
          .eq("status", "active");

        if (error) {
          console.error("Error fetching subscriber count:", error);
          setRealSpotsFilled(null);
        } else {
          setRealSpotsFilled(count || 0);
        }
      } catch (err) {
        console.error("Error:", err);
        setRealSpotsFilled(null);
      } finally {
        setLoading(false);
      }
    };

    if (enabled) {
      fetchSubscriberCount();
    } else {
      setLoading(false);
    }
  }, [enabled]);

  if (!enabled) return null;

  // Get dynamic content
  const badge = getContent("scarcity", "badge", language) || (
    language === "pt-BR" ? "ACESSO ANTECIPADO" :
    language === "es" ? "ACCESO ANTICIPADO" :
    "EARLY ACCESS"
  );

  const title = getContent("scarcity", "title", language) || (
    language === "pt-BR" ? "Seja um dos primeiros 500 a garantir o preço de lançamento" :
    language === "es" ? "Sé uno de los primeros 500 en asegurar el precio de lanzamiento" :
    "Be one of the first 500 to lock in launch pricing"
  );

  const benefits = [
    getContent("scarcity", "benefit1", language) || (
      language === "pt-BR" ? "Preço travado para sempre" :
      language === "es" ? "Precio bloqueado para siempre" :
      "Price locked forever"
    ),
    getContent("scarcity", "benefit2", language) || (
      language === "pt-BR" ? "Acesso antecipado a novos recursos" :
      language === "es" ? "Acceso anticipado a nuevas funciones" :
      "Early access to new features"
    ),
    getContent("scarcity", "benefit3", language) || (
      language === "pt-BR" ? "Badge 'Early Adopter' exclusivo" :
      language === "es" ? "Badge 'Early Adopter' exclusivo" :
      "Exclusive 'Early Adopter' badge"
    ),
  ];

  // Use real data if available, otherwise fall back to content
  const spotsTotal = parseInt(getContent("scarcity", "spots_total", language) || "500");
  const spotsFilled = realSpotsFilled !== null ? realSpotsFilled : parseInt(getContent("scarcity", "spots_filled", language) || "0");
  const spotsLabel = getContent("scarcity", "spots_label", language) || (
    language === "pt-BR" ? "vagas preenchidas" :
    language === "es" ? "plazas ocupadas" :
    "spots filled"
  );

  const percentage = Math.min((spotsFilled / spotsTotal) * 100, 100);
  const spotsRemaining = Math.max(spotsTotal - spotsFilled, 0);

  return (
    <section className="py-16 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10" />

      {/* Animated border */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />

      <div className="container mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-card rounded-3xl border border-amber-500/30 p-8 md:p-10 shadow-2xl shadow-amber-500/10">
            <div className="flex flex-col lg:flex-row lg:items-center gap-8">
              {/* Left side - Content */}
              <div className="flex-1">
                {/* Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold mb-4"
                >
                  <Zap className="w-4 h-4" />
                  {badge}
                </motion.div>

                {/* Title */}
                <h3 className="text-2xl md:text-3xl font-bold mb-6">
                  {title}
                </h3>

                {/* Benefits */}
                <div className="space-y-3 mb-6">
                  {benefits.map((benefit, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Check className="w-4 h-4 text-emerald-500" />
                      </div>
                      <span className="text-muted-foreground">{benefit}</span>
                    </motion.div>
                  ))}
                </div>

                {/* CTA */}
                <Button variant="hero" size="lg" className="group" asChild>
                  <a href="/auth?mode=signup">
                    {language === "pt-BR"
                      ? "Garantir minha vaga"
                      : language === "es"
                        ? "Asegurar mi lugar"
                        : "Secure my spot"}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </a>
                </Button>
              </div>

              {/* Right side - Progress */}
              <div className="lg:w-64">
                <div className="bg-secondary/50 rounded-2xl p-6 border border-border">
                  {loading ? (
                    <div className="flex items-center justify-center h-40">
                      <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                    </div>
                  ) : (
                    <>
                      {/* Progress circle */}
                      <div className="relative w-32 h-32 mx-auto mb-4">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                          {/* Background circle */}
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="8"
                            className="text-muted/30"
                          />
                          {/* Progress circle */}
                          <motion.circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="url(#progressGradient)"
                            strokeWidth="8"
                            strokeLinecap="round"
                            initial={{ strokeDasharray: "0 283" }}
                            whileInView={{ strokeDasharray: `${percentage * 2.83} 283` }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                          />
                          <defs>
                            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#f59e0b" />
                              <stop offset="50%" stopColor="#f97316" />
                              <stop offset="100%" stopColor="#ef4444" />
                            </linearGradient>
                          </defs>
                        </svg>
                        {/* Center text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-bold">{spotsFilled}</span>
                          <span className="text-xs text-muted-foreground">/ {spotsTotal}</span>
                        </div>
                      </div>

                      {/* Label */}
                      <p className="text-center text-sm text-muted-foreground">
                        {spotsLabel}
                      </p>

                      {/* Remaining spots */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-4 text-center"
                      >
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          {spotsRemaining > 0 ? (
                            language === "pt-BR"
                              ? `${spotsRemaining} vagas restantes`
                              : language === "es"
                                ? `${spotsRemaining} plazas restantes`
                                : `${spotsRemaining} spots remaining`
                          ) : (
                            language === "pt-BR"
                              ? "Últimas vagas!"
                              : language === "es"
                                ? "¡Últimas plazas!"
                                : "Last spots!"
                          )}
                        </span>
                      </motion.div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ScarcityBanner;
