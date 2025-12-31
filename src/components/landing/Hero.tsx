import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowRight, Play, Sparkles, Check, Users, Zap, Shield, TrendingUp, Instagram, Linkedin, X } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/translations";
import { BRAND } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";

// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const Hero = () => {
  const { language } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showVideoModal, setShowVideoModal] = useState(false);
  
  // YouTube video URL (can be configured via admin in the future)
  const demoVideoUrl = "https://www.youtube.com/embed/dQw4w9WgXcQ"; // Placeholder - replace with actual demo video

  // Demo carousel slides with realistic content
  const demoSlides = [
    {
      type: "hook",
      text: language === "pt-BR" 
        ? "Você está perdendo vendas toda vez que ignora o poder do áudio."
        : language === "es"
          ? "Estás perdiendo ventas cada vez que ignoras el poder del audio."
          : "You are losing sales every time you ignore the power of audio.",
      gradient: "from-primary via-primary/90 to-indigo-700",
    },
    {
      type: "problem",
      text: language === "pt-BR"
        ? "97% dos criadores não conseguem manter consistência nas redes sociais."
        : language === "es"
          ? "97% de los creadores no logran mantener consistencia en redes sociales."
          : "97% of creators can't maintain consistency on social media.",
      gradient: "from-rose-600 via-rose-500 to-pink-600",
    },
    {
      type: "solution",
      text: language === "pt-BR"
        ? "E se você pudesse criar 1 semana de conteúdo em 10 minutos?"
        : language === "es"
          ? "¿Y si pudieras crear 1 semana de contenido en 10 minutos?"
          : "What if you could create 1 week of content in 10 minutes?",
      gradient: "from-emerald-600 via-emerald-500 to-teal-600",
    },
    {
      type: "cta",
      text: language === "pt-BR"
        ? "Comece agora — 100% grátis para testar."
        : language === "es"
          ? "Empieza ahora — 100% gratis para probar."
          : "Start now — 100% free to try.",
      gradient: "from-amber-600 via-amber-500 to-orange-600",
    },
  ];

  // Auto-slide effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % demoSlides.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [demoSlides.length]);

  // Stats for social proof
  const stats = [
    { value: "2.500+", label: language === "pt-BR" ? "Criadores ativos" : language === "es" ? "Creadores activos" : "Active creators" },
    { value: "50K+", label: language === "pt-BR" ? "Carrosséis gerados" : language === "es" ? "Carruseles generados" : "Carousels generated" },
    { value: "4.9/5", label: language === "pt-BR" ? "Avaliação média" : language === "es" ? "Calificación promedio" : "Average rating" },
  ];

  // Platform badges
  const platforms = [
    { name: "Instagram", icon: Instagram },
    { name: "LinkedIn", icon: Linkedin },
    { name: "TikTok", icon: TikTokIcon },
  ];

  // Testimonial for authority
  const testimonial = {
    quote: language === "pt-BR" 
      ? "Economizo 5 horas por semana com o Audisell. Meu engajamento aumentou 340%."
      : language === "es"
        ? "Ahorro 5 horas por semana con Audisell. Mi engagement aumentó 340%."
        : "I save 5 hours per week with Audisell. My engagement increased 340%.",
    author: "Marina Silva",
    role: language === "pt-BR" ? "Social Media Manager" : language === "es" ? "Social Media Manager" : "Social Media Manager",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
  };

  return (
    <>
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-hero-pattern">
        {/* Background gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/8 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        </div>

        <div className="container mx-auto relative z-10 py-12">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column - Content */}
            <div className="text-center lg:text-left">
              {/* Urgency Badge - Scarcity */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6"
              >
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  {language === "pt-BR" 
                    ? "🔥 Oferta por tempo limitado — 50% OFF no primeiro mês" 
                    : language === "es"
                      ? "🔥 Oferta por tiempo limitado — 50% OFF en el primer mes"
                      : "🔥 Limited time offer — 50% OFF first month"}
                </span>
              </motion.div>

              {/* Main Headline - Loss Aversion Hook */}
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-display-md md:text-display-lg lg:text-display-xl mb-6"
              >
                {language === "pt-BR" ? (
                  <>
                    Pare de <span className="text-destructive">perder horas</span> criando conteúdo.{" "}
                    <span className="text-gradient">A IA faz em segundos.</span>
                  </>
                ) : language === "es" ? (
                  <>
                    Deja de <span className="text-destructive">perder horas</span> creando contenido.{" "}
                    <span className="text-gradient">La IA lo hace en segundos.</span>
                  </>
                ) : (
                  <>
                    Stop <span className="text-destructive">wasting hours</span> creating content.{" "}
                    <span className="text-gradient">AI does it in seconds.</span>
                  </>
                )}
              </motion.h1>

              {/* Subheadline - Clear Value Proposition - UPDATED */}
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-body-lg md:text-xl text-muted-foreground mb-6 max-w-xl mx-auto lg:mx-0"
              >
                {language === "pt-BR" 
                  ? "Grave um áudio de 60 segundos. Receba slides profissionais prontos para Instagram, LinkedIn, TikTok e mais."
                  : language === "es"
                    ? "Graba un audio de 60 segundos. Recibe slides profesionales listos para Instagram, LinkedIn, TikTok y más."
                    : "Record a 60-second audio. Get professional slides ready for Instagram, LinkedIn, TikTok, and more."}
              </motion.p>

              {/* Platform badges */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex items-center gap-3 mb-8 justify-center lg:justify-start"
              >
                <span className="text-sm text-muted-foreground">
                  {language === "pt-BR" ? "Compatível com:" : language === "es" ? "Compatible con:" : "Works with:"}
                </span>
                <div className="flex items-center gap-2">
                  {platforms.map((platform) => (
                    <div key={platform.name} className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 text-muted-foreground">
                      <platform.icon className="w-4 h-4" />
                      <span className="text-xs font-medium hidden sm:inline">{platform.name}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Trust Indicators - Authority Bias */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-4 mb-8 justify-center lg:justify-start"
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="w-4 h-4 text-green-500" />
                  {language === "pt-BR" ? "Pagamento seguro" : language === "es" ? "Pago seguro" : "Secure payment"}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-green-500" />
                  {language === "pt-BR" ? "Cancele quando quiser" : language === "es" ? "Cancela cuando quieras" : "Cancel anytime"}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4 text-green-500" />
                  {language === "pt-BR" ? "2.500+ usuários" : language === "es" ? "2.500+ usuarios" : "2,500+ users"}
                </div>
              </motion.div>

              {/* CTA Buttons */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row items-center gap-4 mb-8 justify-center lg:justify-start"
              >
                <Button variant="hero" size="xl" className="group w-full sm:w-auto" asChild>
                  <a href="/auth">
                    {language === "pt-BR" ? "Criar meu primeiro carrossel grátis" : language === "es" ? "Crear mi primer carrusel gratis" : "Create my first free carousel"}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </a>
                </Button>
                <Button 
                  variant="hero-outline" 
                  size="lg" 
                  className="group w-full sm:w-auto"
                  onClick={() => setShowVideoModal(true)}
                >
                  <Play className="w-5 h-5" />
                  {language === "pt-BR" ? "Ver demonstração" : language === "es" ? "Ver demostración" : "Watch demo"}
                </Button>
              </motion.div>

              {/* Micro-testimonial - Social Proof */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border max-w-md mx-auto lg:mx-0"
              >
                <img 
                  src={testimonial.avatar} 
                  alt={testimonial.author}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-accent/20"
                />
                <div className="text-left">
                  <p className="text-sm text-muted-foreground italic">"{testimonial.quote}"</p>
                  <p className="text-xs font-medium mt-1">{testimonial.author} — {testimonial.role}</p>
                </div>
              </motion.div>
            </div>

            {/* Right Column - Demo Carousel with Auto-Slide */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="relative"
            >
              {/* Phone Frame */}
              <div className="relative max-w-sm mx-auto">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-purple-500/20 rounded-[2.5rem] blur-2xl" />
                
                {/* Device frame */}
                <div className="relative bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-[2.5rem] p-3 shadow-2xl border border-white/10">
                  {/* Screen */}
                  <div className="bg-background rounded-[2rem] overflow-hidden">
                    {/* Instagram-style carousel preview with animation */}
                    <div className="relative aspect-square overflow-hidden">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={currentSlide}
                          initial={{ opacity: 0, x: 50 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -50 }}
                          transition={{ duration: 0.4, ease: "easeInOut" }}
                          className={`absolute inset-0 bg-gradient-to-br ${demoSlides[currentSlide].gradient}`}
                        >
                          {/* Content */}
                          <div className="absolute inset-0 flex flex-col p-6">
                            {/* Profile header */}
                            <div className="flex items-center gap-3 mb-auto">
                              <img 
                                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face" 
                                alt="Profile"
                                className="w-10 h-10 rounded-full object-cover ring-2 ring-white/30"
                              />
                              <div className="text-white">
                                <p className="font-semibold text-sm">@seuconteudo</p>
                                <p className="text-xs text-white/70">
                                  {language === "pt-BR" ? "Criador de Conteúdo" : language === "es" ? "Creador de Contenido" : "Content Creator"}
                                </p>
                              </div>
                            </div>
                            
                            {/* Main text with animation */}
                            <motion.div 
                              key={`text-${currentSlide}`}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                              className="flex-1 flex items-center justify-center"
                            >
                              <p className="text-xl md:text-2xl font-bold text-white text-center leading-tight">
                                {demoSlides[currentSlide].text}
                              </p>
                            </motion.div>
                            
                            {/* Slide indicator */}
                            <div className="flex justify-center gap-1.5 mt-auto">
                              {demoSlides.map((_, i) => (
                                <motion.div
                                  key={i}
                                  className="h-1 rounded-full bg-white"
                                  animate={{
                                    width: i === currentSlide ? 24 : 6,
                                    opacity: i === currentSlide ? 1 : 0.4,
                                  }}
                                  transition={{ duration: 0.3 }}
                                />
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Floating badges */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="absolute -left-4 top-1/4 glass-card rounded-xl p-3 shadow-xl hidden lg:block"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-xs">
                        {language === "pt-BR" ? "Slides gerados" : language === "es" ? "Slides generados" : "Slides generated"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{language === "pt-BR" ? "em 12 segundos" : language === "es" ? "en 12 segundos" : "in 12 seconds"}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                  className="absolute -right-4 top-1/2 glass-card rounded-xl p-3 shadow-xl hidden lg:block"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="font-semibold text-xs">{language === "pt-BR" ? "+340% engajamento" : language === "es" ? "+340% engagement" : "+340% engagement"}</p>
                      <p className="text-[10px] text-muted-foreground">{language === "pt-BR" ? "em média" : language === "es" ? "en promedio" : "on average"}</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="absolute -bottom-4 left-1/2 -translate-x-1/2 glass-card rounded-xl p-3 shadow-xl hidden lg:block"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-xs">{language === "pt-BR" ? "Tom profissional" : language === "es" ? "Tono profesional" : "Professional tone"}</p>
                      <p className="text-[10px] text-muted-foreground">{language === "pt-BR" ? "aplicado automaticamente" : language === "es" ? "aplicado automáticamente" : "auto-applied"}</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Social Proof Stats - Anchoring */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mt-20 pt-12 border-t border-border/50"
          >
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <p className="text-2xl md:text-3xl font-bold text-accent">{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Video Demo Modal */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden">
          <div className="relative aspect-video">
            <button
              onClick={() => setShowVideoModal(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <iframe
              src={showVideoModal ? demoVideoUrl : ""}
              title="Demo Video"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Hero;
