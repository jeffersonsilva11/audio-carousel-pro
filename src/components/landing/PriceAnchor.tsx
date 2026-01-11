import { motion } from "framer-motion";
import { Palette, Clock, PenTool, Check, ArrowRight, Sparkles } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useLandingContent } from "@/hooks/useLandingContent";
import { Button } from "@/components/ui/button";

const PriceAnchor = () => {
  const { language } = useLanguage();
  const { getContent } = useLandingContent();

  // Get dynamic content
  const badge = getContent("price_anchor", "badge", language) || "COMPARE E ECONOMIZE";
  const title = getContent("price_anchor", "title", language) || "Quanto custa criar 12 carrosséis por mês?";
  const subtitle = getContent("price_anchor", "subtitle", language) || "Veja quanto você gastaria com métodos tradicionais";

  const costs = [
    {
      icon: Palette,
      label: getContent("price_anchor", "cost1_label", language) || "Designer freelancer",
      value: getContent("price_anchor", "cost1_value", language) || "R$ 150/carrossel = R$ 1.800/mês",
      color: "from-purple-500/20 to-purple-500/5",
      iconColor: "text-purple-500",
    },
    {
      icon: Clock,
      label: getContent("price_anchor", "cost2_label", language) || "Seu tempo",
      value: getContent("price_anchor", "cost2_value", language) || "5h/semana × R$ 50/h = R$ 1.000/mês",
      color: "from-blue-500/20 to-blue-500/5",
      iconColor: "text-blue-500",
    },
    {
      icon: PenTool,
      label: getContent("price_anchor", "cost3_label", language) || "Copywriter",
      value: getContent("price_anchor", "cost3_value", language) || "R$ 100/post = R$ 1.200/mês",
      color: "from-amber-500/20 to-amber-500/5",
      iconColor: "text-amber-500",
    },
  ];

  const totalLabel = getContent("price_anchor", "total_label", language) || "TOTAL TRADICIONAL";
  const totalValue = getContent("price_anchor", "total_value", language) || "R$ 4.000/mês";
  const audisellLabel = getContent("price_anchor", "audisell_label", language) || "Com Audisell Creator";
  const audisellValue = getContent("price_anchor", "audisell_value", language) || "R$ 99,90/mês";
  const savingsLabel = getContent("price_anchor", "savings_label", language) || "Você economiza";
  const savingsPercentage = getContent("price_anchor", "savings_percentage", language) || "97%";

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <section className="py-24 md:py-32 bg-gradient-to-b from-background to-secondary/20 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }} />
      </div>

      <div className="container mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-semibold mb-6"
          >
            {badge}
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-display-sm md:text-display-md mb-4"
          >
            {title}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-body-lg text-muted-foreground"
          >
            {subtitle}
          </motion.p>
        </motion.div>

        {/* Comparison Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <div className="relative bg-card rounded-3xl border border-border shadow-2xl overflow-hidden">
            {/* Traditional costs section */}
            <div className="p-8 md:p-10">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="space-y-4"
              >
                {costs.map((cost, index) => (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    className={`flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r ${cost.color} border border-border/50`}
                  >
                    <div className={`w-12 h-12 rounded-lg bg-background flex items-center justify-center ${cost.iconColor}`}>
                      <cost.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-muted-foreground">{cost.label}</p>
                      <p className="font-semibold">{cost.value}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Total tradicional */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="mt-6 pt-6 border-t border-border"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {totalLabel}
                  </span>
                  <span className="text-2xl md:text-3xl font-bold text-red-500 line-through decoration-2">
                    {totalValue}
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Audisell section - highlighted */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="relative bg-gradient-to-br from-emerald-500 to-teal-600 p-8 md:p-10"
            >
              {/* Sparkle decoration */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute top-4 right-4 text-white/20"
              >
                <Sparkles className="w-10 h-10" />
              </motion.div>

              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div>
                    <p className="text-emerald-100 font-medium mb-1">{audisellLabel}</p>
                    <p className="text-4xl md:text-5xl font-bold text-white">{audisellValue}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-center px-6 py-3 rounded-2xl bg-white/20 backdrop-blur-sm">
                      <p className="text-sm text-emerald-100">{savingsLabel}</p>
                      <p className="text-3xl font-bold text-white">{savingsPercentage}</p>
                    </div>
                  </div>
                </div>

                {/* Benefits list */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    language === "pt-BR" ? "Ilimitado por mês" : language === "es" ? "Ilimitado por mes" : "Unlimited per month",
                    language === "pt-BR" ? "Sem designer" : language === "es" ? "Sin diseñador" : "No designer needed",
                    language === "pt-BR" ? "Pronto em segundos" : language === "es" ? "Listo en segundos" : "Ready in seconds",
                  ].map((benefit, index) => (
                    <div key={index} className="flex items-center gap-2 text-white/90">
                      <Check className="w-5 h-5 text-emerald-200" />
                      <span className="text-sm font-medium">{benefit}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="mt-8">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full md:w-auto bg-white text-emerald-600 hover:bg-white/90 font-semibold group"
                    asChild
                  >
                    <a href="/auth?mode=signup">
                      {language === "pt-BR"
                        ? "Começar a economizar agora"
                        : language === "es"
                          ? "Empezar a ahorrar ahora"
                          : "Start saving now"}
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </a>
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PriceAnchor;
