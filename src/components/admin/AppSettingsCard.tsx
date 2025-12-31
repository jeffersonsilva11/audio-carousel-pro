import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Video, ExternalLink } from "lucide-react";

interface AppSetting {
  id: string;
  key: string;
  value: string | null;
  description: string | null;
}

const AppSettingsCard = () => {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [demoVideoUrl, setDemoVideoUrl] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .order('key');

      if (error) throw error;
      
      setSettings(data || []);
      
      // Set the demo video URL from settings
      const demoVideo = data?.find(s => s.key === 'demo_video_url');
      if (demoVideo?.value) {
        setDemoVideoUrl(demoVideo.value);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'demo_video_url',
          value: demoVideoUrl,
          description: 'URL do vídeo de demonstração (embed do YouTube)'
        }, {
          onConflict: 'key'
        });

      if (error) throw error;

      toast({
        title: "Configurações salvas",
        description: "A URL do vídeo foi atualizada com sucesso.",
      });
      
      fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Convert YouTube URL to embed format
  const getEmbedUrl = (url: string) => {
    // Handle different YouTube URL formats
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    } else if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    } else if (url.includes('youtube.com/embed/')) {
      return url;
    }
    return url;
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
          <Video className="w-5 h-5 text-accent" />
          Configurações do App
        </CardTitle>
        <CardDescription>
          Configure URLs e parâmetros globais da aplicação
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Demo Video URL */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="demoVideoUrl">URL do Vídeo de Demonstração</Label>
            <div className="flex gap-2">
              <Input
                id="demoVideoUrl"
                placeholder="https://www.youtube.com/watch?v=..."
                value={demoVideoUrl}
                onChange={(e) => setDemoVideoUrl(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span className="ml-2 hidden sm:inline">Salvar</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Cole o link do YouTube. Formatos aceitos: youtube.com/watch?v=..., youtu.be/..., ou URL de embed
            </p>
          </div>

          {/* Preview */}
          {demoVideoUrl && (
            <div className="space-y-2">
              <Label>Preview do Vídeo</Label>
              <div className="aspect-video rounded-lg overflow-hidden bg-muted border">
                <iframe
                  src={getEmbedUrl(demoVideoUrl)}
                  title="Demo Video Preview"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <a 
                href={demoVideoUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-accent hover:underline inline-flex items-center gap-1"
              >
                Abrir no YouTube <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Other Settings */}
        {settings.filter(s => s.key !== 'demo_video_url').length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-3">Outras Configurações</h4>
            <div className="space-y-2">
              {settings.filter(s => s.key !== 'demo_video_url').map((setting) => (
                <div key={setting.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-mono text-sm">{setting.key}</p>
                    <p className="text-xs text-muted-foreground">{setting.description}</p>
                  </div>
                  <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {setting.value || '-'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AppSettingsCard;
