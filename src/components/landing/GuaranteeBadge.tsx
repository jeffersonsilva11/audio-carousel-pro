import { Shield, Check } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { motion } from "framer-motion";

interface GuaranteeBadgeProps {
  variant?: "inline" | "card";
  showDetails?: boolean;
}

const GuaranteeBadge = ({ variant = "inline", showDetails = false }: GuaranteeBadgeProps) => {
  const { language } = useLanguage();

  const guarantees = [
    {
      pt: "Cancele quando quiser",
      en: "Cancel anytime",
      es: "Cancela cuando quieras",
    },
    {
      pt: "7 dias de garantia",
      en: "7-day guarantee",
      es: "7 días de garantía",
    },
    {
      pt: "Pagamento seguro",
      en: "Secure payment",
      es: "Pago seguro",
    },
  ];

  if (variant === "card") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h4 className="font-semibold text-emerald-700 dark:text-emerald-400">
              {language === "pt-BR"
                ? "Garantia de Satisfação"
                : language === "es"
                ? "Garantía de Satisfacción"
                : "Satisfaction Guarantee"}
            </h4>
            <p className="text-xs text-muted-foreground">
              {language === "pt-BR"
                ? "Sua compra 100% protegida"
                : language === "es"
                ? "Tu compra 100% protegida"
                : "Your purchase 100% protected"}
            </p>
          </div>
        </div>

        {showDetails && (
          <div className="space-y-2">
            {guarantees.map((guarantee, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-muted-foreground">
                  {language === "pt-BR"
                    ? guarantee.pt
                    : language === "es"
                    ? guarantee.es
                    : guarantee.en}
                </span>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-emerald-500/10">
          {language === "pt-BR"
            ? "Se não ficar satisfeito nos primeiros 7 dias, devolvemos seu dinheiro. Sem perguntas."
            : language === "es"
            ? "Si no estás satisfecho en los primeros 7 días, devolvemos tu dinero. Sin preguntas."
            : "If you're not satisfied within the first 7 days, we refund your money. No questions asked."}
        </p>
      </motion.div>
    );
  }

  // Inline variant
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      {guarantees.map((guarantee, index) => (
        <div key={index} className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Check className="w-4 h-4 text-emerald-500" />
          <span>
            {language === "pt-BR" ? guarantee.pt : language === "es" ? guarantee.es : guarantee.en}
          </span>
        </div>
      ))}
    </div>
  );
};

export default GuaranteeBadge;
