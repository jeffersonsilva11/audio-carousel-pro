import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/translations";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useLandingContent } from "@/hooks/useLandingContent";

const CTA = () => {
  const { language } = useLanguage();
  const { getContent } = useLandingContent();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  
  const y = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.95, 1, 1, 0.95]);

  // Get dynamic content with fallbacks
  const badge = getContent("cta", "badge", language) || t("cta", "badge", language);
  const title = getContent("cta", "title", language) || t("cta", "title", language);
  const subtitle = getContent("cta", "subtitle", language) || t("cta", "subtitle", language);
  const button = getContent("cta", "button", language) || t("cta", "button", language);
  const disclaimer = getContent("cta", "disclaimer", language) || t("cta", "disclaimer", language);

  return (
    <section ref={ref} className="py-24 md:py-32 bg-primary text-primary-foreground relative overflow-hidden">
      {/* Parallax Background Pattern */}
      <motion.div 
        style={{ y }}
        className="absolute inset-0 overflow-hidden pointer-events-none"
      >
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-foreground/5 rounded-full blur-3xl" />
      </motion.div>

      <motion.div 
        style={{ opacity, scale }}
        className="container mx-auto relative z-10"
      >
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 mb-8"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">
              {badge}
            </span>
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-display-sm md:text-display-md mb-6"
          >
            {title}
          </motion.h2>

          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-primary-foreground/70 mb-10 max-w-xl mx-auto"
          >
            {subtitle}
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                size="xl"
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-xl hover:shadow-2xl transition-all group w-full sm:w-auto"
                asChild
              >
                <a href="/auth">
                  {button}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
            </motion.div>
          </motion.div>

          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-6 text-sm text-primary-foreground/50"
          >
            {disclaimer}
          </motion.p>
        </div>
      </motion.div>
    </section>
  );
};

export default CTA;
