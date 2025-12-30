import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Heart, Briefcase, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/translations";

const ToneShowcase = () => {
  const { language } = useLanguage();

  const tones = [
    {
      id: "emotional",
      name: t("toneShowcase", "emotional", language),
      icon: Heart,
      description: t("toneShowcase", "emotionalDesc", language),
      color: "bg-rose-500/10 text-rose-500 border-rose-500/20",
      colorBg: "bg-rose-500",
      slides: [
        "Eu tinha tudo para dar certo. Mas não deu.",
        "Não foi falta de esforço. Foi falta de direção.",
        "O dia que entendi isso mudou tudo.",
        "Porque sucesso não é sobre mais horas...",
        "É sobre as horas certas.",
        "@seuperfil",
      ],
    },
    {
      id: "professional",
      name: t("toneShowcase", "professional", language),
      icon: Briefcase,
      description: t("toneShowcase", "professionalDesc", language),
      color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      colorBg: "bg-blue-500",
      slides: [
        "87% dos profissionais cometem este erro.",
        "Produtividade não é sobre fazer mais.",
        "É sobre eliminar o desnecessário.",
        "Método em 3 passos: Priorize → Execute → Revise",
        "Implemente hoje e veja resultados em 7 dias.",
        "@seuperfil | Consultor de Produtividade",
      ],
    },
    {
      id: "provocative",
      name: t("toneShowcase", "provocative", language),
      icon: Zap,
      description: t("toneShowcase", "provocativeDesc", language),
      color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      colorBg: "bg-amber-500",
      slides: [
        "Você não está ocupado. Você está fugindo.",
        "O conforto é a prisão mais bonita que existe.",
        "Enquanto você 'pensa', alguém está fazendo.",
        "A pergunta não é 'posso?' É 'quero pagar o preço?'",
        "Desconforto é o preço do crescimento.",
        "@seuperfil",
      ],
    },
  ];

  const [activeTone, setActiveTone] = useState(tones[0]);
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % 6);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + 6) % 6);
  };

  const getToneTitle = (id: string) => {
    if (id === "emotional") return t("toneShowcase", "emotionalTitle", language);
    if (id === "professional") return t("toneShowcase", "professionalTitle", language);
    if (id === "provocative") return t("toneShowcase", "provocativeTitle", language);
    return "";
  };

  const getToneLongDesc = (id: string) => {
    if (id === "emotional") return t("toneShowcase", "emotionalLong", language);
    if (id === "professional") return t("toneShowcase", "professionalLong", language);
    if (id === "provocative") return t("toneShowcase", "provocativeLong", language);
    return "";
  };

  const getToneTags = (id: string) => {
    if (id === "emotional") {
      return [
        t("toneShowcase", "storytelling", language),
        t("toneShowcase", "mentalTriggers", language),
        t("toneShowcase", "connection", language),
      ];
    }
    if (id === "professional") {
      return [
        t("toneShowcase", "data", language),
        t("toneShowcase", "authority", language),
        t("toneShowcase", "educational", language),
      ];
    }
    if (id === "provocative") {
      return [
        t("toneShowcase", "controversial", language),
        t("toneShowcase", "direct", language),
        t("toneShowcase", "impactful", language),
      ];
    }
    return [];
  };

  return (
    <section className="py-24 md:py-32">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-sm font-semibold text-accent mb-4 tracking-wide uppercase">
            {t("toneShowcase", "sectionTitle", language)}
          </span>
          <h2 className="text-display-sm md:text-display-md mb-4">
            {t("toneShowcase", "title", language)}
          </h2>
          <p className="text-body-lg text-muted-foreground">
            {t("toneShowcase", "subtitle", language)}
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Tone Selector */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {tones.map((tone) => (
              <button
                key={tone.id}
                onClick={() => {
                  setActiveTone(tone);
                  setCurrentSlide(0);
                }}
                className={`flex items-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all duration-300 ${
                  activeTone.id === tone.id
                    ? tone.color + " border-current shadow-lg"
                    : "bg-card border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl ${tone.id === activeTone.id ? tone.colorBg : "bg-secondary"} flex items-center justify-center transition-colors`}>
                  <tone.icon className={`w-5 h-5 ${tone.id === activeTone.id ? "text-white" : "text-muted-foreground"}`} />
                </div>
                <div className="text-left">
                  <p className="font-semibold">{tone.name}</p>
                  <p className="text-xs text-muted-foreground hidden sm:block">{tone.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Carousel Preview */}
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Phone Mockup */}
            <div className="flex-1 flex justify-center">
              <div className="relative w-72">
                {/* Phone Frame */}
                <div className="relative bg-gradient-to-b from-card to-secondary rounded-[2.5rem] p-2 shadow-2xl border border-border">
                  <div className="bg-background rounded-[2rem] overflow-hidden">
                    {/* Notch */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-primary rounded-full z-10" />
                    
                    {/* Carousel Slide */}
                    <div className="aspect-[9/16] relative bg-primary flex items-center justify-center p-8">
                      <div className="text-center text-primary-foreground">
                        <p className="text-xs text-primary-foreground/60 mb-6">
                          {currentSlide + 1}/6
                        </p>
                        <p className="text-xl font-bold leading-relaxed">
                          {activeTone.slides[currentSlide]}
                        </p>
                      </div>
                      
                      {/* Navigation Arrows */}
                      <button
                        onClick={prevSlide}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-primary-foreground" />
                      </button>
                      <button
                        onClick={nextSlide}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 text-primary-foreground" />
                      </button>

                      {/* Slide Indicators */}
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {[...Array(6)].map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentSlide(i)}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${
                              i === currentSlide
                                ? "bg-primary-foreground w-4"
                                : "bg-primary-foreground/30 hover:bg-primary-foreground/50"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tone Description */}
            <div className="flex-1 space-y-6">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${activeTone.color}`}>
                <activeTone.icon className="w-4 h-4" />
                <span className="font-medium">{activeTone.name}</span>
              </div>
              
              <h3 className="text-display-sm">
                {getToneTitle(activeTone.id)}
              </h3>

              <p className="text-body-lg text-muted-foreground">
                {getToneLongDesc(activeTone.id)}
              </p>

              <div className="flex flex-wrap gap-2">
                {getToneTags(activeTone.id).map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-secondary rounded-full text-sm">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ToneShowcase;
