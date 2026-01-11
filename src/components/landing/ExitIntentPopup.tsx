import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ExitIntentSettings {
  enabled: boolean;
  title_pt: string;
  title_en: string;
  title_es: string;
  subtitle_pt: string;
  subtitle_en: string;
  subtitle_es: string;
  cta_pt: string;
  cta_en: string;
  cta_es: string;
  offer_pt: string;
  offer_en: string;
  offer_es: string;
  delay_seconds: number;
  show_once_per_session: boolean;
}

const DEFAULT_SETTINGS: ExitIntentSettings = {
  enabled: true,
  title_pt: "Espere! Não vá embora ainda...",
  title_en: "Wait! Don't leave yet...",
  title_es: "¡Espera! No te vayas todavía...",
  subtitle_pt: "Que tal criar seu primeiro carrossel grátis antes de sair?",
  subtitle_en: "How about creating your first free carousel before leaving?",
  subtitle_es: "¿Qué tal crear tu primer carrusel gratis antes de irte?",
  cta_pt: "Quero meu carrossel grátis",
  cta_en: "I want my free carousel",
  cta_es: "Quiero mi carrusel gratis",
  offer_pt: "Cadastre-se agora e ganhe 3 carrosséis extras no plano gratuito!",
  offer_en: "Sign up now and get 3 extra carousels on the free plan!",
  offer_es: "¡Regístrate ahora y obtén 3 carruseles extra en el plan gratuito!",
  delay_seconds: 0,
  show_once_per_session: true,
};

const ExitIntentPopup = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [isVisible, setIsVisible] = useState(false);
  const [settings, setSettings] = useState<ExitIntentSettings>(DEFAULT_SETTINGS);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  // Fetch settings from database
  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "exit_intent_settings")
        .maybeSingle();

      if (data?.value) {
        try {
          const parsed = JSON.parse(data.value);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } catch {
          setSettings(DEFAULT_SETTINGS);
        }
      }
    };

    fetchSettings();
  }, []);

  // Check session storage for "already shown" flag
  useEffect(() => {
    if (settings.show_once_per_session) {
      const shown = sessionStorage.getItem("exit_intent_shown");
      if (shown === "true") {
        setHasShown(true);
      }
    }
  }, [settings.show_once_per_session]);

  // Exit intent detection
  const handleMouseLeave = useCallback(
    (e: MouseEvent) => {
      // Only trigger when mouse leaves from the top of the page
      if (e.clientY <= 0 && settings.enabled && !hasShown && !isVisible) {
        // Check if user is logged in - don't show to logged in users
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) {
            if (settings.delay_seconds > 0) {
              setTimeout(() => {
                setIsVisible(true);
                if (settings.show_once_per_session) {
                  sessionStorage.setItem("exit_intent_shown", "true");
                  setHasShown(true);
                }
              }, settings.delay_seconds * 1000);
            } else {
              setIsVisible(true);
              if (settings.show_once_per_session) {
                sessionStorage.setItem("exit_intent_shown", "true");
                setHasShown(true);
              }
            }
          }
        });
      }
    },
    [settings, hasShown, isVisible]
  );

  useEffect(() => {
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [handleMouseLeave]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      // Save lead to database
      const { error } = await supabase.from("leads").insert({
        email,
        source: "exit_intent",
        metadata: { language },
      });

      if (error && error.code !== "23505") {
        // 23505 is duplicate key error
        throw error;
      }

      toast({
        title: language === "pt-BR" ? "Sucesso!" : language === "es" ? "¡Éxito!" : "Success!",
        description:
          language === "pt-BR"
            ? "Você receberá um e-mail em breve."
            : language === "es"
            ? "Recibirás un correo pronto."
            : "You'll receive an email soon.",
      });

      setIsVisible(false);
      // Redirect to signup
      window.location.href = `/auth?mode=signup&email=${encodeURIComponent(email)}&source=exit_intent`;
    } catch (error) {
      console.error("Error saving lead:", error);
      toast({
        title: language === "pt-BR" ? "Erro" : language === "es" ? "Error" : "Error",
        description:
          language === "pt-BR"
            ? "Não foi possível processar. Tente novamente."
            : language === "es"
            ? "No se pudo procesar. Inténtalo de nuevo."
            : "Could not process. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleDirectSignup = () => {
    window.location.href = "/auth?mode=signup&source=exit_intent";
  };

  // Get localized content
  const title =
    language === "pt-BR" ? settings.title_pt : language === "es" ? settings.title_es : settings.title_en;
  const subtitle =
    language === "pt-BR" ? settings.subtitle_pt : language === "es" ? settings.subtitle_es : settings.subtitle_en;
  const cta = language === "pt-BR" ? settings.cta_pt : language === "es" ? settings.cta_es : settings.cta_en;
  const offer =
    language === "pt-BR" ? settings.offer_pt : language === "es" ? settings.offer_es : settings.offer_en;

  if (!settings.enabled) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="relative bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors z-10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Gradient header */}
              <div className="bg-gradient-to-r from-accent via-purple-500 to-pink-500 p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <Gift className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{title}</h2>
                  </div>
                </div>
                <p className="text-white/90">{subtitle}</p>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Offer highlight */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
                  <p className="text-sm text-amber-700 dark:text-amber-400 font-medium text-center">
                    🎁 {offer}
                  </p>
                </div>

                {/* Email form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    type="email"
                    placeholder={
                      language === "pt-BR"
                        ? "Seu melhor e-mail"
                        : language === "es"
                        ? "Tu mejor correo"
                        : "Your best email"
                    }
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12"
                    required
                  />

                  <Button type="submit" variant="hero" className="w-full group" disabled={loading}>
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        {cta}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </form>

                {/* Alternative */}
                <div className="mt-4 text-center">
                  <button
                    onClick={handleDirectSignup}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {language === "pt-BR"
                      ? "Ou cadastre-se diretamente →"
                      : language === "es"
                      ? "O regístrate directamente →"
                      : "Or sign up directly →"}
                  </button>
                </div>

                {/* Trust note */}
                <p className="text-xs text-muted-foreground text-center mt-4">
                  {language === "pt-BR"
                    ? "Sem spam. Cancele quando quiser."
                    : language === "es"
                    ? "Sin spam. Cancela cuando quieras."
                    : "No spam. Cancel anytime."}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ExitIntentPopup;
