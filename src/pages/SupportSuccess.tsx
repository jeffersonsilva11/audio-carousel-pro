import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mic2, CheckCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BRAND } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";

interface SuccessSettings {
  title: string;
  message: string;
}

const defaultSettings: SuccessSettings = {
  title: "Chamado Enviado com Sucesso!",
  message: "Obrigado por entrar em contato. Nossa equipe recebeu sua mensagem e responderemos o mais breve possivel. Voce recebera uma resposta no email informado.",
};

const SupportSuccess = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SuccessSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("key, value")
          .in("key", ["support_success_title", "support_success_message"]);

        if (error) throw error;

        if (data) {
          const settingsMap: Record<string, string> = {};
          data.forEach((item) => {
            settingsMap[item.key] = item.value;
          });

          setSettings({
            title: settingsMap.support_success_title || defaultSettings.title,
            message: settingsMap.support_success_message || defaultSettings.message,
          });
        }
      } catch (error) {
        console.error("Error fetching success settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} aria-label="Voltar ao painel">
                <ArrowLeft className="w-5 h-5" aria-hidden="true" />
              </Button>
              <a href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                  <Mic2 className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold tracking-tight">{BRAND.name}</span>
              </a>
            </div>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="bg-card rounded-lg p-8 border border-border text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>

            <h1 className="text-2xl font-bold mb-4">{settings.title}</h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              {settings.message}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate("/dashboard")}>
                Voltar ao Dashboard
              </Button>
              <Button variant="outline" onClick={() => navigate("/support")}>
                Novo Chamado
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SupportSuccess;
