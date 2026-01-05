import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Headphones,
  Loader2,
  Save,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SupportSettings {
  support_title: string;
  support_description: string;
  support_form_script: string;
  support_success_title: string;
  support_success_message: string;
}

const defaultSettings: SupportSettings = {
  support_title: "Suporte",
  support_description: "Precisa de ajuda? Preencha o formulario abaixo e nossa equipe entrara em contato o mais breve possivel.",
  support_form_script: "",
  support_success_title: "Chamado Enviado com Sucesso!",
  support_success_message: "Obrigado por entrar em contato. Nossa equipe recebeu sua mensagem e responderemos o mais breve possivel. Voce recebera uma resposta no email informado.",
};

const SupportSettingsCard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SupportSettings>(defaultSettings);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", Object.keys(defaultSettings));

      if (error) throw error;

      if (data) {
        const settingsMap: Record<string, string> = {};
        data.forEach((item) => {
          settingsMap[item.key] = item.value;
        });

        setSettings({
          support_title: settingsMap.support_title || defaultSettings.support_title,
          support_description: settingsMap.support_description || defaultSettings.support_description,
          support_form_script: settingsMap.support_form_script || defaultSettings.support_form_script,
          support_success_title: settingsMap.support_success_title || defaultSettings.support_success_title,
          support_success_message: settingsMap.support_success_message || defaultSettings.support_success_message,
        });
      }
    } catch (error) {
      console.error("Error fetching support settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upsert each setting
      const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
        description: getSettingDescription(key),
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("app_settings")
          .upsert(update, { onConflict: "key" });

        if (error) throw error;
      }

      toast({
        title: "Configuracoes salvas",
        description: "As configuracoes de suporte foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error("Error saving support settings:", error);
      toast({
        title: "Erro ao salvar",
        description: "Nao foi possivel salvar as configuracoes. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      support_title: "Titulo da pagina de suporte",
      support_description: "Descricao exibida na pagina de suporte",
      support_form_script: "Script HTML do formulario Zoho Desk",
      support_success_title: "Titulo da pagina de sucesso apos envio",
      support_success_message: "Mensagem de sucesso apos envio do formulario",
    };
    return descriptions[key] || "";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-primary" />
            <CardTitle>Configuracoes de Suporte</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/support", "_blank")}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Visualizar
          </Button>
        </div>
        <CardDescription>
          Configure a pagina de suporte e o formulario de contato
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Page Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Pagina de Suporte</h3>

          <div className="space-y-2">
            <Label htmlFor="support_title">Titulo da Pagina</Label>
            <Input
              id="support_title"
              value={settings.support_title}
              onChange={(e) => setSettings({ ...settings, support_title: e.target.value })}
              placeholder="Suporte"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="support_description">Descricao</Label>
            <Textarea
              id="support_description"
              value={settings.support_description}
              onChange={(e) => setSettings({ ...settings, support_description: e.target.value })}
              placeholder="Texto explicativo exibido acima do formulario..."
              rows={3}
            />
          </div>
        </div>

        <Separator />

        {/* Form Script */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Formulario Zoho Desk</h3>
          <p className="text-xs text-muted-foreground">
            Cole o codigo HTML completo do formulario Web-to-Case do Zoho Desk.
            Altere a returnURL para: https://audisell.com/support/success
          </p>

          <div className="space-y-2">
            <Label htmlFor="support_form_script">Codigo HTML do Formulario</Label>
            <Textarea
              id="support_form_script"
              value={settings.support_form_script}
              onChange={(e) => setSettings({ ...settings, support_form_script: e.target.value })}
              placeholder="Cole aqui o codigo HTML do formulario Zoho Desk..."
              rows={10}
              className="font-mono text-xs"
            />
          </div>
        </div>

        <Separator />

        {/* Success Page Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Pagina de Sucesso</h3>
          <p className="text-xs text-muted-foreground">
            Configuracoes da pagina exibida apos o envio do formulario
          </p>

          <div className="space-y-2">
            <Label htmlFor="support_success_title">Titulo</Label>
            <Input
              id="support_success_title"
              value={settings.support_success_title}
              onChange={(e) => setSettings({ ...settings, support_success_title: e.target.value })}
              placeholder="Chamado Enviado com Sucesso!"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="support_success_message">Mensagem</Label>
            <Textarea
              id="support_success_message"
              value={settings.support_success_message}
              onChange={(e) => setSettings({ ...settings, support_success_message: e.target.value })}
              placeholder="Mensagem de confirmacao..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Configuracoes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SupportSettingsCard;
