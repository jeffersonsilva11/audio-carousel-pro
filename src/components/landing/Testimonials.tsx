import { useState, useEffect } from "react";
import { Star, Quote, ArrowLeft, ArrowRight, TrendingUp, Clock, Zap } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { motion, AnimatePresence } from "framer-motion";

const Testimonials = () => {
  const { language } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);

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

  // Testimonials data
  const testimonials = [
    {
      id: 1,
      quote: language === "pt-BR"
        ? "Eu passava 4 horas por dia criando conteúdo. Agora faço em 20 minutos. Meu engajamento triplicou e finalmente tenho tempo para focar no meu negócio."
        : language === "es"
          ? "Pasaba 4 horas al día creando contenido. Ahora lo hago en 20 minutos. Mi engagement se triplicó y finalmente tengo tiempo para enfocarme en mi negocio."
          : "I used to spend 4 hours a day creating content. Now I do it in 20 minutes. My engagement tripled and I finally have time to focus on my business.",
      author: "Marina Silva",
      role: "Social Media Manager",
      company: "Agência Digital",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
      metric: "+340%",
      metricLabel: language === "pt-BR" ? "engajamento" : language === "es" ? "engagement" : "engagement",
      rating: 5,
    },
    {
      id: 2,
      quote: language === "pt-BR"
        ? "O tom provocador mudou completamente meu perfil. Minhas postagens agora geram debates e meu alcance orgânico explodiu. A melhor ferramenta que já usei."
        : language === "es"
          ? "El tono provocador cambió completamente mi perfil. Mis publicaciones ahora generan debates y mi alcance orgánico explotó. La mejor herramienta que he usado."
          : "The provocative tone completely changed my profile. My posts now spark debates and my organic reach exploded. Best tool I've ever used.",
      author: "Carlos Mendes",
      role: language === "pt-BR" ? "Criador de Conteúdo" : language === "es" ? "Creador de Contenido" : "Content Creator",
      company: "150K followers",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
      metric: "+520%",
      metricLabel: language === "pt-BR" ? "alcance" : language === "es" ? "alcance" : "reach",
      rating: 5,
    },
    {
      id: 3,
      quote: language === "pt-BR"
        ? "Como coach, preciso de conteúdo que conecte emocionalmente. O tom emocional do Audisell entende isso perfeitamente. Meus clientes sempre perguntam como eu faço."
        : language === "es"
          ? "Como coach, necesito contenido que conecte emocionalmente. El tono emocional de Audisell lo entiende perfectamente. Mis clientes siempre preguntan cómo lo hago."
          : "As a coach, I need content that connects emotionally. Audisell's emotional tone understands this perfectly. My clients always ask how I do it.",
      author: "Ana Beatriz",
      role: "Life Coach",
      company: "Coaching Premium",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
      metric: "+180%",
      metricLabel: language === "pt-BR" ? "conversões" : language === "es" ? "conversiones" : "conversions",
      rating: 5,
    },
    {
      id: 4,
      quote: language === "pt-BR"
        ? "Gerencio 12 contas de clientes. Antes era impossível manter qualidade e consistência. Com o Audisell, cada cliente tem conteúdo único e profissional todos os dias."
        : language === "es"
          ? "Gestiono 12 cuentas de clientes. Antes era imposible mantener calidad y consistencia. Con Audisell, cada cliente tiene contenido único y profesional todos los días."
          : "I manage 12 client accounts. It was impossible to maintain quality and consistency. With Audisell, each client has unique, professional content every day.",
      author: "Rodrigo Alves",
      role: language === "pt-BR" ? "Gestor de Redes Sociais" : language === "es" ? "Gestor de Redes Sociales" : "Social Media Manager",
      company: "MediaPro Agency",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
      metric: "12",
      metricLabel: language === "pt-BR" ? "contas gerenciadas" : language === "es" ? "cuentas gestionadas" : "accounts managed",
      rating: 5,
    },
  ];

  // Auto-rotate testimonials
  useEffect(() => {
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
          <span className="inline-block text-sm font-semibold text-accent mb-4 tracking-wide uppercase">
            {language === "pt-BR" ? "Casos de sucesso" : language === "es" ? "Casos de éxito" : "Success Stories"}
          </span>
          <h2 className="text-display-sm md:text-display-md mb-4">
            {language === "pt-BR" 
              ? "Criadores que transformaram seus resultados" 
              : language === "es"
                ? "Creadores que transformaron sus resultados"
                : "Creators who transformed their results"}
          </h2>
          <p className="text-body-lg text-muted-foreground">
            {language === "pt-BR"
              ? "Veja o que nossos usuários dizem sobre a plataforma"
              : language === "es"
                ? "Mira lo que dicen nuestros usuarios sobre la plataforma"
                : "See what our users say about the platform"}
          </p>
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
                  "{testimonials[activeIndex].quote}"
                </p>

                {/* Author Info */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <img
                      src={testimonials[activeIndex].avatar}
                      alt={testimonials[activeIndex].author}
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-accent/20"
                    />
                    <div>
                      <p className="font-semibold text-foreground">{testimonials[activeIndex].author}</p>
                      <p className="text-sm text-muted-foreground">
                        {testimonials[activeIndex].role} • {testimonials[activeIndex].company}
                      </p>
                      {/* Stars */}
                      <div className="flex gap-0.5 mt-1">
                        {[...Array(testimonials[activeIndex].rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Metric Badge */}
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20">
                    <TrendingUp className="w-4 h-4 text-accent" />
                    <span className="font-bold text-accent">{testimonials[activeIndex].metric}</span>
                    <span className="text-sm text-muted-foreground">{testimonials[activeIndex].metricLabel}</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
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
