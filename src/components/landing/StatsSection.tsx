import { motion } from "framer-motion";
import { Users, Image, Star, Zap } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useLandingContent } from "@/hooks/useLandingContent";

const iconMap: Record<number, React.ElementType> = {
  0: Users,
  1: Image,
  2: Star,
  3: Zap,
};

const StatsSection = () => {
  const { language } = useLanguage();
  const { getContent } = useLandingContent();

  const stats = [
    {
      value: getContent("stats", "stat1_value", language) || "2.500+",
      label: getContent("stats", "stat1_label", language) || "Criadores ativos",
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-500/10",
    },
    {
      value: getContent("stats", "stat2_value", language) || "50.000+",
      label: getContent("stats", "stat2_label", language) || "Carrosséis gerados",
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-500/10",
    },
    {
      value: getContent("stats", "stat3_value", language) || "97%",
      label: getContent("stats", "stat3_label", language) || "Taxa de satisfação",
      color: "from-emerald-500 to-teal-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      value: getContent("stats", "stat4_value", language) || "10x",
      label: getContent("stats", "stat4_label", language) || "Mais rápido que manual",
      color: "from-amber-500 to-orange-500",
      bgColor: "bg-amber-500/10",
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
            const IconComponent = iconMap[index];
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
                    className={`w-16 h-16 mx-auto mb-4 rounded-2xl ${stat.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}
                  >
                    <IconComponent className={`w-8 h-8 bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`} style={{ stroke: `url(#gradient-${index})` }} />
                    <svg width="0" height="0">
                      <defs>
                        <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor={stat.color.includes("blue") ? "#3b82f6" : stat.color.includes("purple") ? "#a855f7" : stat.color.includes("emerald") ? "#10b981" : "#f59e0b"} />
                          <stop offset="100%" stopColor={stat.color.includes("blue") ? "#06b6d4" : stat.color.includes("purple") ? "#ec4899" : stat.color.includes("emerald") ? "#14b8a6" : "#f97316"} />
                        </linearGradient>
                      </defs>
                    </svg>
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
