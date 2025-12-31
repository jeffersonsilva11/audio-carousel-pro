import { useState, useEffect } from "react";
import { Star, Quote, ArrowLeft, ArrowRight, TrendingUp, Clock, Zap } from "lucide-react";
import { useLanguage, SupportedLanguage } from "@/hooks/useLanguage";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface Testimonial {
  id: string;
  quote_pt: string;
  quote_en: string | null;
  quote_es: string | null;
  author_name: string;
  author_role_pt: string;
  author_role_en: string | null;
  author_role_es: string | null;
  author_company: string | null;
  author_avatar: string | null;
  metric_value: string | null;
  metric_label_pt: string | null;
  metric_label_en: string | null;
  metric_label_es: string | null;
  rating: number;
  display_order: number;
}

const Testimonials = () => {
  const { language } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      setTestimonials(data || []);
    } catch (error) {
      console.error("Error fetching testimonials:", error);
    } finally {
      setLoading(false);
    }
  };

  const getQuote = (t: Testimonial, lang: SupportedLanguage): string => {
    if (lang === "en") return t.quote_en || t.quote_pt;
    if (lang === "es") return t.quote_es || t.quote_pt;
    return t.quote_pt;
  };

  const getRole = (t: Testimonial, lang: SupportedLanguage): string => {
    if (lang === "en") return t.author_role_en || t.author_role_pt;
    if (lang === "es") return t.author_role_es || t.author_role_pt;
    return t.author_role_pt;
  };

  const getMetricLabel = (t: Testimonial, lang: SupportedLanguage): string => {
    if (lang === "en") return t.metric_label_en || t.metric_label_pt || "";
    if (lang === "es") return t.metric_label_es || t.metric_label_pt || "";
    return t.metric_label_pt || "";
  };

  // Success metrics
  const metrics = [
    {
      value: "340%",
      label: language === "pt-BR" ? "Aumento médio no engajamento" : language === "es" ? "Aumento promedio en engagement" : "Average engagement increase",
      icon: TrendingUp,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      value: "5h",
      label: language === "pt-BR" ? "Economizadas por semana" : language === "es" ? "Ahorradas por semana" : "Saved per week",
      icon: Clock,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      value: "12s",
      label: language === "pt-BR" ? "Tempo médio de geração" : language === "es" ? "Tiempo promedio de generación" : "Average generation time",
      icon: Zap,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ];

  // Auto-rotate testimonials
  useEffect(() => {
    if (testimonials.length === 0) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  const goToPrev = () => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goToNext = () => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  if (loading) {
    return (
      <section className="py-24 md:py-32 bg-background">
        <div className="container mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Skeleton className="h-6 w-32 mx-auto mb-4" />
            <Skeleton className="h-12 w-96 mx-auto mb-4" />
            <Skeleton className="h-6 w-64 mx-auto" />
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-64 max-w-4xl mx-auto rounded-3xl" />
        </div>
      </section>
    );
  }

  if (testimonials.length === 0) {
    return null;
  }

  const currentTestimonial = testimonials[activeIndex];

  return (
    <section id="testimonials" className="py-24 md:py-32 bg-background relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.span 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block text-sm font-semibold text-accent mb-4 tracking-wide uppercase"
          >
            {language === "pt-BR" ? "Casos de sucesso" : language === "es" ? "Casos de éxito" : "Success Stories"}
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-display-sm md:text-display-md mb-4"
          >
            {language === "pt-BR" 
              ? "Criadores que transformaram seus resultados" 
              : language === "es"
                ? "Creadores que transformaron sus resultados"
                : "Creators who transformed their results"}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-body-lg text-muted-foreground"
          >
            {language === "pt-BR"
              ? "Veja o que nossos usuários dizem sobre a plataforma"
              : language === "es"
                ? "Mira lo que dicen nuestros usuarios sobre la plataforma"
                : "See what our users say about the platform"}
          </motion.p>
        </div>

        {/* Metrics Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-card rounded-2xl border border-border p-6 text-center shadow-card"
            >
              <div className={`w-12 h-12 rounded-xl ${metric.bgColor} flex items-center justify-center mx-auto mb-4`}>
                <metric.icon className={`w-6 h-6 ${metric.color}`} />
              </div>
              <p className={`text-3xl md:text-4xl font-bold ${metric.color} mb-2`}>{metric.value}</p>
              <p className="text-sm text-muted-foreground">{metric.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Testimonials Carousel */}
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="bg-card rounded-3xl border border-border p-8 md:p-12 shadow-xl"
              >
                {/* Quote Icon */}
                <Quote className="w-12 h-12 text-accent/20 mb-6" />

                {/* Quote Text */}
                <p className="text-lg md:text-xl text-foreground mb-8 leading-relaxed">
                  "{getQuote(currentTestimonial, language)}"
                </p>

                {/* Author Info */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    {currentTestimonial.author_avatar && (
                      <img
                        src={currentTestimonial.author_avatar}
                        alt={currentTestimonial.author_name}
                        className="w-14 h-14 rounded-full object-cover ring-2 ring-accent/20"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-foreground">{currentTestimonial.author_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {getRole(currentTestimonial, language)} {currentTestimonial.author_company && `• ${currentTestimonial.author_company}`}
                      </p>
                      {/* Stars */}
                      <div className="flex gap-0.5 mt-1">
                        {[...Array(currentTestimonial.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Metric Badge */}
                  {currentTestimonial.metric_value && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20">
                      <TrendingUp className="w-4 h-4 text-accent" />
                      <span className="font-bold text-accent">{currentTestimonial.metric_value}</span>
                      <span className="text-sm text-muted-foreground">{getMetricLabel(currentTestimonial, language)}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            {testimonials.length > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={goToPrev}
                  className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                {/* Dots */}
                <div className="flex gap-2">
                  {testimonials.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === activeIndex ? "w-6 bg-accent" : "bg-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={goToNext}
                  className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <p className="text-sm text-muted-foreground mb-4">
            {language === "pt-BR" 
              ? "Avaliação média de 4.9/5 baseada em +500 avaliações"
              : language === "es"
                ? "Calificación promedio de 4.9/5 basada en +500 reseñas"
                : "Average rating of 4.9/5 based on +500 reviews"}
          </p>
          <div className="flex items-center justify-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-6 h-6 fill-amber-400 text-amber-400" />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
