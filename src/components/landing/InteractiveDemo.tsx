import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Brain, Image, Check, Play, Pause, Volume2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useLandingContent } from "@/hooks/useLandingContent";
import { Button } from "@/components/ui/button";

const InteractiveDemo = () => {
  const { language } = useLanguage();
  const { getContent } = useLandingContent();
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  // Get dynamic content
  const badge = getContent("demo", "badge", language) || "VEJA COMO FUNCIONA";
  const title = getContent("demo", "title", language) || "Da sua voz ao feed em 3 passos";
  const subtitle = getContent("demo", "subtitle", language) || "Clique em cada passo para ver a mágica acontecer";

  const steps = [
    {
      icon: Mic,
      title: getContent("demo", "step1_title", language) || "Grave ou envie",
      description: getContent("demo", "step1_description", language) || "30 segundos de áudio sobre qualquer tema",
      duration: getContent("demo", "step1_duration", language) || "30s",
      color: "from-violet-500 to-purple-600",
      bgColor: "bg-violet-500/10",
      borderColor: "border-violet-500/30",
      iconColor: "text-violet-500",
      animation: "recording",
    },
    {
      icon: Brain,
      title: getContent("demo", "step2_title", language) || "IA processa",
      description: getContent("demo", "step2_description", language) || "Transcreve, roteiriza e aplica seu tom de voz",
      duration: getContent("demo", "step2_duration", language) || "~15s",
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
      iconColor: "text-blue-500",
      animation: "processing",
    },
    {
      icon: Image,
      title: getContent("demo", "step3_title", language) || "Pronto para postar",
      description: getContent("demo", "step3_description", language) || "Carrossel profissional gerado automaticamente",
      duration: getContent("demo", "step3_duration", language) || "Instantâneo",
      color: "from-emerald-500 to-teal-500",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/30",
      iconColor: "text-emerald-500",
      animation: "complete",
    },
  ];

  const ctaText = getContent("demo", "cta_text", language) || "Experimentar agora";

  // Auto-advance steps
  useEffect(() => {
    if (!isPlaying) return;

    const stepDuration = 3000;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveStep((step) => (step + 1) % steps.length);
          return 0;
        }
        return prev + 2;
      });
    }, stepDuration / 50);

    return () => clearInterval(interval);
  }, [isPlaying, steps.length]);

  // Audio wave animation for recording step
  const AudioWave = () => (
    <div className="flex items-center justify-center gap-1 h-16">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-gradient-to-t from-violet-500 to-purple-400 rounded-full"
          animate={{
            height: [8, 24 + Math.random() * 24, 8],
          }}
          transition={{
            duration: 0.5 + Math.random() * 0.3,
            repeat: Infinity,
            delay: i * 0.05,
          }}
        />
      ))}
    </div>
  );

  // Processing animation
  const ProcessingAnimation = () => (
    <div className="relative w-24 h-24 mx-auto">
      <motion.div
        className="absolute inset-0 rounded-full border-4 border-blue-500/30"
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.div
        className="absolute inset-2 rounded-full border-4 border-cyan-500/50"
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />
      <div className="absolute inset-4 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
        <Brain className="w-8 h-8 text-white" />
      </div>
    </div>
  );

  // Complete animation - carousel preview
  const CompleteAnimation = () => (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="grid grid-cols-3 gap-2"
      >
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="aspect-square rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center"
          >
            {i === 0 && <Check className="w-6 h-6 text-emerald-500" />}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );

  const renderAnimation = (animation: string) => {
    switch (animation) {
      case "recording":
        return <AudioWave />;
      case "processing":
        return <ProcessingAnimation />;
      case "complete":
        return <CompleteAnimation />;
      default:
        return null;
    }
  };

  return (
    <section className="py-24 md:py-32 bg-gradient-to-b from-background via-secondary/30 to-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl" />
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

        {/* Demo container */}
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Steps list */}
            <div className="space-y-4">
              {steps.map((step, index) => (
                <motion.button
                  key={index}
                  onClick={() => {
                    setActiveStep(index);
                    setProgress(0);
                  }}
                  whileHover={{ x: 5 }}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 ${
                    activeStep === index
                      ? `${step.bgColor} ${step.borderColor} shadow-lg`
                      : "bg-card border-border hover:border-accent/30"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Step number and icon */}
                    <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center ${
                      activeStep === index
                        ? `bg-gradient-to-br ${step.color} text-white`
                        : "bg-muted text-muted-foreground"
                    }`}>
                      <step.icon className="w-6 h-6" />
                      {activeStep === index && (
                        <motion.div
                          className="absolute inset-0 rounded-xl"
                          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          style={{
                            background: `linear-gradient(to bottom right, var(--tw-gradient-stops))`,
                          }}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold">{step.title}</h3>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          activeStep === index
                            ? `bg-gradient-to-r ${step.color} text-white`
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {step.duration}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{step.description}</p>

                      {/* Progress bar */}
                      {activeStep === index && (
                        <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full bg-gradient-to-r ${step.color}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}

              {/* Play/Pause control */}
              <div className="flex items-center justify-center gap-4 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="gap-2"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4" />
                      {language === "pt-BR" ? "Pausar" : language === "es" ? "Pausar" : "Pause"}
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      {language === "pt-BR" ? "Reproduzir" : language === "es" ? "Reproducir" : "Play"}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Animation preview */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className={`relative p-8 rounded-3xl border ${steps[activeStep].borderColor} ${steps[activeStep].bgColor} min-h-[300px] flex items-center justify-center overflow-hidden`}>
                {/* Background glow */}
                <div className={`absolute inset-0 bg-gradient-to-br ${steps[activeStep].color} opacity-5`} />

                {/* Animation content */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="relative z-10"
                  >
                    {renderAnimation(steps[activeStep].animation)}
                  </motion.div>
                </AnimatePresence>

                {/* Step indicator */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i === activeStep
                          ? `w-6 bg-gradient-to-r ${steps[activeStep].color}`
                          : "bg-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mt-6 text-center"
              >
                <Button variant="hero" size="lg" className="group" asChild>
                  <a href="/auth?mode=signup">
                    {ctaText}
                    <motion.span
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      →
                    </motion.span>
                  </a>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InteractiveDemo;
