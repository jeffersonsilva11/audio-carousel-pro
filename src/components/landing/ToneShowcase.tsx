import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Heart, Briefcase, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const tones = [
  {
    id: "emotional",
    name: "Emocional",
    icon: Heart,
    description: "Storytelling com gatilhos mentais para conexão profunda",
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
    name: "Profissional",
    icon: Briefcase,
    description: "Educacional e corporativo com dados e autoridade",
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
    name: "Provocador",
    icon: Zap,
    description: "Direto, controverso e desconfortável",
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

const ToneShowcase = () => {
  const [activeTone, setActiveTone] = useState(tones[0]);
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % 6);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + 6) % 6);
  };

  return (
    <section className="py-24 md:py-32">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-sm font-semibold text-accent mb-4 tracking-wide uppercase">
            Escolha seu tom
          </span>
          <h2 className="text-display-sm md:text-display-md mb-4">
            3 estilos de roteirização
          </h2>
          <p className="text-body-lg text-muted-foreground">
            Cada tom usa frameworks diferentes de copywriting para maximizar o engajamento
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
                <div className={`w-10 h-10 rounded-xl ${tone.id === activeTone.id ? tone.colorBg : 'bg-secondary'} flex items-center justify-center transition-colors`}>
                  <tone.icon className={`w-5 h-5 ${tone.id === activeTone.id ? 'text-white' : 'text-muted-foreground'}`} />
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
                {activeTone.id === "emotional" && "Conecte emocionalmente"}
                {activeTone.id === "professional" && "Eduque com autoridade"}
                {activeTone.id === "provocative" && "Provoque reflexão"}
              </h3>

              <p className="text-body-lg text-muted-foreground">
                {activeTone.id === "emotional" && "Usa a Pirâmide de Freytag e gatilhos de aversão à perda. Perfeito para histórias pessoais, cases de superação e conteúdo inspiracional que gera conexão."}
                {activeTone.id === "professional" && "Aplica o Círculo Dourado (Why→How→What) com viés de autoridade. Ideal para dicas práticas, tutoriais e conteúdo educacional B2B."}
                {activeTone.id === "provocative" && "Framework 'O Quê, E Daí, E Agora' com quebra de padrões. Para criadores que querem chamar atenção e provocar discussões."}
              </p>

              <div className="flex flex-wrap gap-2">
                {activeTone.id === "emotional" && (
                  <>
                    <span className="px-3 py-1 bg-secondary rounded-full text-sm">Storytelling</span>
                    <span className="px-3 py-1 bg-secondary rounded-full text-sm">Gatilhos mentais</span>
                    <span className="px-3 py-1 bg-secondary rounded-full text-sm">Conexão</span>
                  </>
                )}
                {activeTone.id === "professional" && (
                  <>
                    <span className="px-3 py-1 bg-secondary rounded-full text-sm">Dados</span>
                    <span className="px-3 py-1 bg-secondary rounded-full text-sm">Autoridade</span>
                    <span className="px-3 py-1 bg-secondary rounded-full text-sm">Educacional</span>
                  </>
                )}
                {activeTone.id === "provocative" && (
                  <>
                    <span className="px-3 py-1 bg-secondary rounded-full text-sm">Controverso</span>
                    <span className="px-3 py-1 bg-secondary rounded-full text-sm">Direto</span>
                    <span className="px-3 py-1 bg-secondary rounded-full text-sm">Impactante</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ToneShowcase;
