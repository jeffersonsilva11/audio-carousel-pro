import { Mic, Sparkles, Download, ArrowRight, Instagram, Linkedin, FileImage } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/translations";
import { motion } from "framer-motion";
import { useLandingContent } from "@/hooks/useLandingContent";

// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const HowItWorks = () => {
  const { language } = useLanguage();
  const { getContent } = useLandingContent();

  // Get dynamic content with fallbacks
  const sectionTitle = getContent("how_it_works", "section_title", language) || t("howItWorks", "sectionTitle", language);
  const title = getContent("how_it_works", "title", language) || t("howItWorks", "title", language);
  const subtitle = getContent("how_it_works", "subtitle", language) || t("howItWorks", "subtitle", language);
  
  const step1Title = getContent("how_it_works", "step1_title", language) || t("howItWorks", "step1Title", language);
  const step1Desc = getContent("how_it_works", "step1_desc", language) || t("howItWorks", "step1Desc", language);
  const step2Title = getContent("how_it_works", "step2_title", language) || t("howItWorks", "step2Title", language);
  const step2Desc = getContent("how_it_works", "step2_desc", language) || t("howItWorks", "step2Desc", language);
  const step3Title = getContent("how_it_works", "step3_title", language) || t("howItWorks", "step3Title", language);
  const step3Desc = getContent("how_it_works", "step3_desc", language) || (language === "pt-BR" 
    ? "Receba slides prontos em alta qualidade. Baixe individualmente ou em ZIP e poste no Instagram, LinkedIn, TikTok e mais."
    : language === "es"
      ? "Recibe slides listos en alta calidad. Descarga individualmente o en ZIP y publica en Instagram, LinkedIn, TikTok y más."
      : "Get ready slides in high quality. Download individually or as ZIP and post on Instagram, LinkedIn, TikTok, and more.");

  const steps = [
    {
      icon: Mic,
      title: step1Title,
      description: step1Desc,
      color: "bg-blue-500/10 text-blue-500",
      borderColor: "border-blue-500/20",
    },
    {
      icon: Sparkles,
      title: step2Title,
      description: step2Desc,
      color: "bg-violet-500/10 text-violet-500",
      borderColor: "border-violet-500/20",
    },
    {
      icon: Download,
      title: step3Title,
      description: step3Desc,
      color: "bg-emerald-500/10 text-emerald-500",
      borderColor: "border-emerald-500/20",
    },
  ];

  // Supported platforms
  const platforms = [
    { name: "Instagram", icon: Instagram },
    { name: "LinkedIn", icon: Linkedin },
    { name: "TikTok", icon: TikTokIcon },
  ];

  return (
    <section id="features" className="py-24 md:py-32 bg-secondary/30">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.span 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block text-sm font-semibold text-accent mb-4 tracking-wide uppercase"
          >
            {sectionTitle}
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
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <motion.div 
              key={step.title} 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="relative"
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px">
                  <div className="h-full bg-gradient-to-r from-border to-transparent" />
                  <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                </div>
              )}

              <div className={`relative bg-card rounded-2xl p-8 border ${step.borderColor} shadow-card hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}>
                {/* Step Number */}
                <span className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-lg">
                  {index + 1}
                </span>

                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl ${step.color} flex items-center justify-center mb-6`}>
                  <step.icon className="w-7 h-7" />
                </div>

                {/* Content */}
                <h3 className="text-heading mb-3">{step.title}</h3>
                <p className="text-body text-muted-foreground">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Visual Demo */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 max-w-4xl mx-auto"
        >
          <div className="bg-card rounded-3xl border border-border shadow-xl p-6 md:p-10">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Audio Visualization */}
              <div className="flex-1 w-full">
                <div className="bg-secondary rounded-2xl p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                      <Mic className="w-6 h-6 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">{t("howItWorks", "yourAudio", language)}</p>
                      <p className="text-sm text-muted-foreground">00:45 / 01:00</p>
                    </div>
                  </div>
                  {/* Waveform visualization */}
                  <div className="flex items-center justify-center h-16 gap-0.5">
                    {[...Array(40)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-accent rounded-full animate-pulse"
                        style={{
                          height: `${20 + Math.random() * 40}px`,
                          animationDelay: `${i * 0.05}s`,
                          opacity: 0.3 + Math.random() * 0.7,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <ArrowRight className="w-6 h-6 text-accent" />
                </div>
              </div>

              {/* Output Preview */}
              <div className="flex-1 w-full">
                <div className="grid grid-cols-3 gap-2">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="aspect-square bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center relative overflow-hidden group"
                    >
                      <span className="text-[10px] text-primary-foreground/60 absolute top-1 right-1">
                        {i + 1}
                      </span>
                      <div className="p-2 text-center">
                        <p className="text-[8px] md:text-[10px] text-primary-foreground font-medium leading-tight">
                          {i === 0 && "O que ninguém te conta..."}
                          {i === 1 && "A verdade é que..."}
                          {i === 2 && "Mas quando você..."}
                          {i === 3 && "E foi assim que..."}
                          {i === 4 && "Agora é sua vez"}
                          {i === 5 && "@seuperfil"}
                        </p>
                      </div>
                      <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/10 transition-colors" />
                    </div>
                  ))}
                </div>
                
                {/* Platform badges below output */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  <span className="text-xs text-muted-foreground">
                    {language === "pt-BR" ? "Pronto para:" : language === "es" ? "Listo para:" : "Ready for:"}
                  </span>
                  <div className="flex items-center gap-2">
                    {platforms.map((platform) => (
                      <div 
                        key={platform.name} 
                        className="w-6 h-6 rounded-full bg-muted flex items-center justify-center"
                        title={platform.name}
                      >
                        <platform.icon className="w-3 h-3 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
