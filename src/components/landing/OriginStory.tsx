import { motion } from "framer-motion";
import { Quote, ArrowRight, Lightbulb, Rocket } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useLandingContent } from "@/hooks/useLandingContent";

const OriginStory = () => {
  const { language } = useLanguage();
  const { getContent } = useLandingContent();

  // Get dynamic content
  const badge = getContent("origin_story", "badge", language) || "NOSSA HISTÓRIA";
  const title = getContent("origin_story", "title", language) || "Por que criamos o Audisell?";

  const beforeLabel = getContent("origin_story", "before_label", language) || "ANTES";
  const beforeText = getContent("origin_story", "before_text", language) || "Eu passava 6 horas por semana criando posts. Mesmo assim, não conseguia ser consistente.";

  const turningPointLabel = getContent("origin_story", "turning_point_label", language) || "O PONTO DE VIRADA";
  const turningPointText = getContent("origin_story", "turning_point_text", language) || "Percebi que minhas melhores ideias surgiam quando eu falava, não quando escrevia.";

  const afterLabel = getContent("origin_story", "after_label", language) || "AGORA";
  const afterText = getContent("origin_story", "after_text", language) || "Criamos uma ferramenta que transforma voz em conteúdo profissional.";

  const founderName = getContent("origin_story", "founder_name", language) || "Jefferson Silva";
  const founderRole = getContent("origin_story", "founder_role", language) || "Fundador do Audisell";

  const timelineSteps = [
    {
      label: beforeLabel,
      text: beforeText,
      icon: Quote,
      color: "from-red-500 to-rose-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
      iconBg: "bg-red-500/20",
      iconColor: "text-red-500",
    },
    {
      label: turningPointLabel,
      text: turningPointText,
      icon: Lightbulb,
      color: "from-amber-500 to-orange-500",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/30",
      iconBg: "bg-amber-500/20",
      iconColor: "text-amber-500",
    },
    {
      label: afterLabel,
      text: afterText,
      icon: Rocket,
      color: "from-emerald-500 to-teal-500",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/30",
      iconBg: "bg-emerald-500/20",
      iconColor: "text-emerald-500",
    },
  ];

  return (
    <section className="py-24 md:py-32 bg-gradient-to-b from-secondary/20 to-background relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-radial from-accent/5 to-transparent" />
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
            className="text-display-sm md:text-display-md"
          >
            {title}
          </motion.h2>
        </motion.div>

        {/* Timeline */}
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-red-500 via-amber-500 to-emerald-500 hidden md:block" />
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-red-500 via-amber-500 to-emerald-500 md:hidden" />

            {/* Timeline items */}
            <div className="space-y-12 md:space-y-16">
              {timelineSteps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 }}
                  className={`relative flex gap-6 md:gap-12 ${
                    index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                  }`}
                >
                  {/* Icon node */}
                  <div className="absolute left-4 md:left-1/2 md:-translate-x-1/2 z-10">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className={`w-8 h-8 md:w-12 md:h-12 rounded-full ${step.iconBg} border-2 ${step.borderColor} flex items-center justify-center shadow-lg`}
                    >
                      <step.icon className={`w-4 h-4 md:w-6 md:h-6 ${step.iconColor}`} />
                    </motion.div>
                  </div>

                  {/* Content card */}
                  <div className={`flex-1 ml-16 md:ml-0 ${index % 2 === 0 ? "md:pr-16" : "md:pl-16"}`}>
                    <motion.div
                      whileHover={{ y: -5 }}
                      className={`p-6 md:p-8 rounded-2xl ${step.bgColor} border ${step.borderColor} backdrop-blur-sm`}
                    >
                      <span className={`inline-block px-3 py-1 rounded-full bg-gradient-to-r ${step.color} text-white text-xs font-bold mb-4`}>
                        {step.label}
                      </span>
                      <p className="text-lg md:text-xl leading-relaxed text-foreground/90">
                        "{step.text}"
                      </p>
                    </motion.div>
                  </div>

                  {/* Spacer for alternating layout */}
                  <div className="hidden md:block flex-1" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Founder signature */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-4 px-6 py-4 rounded-2xl bg-card border border-border shadow-lg">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-white font-bold text-xl">
              {founderName.charAt(0)}
            </div>
            <div className="text-left">
              <p className="font-semibold">{founderName}</p>
              <p className="text-sm text-muted-foreground">{founderRole}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default OriginStory;
