import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { BRAND } from "@/lib/constants";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-hero-pattern">
      {/* Subtle gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/8 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container mx-auto relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-8 animate-slide-up">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">
              Powered by AI — 100% automatizado
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-display-md md:text-display-lg lg:text-display-xl mb-6 animate-slide-up-delay-1">
            Transforme sua{" "}
            <span className="relative inline-block">
              <span className="text-gradient">voz</span>
              <svg
                className="absolute -bottom-2 left-0 w-full"
                viewBox="0 0 200 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 8C50 2 150 2 198 8"
                  stroke="url(#underline-gradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="underline-gradient" x1="0" y1="0" x2="200" y2="0">
                    <stop stopColor="hsl(217, 91%, 60%)" />
                    <stop offset="1" stopColor="hsl(230, 91%, 65%)" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
            {" "}em carrosséis profissionais
          </h1>

          {/* Subheadline */}
          <p className="text-body-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up-delay-2">
            Grave um áudio de até 60 segundos. Nossa IA transcreve, roteiriza e gera 
            carrosséis prontos para o Instagram em segundos.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up-delay-3">
            <Button variant="hero" size="xl" className="group w-full sm:w-auto">
              Criar meu primeiro carrossel
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="hero-outline" size="xl" className="group w-full sm:w-auto">
              <Play className="w-5 h-5" />
              Ver como funciona
            </Button>
          </div>

          {/* Preview Mockup */}
          <div className="relative max-w-3xl mx-auto animate-scale-in">
            {/* Phone Frame */}
            <div className="relative bg-gradient-to-b from-card to-secondary rounded-3xl p-2 shadow-2xl border border-border">
              <div className="bg-background rounded-2xl overflow-hidden">
                {/* Carousel Preview */}
                <div className="aspect-square relative bg-primary flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center justify-center p-8">
                    <div className="text-center text-primary-foreground">
                      <p className="text-xs text-primary-foreground/60 mb-4">1/6</p>
                      <p className="text-2xl md:text-3xl font-bold leading-tight">
                        "A maioria das pessoas não falha porque tenta demais.
                      </p>
                      <p className="text-2xl md:text-3xl font-bold leading-tight mt-2">
                        Falha porque desiste cedo demais."
                      </p>
                    </div>
                  </div>
                  {/* Slide indicators */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${
                          i === 0 ? "bg-primary-foreground" : "bg-primary-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -left-8 top-1/4 glass-card rounded-2xl p-4 shadow-xl animate-float hidden lg:block">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-sm">6 slides gerados</p>
                  <p className="text-xs text-muted-foreground">em 12 segundos</p>
                </div>
              </div>
            </div>

            <div className="absolute -right-8 top-1/2 glass-card rounded-2xl p-4 shadow-xl animate-float hidden lg:block" style={{ animationDelay: '0.5s' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Tom Profissional</p>
                  <p className="text-xs text-muted-foreground">IA aplicada</p>
                </div>
              </div>
            </div>
          </div>

          {/* Social Proof */}
          <div className="mt-16 flex flex-col items-center gap-4">
            <div className="flex -space-x-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-muted border-2 border-background"
                  style={{ 
                    backgroundImage: `linear-gradient(135deg, hsl(${200 + i * 20}, 50%, 50%), hsl(${220 + i * 20}, 50%, 40%))`
                  }}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">2.500+</span> criadores já usam o {BRAND.name}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
