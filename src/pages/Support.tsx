import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mic2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BRAND } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";

interface SupportSettings {
  title: string;
  description: string;
  formScript: string;
}

const defaultSettings: SupportSettings = {
  title: "Suporte",
  description: "Precisa de ajuda? Preencha o formulario abaixo e nossa equipe entrara em contato o mais breve possivel.",
  formScript: "",
};

const Support = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SupportSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("key, value")
          .in("key", ["support_title", "support_description", "support_form_script"]);

        if (error) throw error;

        if (data) {
          const settingsMap: Record<string, string> = {};
          data.forEach((item) => {
            settingsMap[item.key] = item.value;
          });

          setSettings({
            title: settingsMap.support_title || defaultSettings.title,
            description: settingsMap.support_description || defaultSettings.description,
            formScript: settingsMap.support_form_script || defaultSettings.formScript,
          });
        }
      } catch (error) {
        console.error("Error fetching support settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  useEffect(() => {
    if (!loading && settings.formScript) {
      // Execute scripts from the form HTML
      const container = document.getElementById("zoho-form-container");
      if (container) {
        container.innerHTML = settings.formScript;

        // Find and execute all script tags
        const scripts = container.querySelectorAll("script");
        scripts.forEach((oldScript) => {
          const newScript = document.createElement("script");
          Array.from(oldScript.attributes).forEach((attr) => {
            newScript.setAttribute(attr.name, attr.value);
          });
          newScript.textContent = oldScript.textContent;
          oldScript.parentNode?.replaceChild(newScript, oldScript);
        });
      }
    }
  }, [loading, settings.formScript]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
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

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold mb-4">{settings.title}</h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              {settings.description}
            </p>

            {settings.formScript ? (
              <div
                id="zoho-form-container"
                className="bg-card rounded-lg p-6 border border-border"
              />
            ) : (
              <div className="bg-card rounded-lg p-8 border border-border text-center">
                <p className="text-muted-foreground">
                  O formulario de suporte ainda nao foi configurado.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Entre em contato pelo email: suporte@audisell.com
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Support;
