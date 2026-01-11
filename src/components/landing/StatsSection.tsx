import { motion } from "framer-motion";
import { Zap, Clock, Layers, Palette } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useLandingContent } from "@/hooks/useLandingContent";

const StatsSection = () => {
  const { language } = useLanguage();
  const { getContent } = useLandingContent();

  // Product metrics (not user numbers - we're in launch phase)
  const stats = [
    {
      value: getContent("stats", "stat1_value", language) || "10x",
      label: getContent("stats", "stat1_label", language) || (
        language === "pt-BR" ? "Mais rápido que manual" :
        language === "es" ? "Más rápido que manual" :
        "Faster than manual"
      ),
      icon: Zap,
      color: "from-amber-500 to-orange-500",
      bgColor: "bg-amber-500/10",
    },
    {
      value: getContent("stats", "stat2_value", language) || "30s",
      label: getContent("stats", "stat2_label", language) || (
        language === "pt-BR" ? "Para criar um carrossel" :
        language === "es" ? "Para crear un carrusel" :
        "To create a carousel"
      ),
      icon: Clock,
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-500/10",
    },
    {
      value: getContent("stats", "stat3_value", language) || "6-10",
      label: getContent("stats", "stat3_label", language) || (
        language === "pt-BR" ? "Slides por áudio" :
        language === "es" ? "Slides por audio" :
        "Slides per audio"
      ),
      icon: Layers,
      color: "from-emerald-500 to-teal-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      value: getContent("stats", "stat4_value", language) || "3",
      label: getContent("stats", "stat4_label", language) || (
        language === "pt-BR" ? "Tons de voz únicos" :
        language === "es" ? "Tonos de voz únicos" :
        "Unique voice tones"
      ),
      icon: Palette,
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-500/10",
    },
  ];

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
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <section className="py-16 bg-secondary/30 border-y border-border">
      <div className="container mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8"
        >
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className="text-center group"
              >
                <div className="relative">
                  {/* Icon background */}
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 + 0.2, type: "spring" }}
                    className={`w-14 h-14 mx-auto mb-4 rounded-2xl ${stat.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}
                  >
                    <IconComponent className={`w-7 h-7 bg-gradient-to-r ${stat.color} bg-clip-text`} style={{ color: stat.color.includes("amber") ? "#f59e0b" : stat.color.includes("blue") ? "#3b82f6" : stat.color.includes("emerald") ? "#10b981" : "#a855f7" }} />
                  </motion.div>

                  {/* Value with gradient */}
                  <motion.p
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 + 0.3, type: "spring" }}
                    className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}
                  >
                    {stat.value}
                  </motion.p>

                  {/* Label */}
                  <p className="text-sm md:text-base text-muted-foreground mt-1">
                    {stat.label}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default StatsSection;
