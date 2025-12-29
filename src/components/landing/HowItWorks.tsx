import { Mic, Sparkles, Download, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Mic,
    title: "Grave ou envie",
    description: "Grave um áudio de até 60 segundos ou faça upload de um arquivo. Fale naturalmente sobre o que quiser compartilhar.",
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    icon: Sparkles,
    title: "IA transforma",
    description: "Nossa IA transcreve, aplica frameworks de storytelling e gera um roteiro otimizado com gatilhos mentais.",
    color: "bg-violet-500/10 text-violet-500",
  },
  {
    icon: Download,
    title: "Baixe e poste",
    description: "Receba 6 slides prontos em alta qualidade. Baixe individualmente ou em ZIP e poste direto no Instagram.",
    color: "bg-emerald-500/10 text-emerald-500",
  },
];

const HowItWorks = () => {
  return (
    <section id="features" className="py-24 md:py-32 bg-secondary/30">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-sm font-semibold text-accent mb-4 tracking-wide uppercase">
            Como funciona
          </span>
          <h2 className="text-display-sm md:text-display-md mb-4">
            De áudio a carrossel em 3 passos
          </h2>
          <p className="text-body-lg text-muted-foreground">
            Processo 100% automatizado. Você fala, a IA faz o resto.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div key={step.title} className="relative">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px">
                  <div className="h-full bg-gradient-to-r from-border to-transparent" />
                  <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                </div>
              )}

              <div className="relative bg-card rounded-2xl p-8 border border-border shadow-card hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
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
            </div>
          ))}
        </div>

        {/* Visual Demo */}
        <div className="mt-20 max-w-4xl mx-auto">
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
                      <p className="font-semibold">Seu áudio</p>
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
                      className="aspect-square bg-primary rounded-xl flex items-center justify-center relative overflow-hidden group"
                    >
                      <span className="text-[10px] text-primary-foreground/60 absolute top-1 right-1">
                        {i + 1}/6
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
