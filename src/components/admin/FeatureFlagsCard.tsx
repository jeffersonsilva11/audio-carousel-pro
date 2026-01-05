import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Flag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FeatureFlagsCard() {
  const { allFlags, loading, toggleFlag } = useFeatureFlags();
  const { language } = useLanguage();
  const { toast } = useToast();

  const handleToggle = async (key: string, currentValue: boolean) => {
    const success = await toggleFlag(key, !currentValue);
    
    if (success) {
      toast({
        title: language === "pt-BR" ? "Feature atualizada" : language === "es" ? "Feature actualizada" : "Feature updated",
        description: language === "pt-BR" 
          ? `${key} agora está ${!currentValue ? "ativada" : "desativada"}`
          : language === "es"
          ? `${key} ahora está ${!currentValue ? "activada" : "desactivada"}`
          : `${key} is now ${!currentValue ? "enabled" : "disabled"}`,
      });
    } else {
      toast({
        title: language === "pt-BR" ? "Erro" : "Error",
        description: language === "pt-BR" 
          ? "Não foi possível atualizar a feature"
          : language === "es"
          ? "No se pudo actualizar la feature"
          : "Could not update feature",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="w-5 h-5" />
          {language === "pt-BR" ? "Feature Flags" : language === "es" ? "Feature Flags" : "Feature Flags"}
        </CardTitle>
        <CardDescription>
          {language === "pt-BR" 
            ? "Ative ou desative funcionalidades da plataforma" 
            : language === "es" 
            ? "Activa o desactiva funcionalidades de la plataforma" 
            : "Enable or disable platform features"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {allFlags
            .filter((flag) => flag.key !== "image_generation") // Hide deprecated flag
            .map((flag) => (
            <div
              key={flag.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="space-y-0.5">
                <Label htmlFor={flag.key} className="font-medium cursor-pointer">
                  {flag.name}
                </Label>
                {flag.description && (
                  <p className="text-sm text-muted-foreground">{flag.description}</p>
                )}
              </div>
              <Switch
                id={flag.key}
                checked={flag.enabled}
                onCheckedChange={() => handleToggle(flag.key, flag.enabled)}
              />
            </div>
          ))}

          {allFlags.filter((flag) => flag.key !== "image_generation").length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              {language === "pt-BR" 
                ? "Nenhuma feature flag configurada" 
                : language === "es" 
                ? "No hay feature flags configuradas" 
                : "No feature flags configured"}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
