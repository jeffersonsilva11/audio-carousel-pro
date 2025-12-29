import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-24 md:py-32 bg-primary text-primary-foreground relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 mb-8">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">
              Comece agora — teste grátis
            </span>
          </div>

          <h2 className="text-display-sm md:text-display-md mb-6">
            Pronto para transformar suas ideias em carrosséis?
          </h2>

          <p className="text-xl text-primary-foreground/70 mb-10 max-w-xl mx-auto">
            Grave um áudio. Deixe a IA fazer o resto. Poste em segundos.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="xl"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all group w-full sm:w-auto"
            >
              Criar meu carrossel grátis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>

          <p className="mt-6 text-sm text-primary-foreground/50">
            Sem cartão de crédito · 1 carrossel grátis · Cancele quando quiser
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTA;
