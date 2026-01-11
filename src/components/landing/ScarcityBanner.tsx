import { motion } from "framer-motion";
import { Zap, Check, ArrowRight } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useLandingContent } from "@/hooks/useLandingContent";
import { Button } from "@/components/ui/button";

const ScarcityBanner = () => {
  const { language } = useLanguage();
  const { getContent } = useLandingContent();

  // Check if scarcity is enabled
  const enabled = getContent("scarcity", "enabled", language) === "true";

  if (!enabled) return null;

  // Get dynamic content
  const badge = getContent("scarcity", "badge", language) || "OFERTA DE LANÇAMENTO";
  const title = getContent("scarcity", "title", language) || "Preço de lançamento para os primeiros 500 assinantes";

  const benefits = [
    getContent("scarcity", "benefit1", language) || "Preço travado para sempre",
    getContent("scarcity", "benefit2", language) || "Acesso antecipado a novos recursos",
    getContent("scarcity", "benefit3", language) || "Badge 'Early Adopter' exclusivo",
  ];

  const spotsFilled = parseInt(getContent("scarcity", "spots_filled", language) || "347");
  const spotsTotal = parseInt(getContent("scarcity", "spots_total", language) || "500");
  const spotsLabel = getContent("scarcity", "spots_label", language) || "vagas preenchidas";

  const percentage = (spotsFilled / spotsTotal) * 100;

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

                  {/* Urgency indicator */}
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="mt-4 text-center"
                  >
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      {language === "pt-BR"
                        ? "Enchendo rápido"
                        : language === "es"
                          ? "Llenándose rápido"
                          : "Filling up fast"}
                    </span>
                  </motion.div>
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
