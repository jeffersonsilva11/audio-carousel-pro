import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowRight, Play, Sparkles, Check, Zap, Shield, Instagram, Linkedin, X } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/translations";
import { BRAND } from "@/lib/constants";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useLandingContent } from "@/hooks/useLandingContent";

// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const Hero = () => {
  const { language } = useLanguage();
  const { getContent, loading: contentLoading } = useLandingContent();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [demoVideoUrl, setDemoVideoUrl] = useState("https://www.youtube.com/embed/dQw4w9WgXcQ");
  
  // Parallax effect
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 0.5], [0, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  // Fetch demo video URL from settings
  useEffect(() => {
    const fetchVideoUrl = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'demo_video_url')
        .maybeSingle();
      
      if (data?.value) {
        // Convert to embed URL if needed
        let url = data.value;
        if (url.includes('youtube.com/watch?v=')) {
          const videoId = url.split('v=')[1]?.split('&')[0];
          url = `https://www.youtube.com/embed/${videoId}`;
        } else if (url.includes('youtu.be/')) {
          const videoId = url.split('youtu.be/')[1]?.split('?')[0];
          url = `https://www.youtube.com/embed/${videoId}`;
        }
        setDemoVideoUrl(url);
      }
    };
    
    fetchVideoUrl();
  }, []);

  // Get dynamic content with fallback
  const heroTitle1 = getContent("hero", "title_part1", language) || (language === "pt-BR" ? "Transforme sua" : language === "es" ? "Transforma tu" : "Transform your");
  const heroHighlight = getContent("hero", "title_highlight", language) || (language === "pt-BR" ? "voz" : language === "es" ? "voz" : "voice");
  const heroTitle2 = getContent("hero", "title_part2", language) || (language === "pt-BR" ? "em carrosséis profissionais" : language === "es" ? "en carruseles profesionales" : "into professional carousels");
  const heroSubtitle = getContent("hero", "subtitle", language) || (language === "pt-BR"
    ? "Grave um áudio de 30 segundos. Receba slides profissionais prontos para Instagram, LinkedIn, TikTok e mais."
    : language === "es"
      ? "Graba un audio de 30 segundos. Recibe slides profesionales listos para Instagram, LinkedIn, TikTok y más."
      : "Record a 30-second audio. Get professional slides ready for Instagram, LinkedIn, TikTok, and more.");
  const ctaPrimary = getContent("hero", "cta_primary", language) || (language === "pt-BR" ? "Criar meu primeiro carrossel grátis" : language === "es" ? "Crear mi primer carrusel gratis" : "Create my first free carousel");
  const ctaSecondary = getContent("hero", "cta_secondary", language) || (language === "pt-BR" ? "Ver demonstração" : language === "es" ? "Ver demostración" : "Watch demo");

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


  // Platform badges
  const platforms = [
    { name: "Instagram", icon: Instagram },
    { name: "LinkedIn", icon: Linkedin },
    { name: "TikTok", icon: TikTokIcon },
  ];


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

              {/* Main Headline - Dynamic Content */}
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-display-md md:text-display-lg lg:text-display-xl mb-6"
              >
                {heroTitle1}{" "}
                <span className="text-gradient">{heroHighlight}</span>{" "}
                {heroTitle2}
              </motion.h1>

              {/* Subheadline - Dynamic Content */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-body-lg md:text-body-xl text-muted-foreground mb-6 max-w-xl mx-auto lg:mx-0"
              >
                {heroSubtitle}
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
                  <Zap className="w-4 h-4 text-green-500" />
                  {language === "pt-BR" ? "Resultados em 30s" : language === "es" ? "Resultados en 30s" : "Results in 30s"}
                </div>
              </motion.div>

              {/* CTA Buttons - Dynamic Content */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row items-center gap-4 mb-8 justify-center lg:justify-start"
              >
                <Button variant="hero" size="xl" className="group w-full sm:w-auto" asChild>
                  <a href="/auth?mode=signup">
                    {ctaPrimary}
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
                  {ctaSecondary}
                </Button>
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
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/40 to-white/20 ring-2 ring-white/30 flex items-center justify-center">
                                <span className="text-white font-bold text-sm">SC</span>
                              </div>
                              <div className="text-white">
                                <p className="font-semibold text-sm">@seuconteudo</p>
                                <p className="text-xs text-white/70">
                                  {language === "pt-BR" ? "Exemplo de carrossel" : language === "es" ? "Ejemplo de carrusel" : "Carousel example"}
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
                      <p className="text-xs font-semibold">{language === "pt-BR" ? "Pronto!" : language === "es" ? "¡Listo!" : "Done!"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {language === "pt-BR" ? "6 slides gerados" : language === "es" ? "6 slides generados" : "6 slides generated"}
                      </p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                  className="absolute -right-4 bottom-1/4 glass-card rounded-xl p-3 shadow-xl hidden lg:block"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{language === "pt-BR" ? "IA" : "AI"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {language === "pt-BR" ? "Powered" : language === "es" ? "Powered" : "Powered"}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>

        </div>
      </section>

      {/* Video Demo Modal */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <div className="relative aspect-video">
            <button 
              onClick={() => setShowVideoModal(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            <iframe
              src={demoVideoUrl}
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
