import { motion } from "framer-motion";
import { Clock, TrendingDown, Users, ArrowRight, Sparkles } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useLandingContent } from "@/hooks/useLandingContent";
import { Button } from "@/components/ui/button";

const iconMap: Record<string, React.ElementType> = {
  clock: Clock,
  "trending-down": TrendingDown,
  users: Users,
};

const ProblemSection = () => {
  const { language } = useLanguage();
  const { getContent } = useLandingContent();

  // Get dynamic content
  const badge = getContent("problem", "badge", language) || "O PROBLEMA";
  const title = getContent("problem", "title", language) || "Criar conteúdo consistente é exaustivo";
  const subtitle = getContent("problem", "subtitle", language) || "E você sabe que consistência é o que separa criadores que crescem dos que desistem";

  const points = [
    {
      icon: getContent("problem", "point1_icon", language) || "clock",
      title: getContent("problem", "point1_title", language) || "5 horas por semana",
      description: getContent("problem", "point1_description", language) || "É o tempo médio gasto criando posts manualmente.",
      color: "from-red-500/20 to-red-500/5",
      iconColor: "text-red-500",
      borderColor: "border-red-500/20",
    },
    {
      icon: getContent("problem", "point2_icon", language) || "trending-down",
      title: getContent("problem", "point2_title", language) || "40% menos engajamento",
      description: getContent("problem", "point2_description", language) || "É o que acontece quando você fica dias sem postar.",
      color: "from-amber-500/20 to-amber-500/5",
      iconColor: "text-amber-500",
      borderColor: "border-amber-500/20",
    },
    {
      icon: getContent("problem", "point3_icon", language) || "users",
      title: getContent("problem", "point3_title", language) || "97% dos criadores",
      description: getContent("problem", "point3_description", language) || "Não conseguem manter uma rotina de publicação.",
      color: "from-blue-500/20 to-blue-500/5",
      iconColor: "text-blue-500",
      borderColor: "border-blue-500/20",
    },
  ];

  const solutionBadge = getContent("problem", "solution_badge", language) || "A SOLUÇÃO";
  const solutionTitle = getContent("problem", "solution_title", language) || "Fale por 30 segundos. Receba uma semana de conteúdo.";
  const solutionDescription = getContent("problem", "solution_description", language) || "O Audisell transforma sua voz em carrosséis profissionais prontos para publicar.";

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section className="py-24 md:py-32 bg-gradient-to-b from-background via-secondary/30 to-background relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto relative z-10">
        {/* Problem Section Header */}
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
            className="inline-block px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-semibold mb-6"
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

        {/* Problem Points Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-20"
        >
          {points.map((point, index) => {
            const IconComponent = iconMap[point.icon] || Clock;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className={`relative group p-6 rounded-2xl bg-gradient-to-b ${point.color} border ${point.borderColor} backdrop-blur-sm`}
              >
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl bg-background/80 flex items-center justify-center mb-4 shadow-lg ${point.iconColor}`}>
                  <IconComponent className="w-7 h-7" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold mb-2">{point.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {point.description}
                </p>

                {/* Decorative line */}
                <div className="absolute bottom-0 left-6 right-6 h-1 rounded-full bg-gradient-to-r from-transparent via-current to-transparent opacity-10" />
              </motion.div>
            );
          })}
        </motion.div>

        {/* Divider with arrow */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="flex justify-center mb-16"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <ArrowRight className="w-8 h-8 text-white rotate-90" />
          </div>
        </motion.div>

        {/* Solution Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <div className="relative p-8 md:p-12 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-500/20 overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />

            {/* Sparkles decoration */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute top-4 right-4 text-emerald-500/30"
            >
              <Sparkles className="w-8 h-8" />
            </motion.div>

            <div className="relative z-10 text-center">
              <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm font-semibold mb-6">
                {solutionBadge}
              </span>

              <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
                {solutionTitle}
              </h3>

              <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
                {solutionDescription}
              </p>

              <Button variant="hero" size="lg" className="group" asChild>
                <a href="/auth?mode=signup">
                  {language === "pt-BR"
                    ? "Começar agora — é grátis"
                    : language === "es"
                      ? "Comenzar ahora — es gratis"
                      : "Start now — it's free"}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ProblemSection;
