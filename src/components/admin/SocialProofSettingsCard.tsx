import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Sparkles, Clock, Layout } from "lucide-react";

interface SocialProofSettings {
  enabled: boolean;
  intervalSeconds: number;
  position: "left" | "right";
}

const SocialProofSettingsCard = () => {
  const [settings, setSettings] = useState<SocialProofSettings>({
    enabled: true,
    intervalSeconds: 8,
    position: "left",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", [
          "social_proof_enabled",
          "social_proof_interval_seconds",
          "social_proof_position",
        ]);

      if (error) throw error;

      if (data) {
        const enabled = data.find((d) => d.key === "social_proof_enabled")?.value;
        const interval = data.find((d) => d.key === "social_proof_interval_seconds")?.value;
        const position = data.find((d) => d.key === "social_proof_position")?.value;

        setSettings({
          enabled: enabled !== "false",
          intervalSeconds: parseInt(interval || "8", 10),
          position: (position === "right" ? "right" : "left") as "left" | "right",
        });
      }
    } catch (error) {
      console.error("Error fetching social proof settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: "social_proof_enabled", value: String(settings.enabled), description: "Ativar Social Proof Toast" },
        { key: "social_proof_interval_seconds", value: String(settings.intervalSeconds), description: "Intervalo entre notificações (segundos)" },
        { key: "social_proof_position", value: settings.position, description: "Posição do toast (left/right)" },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("app_settings")
          .upsert(update, { onConflict: "key" });

        if (error) throw error;
      }

      toast({
        title: "Configurações salvas",
        description: "As configurações do Social Proof foram atualizadas.",
      });
    } catch (error) {
      console.error("Error saving social proof settings:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          Social Proof Toast
        </CardTitle>
        <CardDescription>
          Configure as notificações de "carrossel criado por fulano" na landing page
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Ativar Social Proof</Label>
            <p className="text-xs text-muted-foreground">
              Mostra notificações de atividade recente na landing page
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) =>
              setSettings((prev) => ({ ...prev, enabled: checked }))
            }
          />
        </div>

        {/* Position */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Layout className="w-4 h-4" />
            Posição do Toast
          </Label>
          <Select
            value={settings.position}
            onValueChange={(value: "left" | "right") =>
              setSettings((prev) => ({ ...prev, position: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Esquerda (padrão)</SelectItem>
              <SelectItem value="right">Direita</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Onde o toast aparece na tela
          </p>
        </div>

        {/* Interval */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Intervalo entre notificações
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={5}
              max={60}
              value={settings.intervalSeconds}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  intervalSeconds: Math.max(5, Math.min(60, parseInt(e.target.value) || 8)),
                }))
              }
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">segundos</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Tempo entre cada notificação (5-60 segundos)
          </p>
        </div>

        {/* Preview */}
        <div className="p-4 bg-muted/50 rounded-lg border">
          <p className="text-sm font-medium mb-2">Preview</p>
          <div className={`flex ${settings.position === "right" ? "justify-end" : "justify-start"}`}>
            <div className="bg-card border border-border rounded-xl shadow-lg p-3 flex items-start gap-2 max-w-xs">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="text-xs font-medium">João S. acabou de criar um carrossel</p>
                <p className="text-xs text-muted-foreground">há 2 min</p>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar Configurações
        </Button>
      </CardContent>
    </Card>
  );
};

export default SocialProofSettingsCard;
