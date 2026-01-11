import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Globe, Share2, Plus, Trash2, Search, Link2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SocialLink {
  name: string;
  href: string;
  enabled: boolean;
}

interface SEOSettings {
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  og_image: string;
  twitter_handle: string;
  canonical_url: string;
  robots_txt: string;
  sitemap_enabled: boolean;
}

const DEFAULT_SOCIAL_LINKS: SocialLink[] = [
  { name: "Instagram", href: "", enabled: true },
  { name: "Twitter", href: "", enabled: false },
  { name: "LinkedIn", href: "", enabled: false },
  { name: "YouTube", href: "", enabled: false },
  { name: "TikTok", href: "", enabled: false },
  { name: "Facebook", href: "", enabled: false },
];

const DEFAULT_SEO_SETTINGS: SEOSettings = {
  meta_title: "Audisell - Transforme sua voz em carrosséis profissionais",
  meta_description: "Plataforma SaaS que transforma áudio em carrosséis profissionais para Instagram usando IA. Grave um áudio de até 30 segundos e nossa inteligência artificial transcreve, roteiriza e gera imagens prontas para publicar.",
  meta_keywords: "carrossel instagram, criador de conteúdo, IA, inteligência artificial, social media, marketing digital",
  og_image: "/og-image.png",
  twitter_handle: "@audisell",
  canonical_url: "",
  robots_txt: "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /auth\nDisallow: /dashboard\n\nSitemap: https://audisell.com/sitemap.xml",
  sitemap_enabled: true,
};

const SEOSettingsCard = () => {
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(DEFAULT_SOCIAL_LINKS);
  const [seoSettings, setSeoSettings] = useState<SEOSettings>(DEFAULT_SEO_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingSocial, setSavingSocial] = useState(false);
  const [savingSeo, setSavingSeo] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // Fetch social links
      const { data: socialData } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'social_links')
        .maybeSingle();

      if (socialData?.value) {
        try {
          const parsed = JSON.parse(socialData.value);
          setSocialLinks(parsed);
        } catch {
          setSocialLinks(DEFAULT_SOCIAL_LINKS);
        }
      }

      // Fetch SEO settings
      const { data: seoData } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'seo_settings')
        .maybeSingle();

      if (seoData?.value) {
        try {
          const parsed = JSON.parse(seoData.value);
          setSeoSettings({ ...DEFAULT_SEO_SETTINGS, ...parsed });
        } catch {
          setSeoSettings(DEFAULT_SEO_SETTINGS);
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSocial = async () => {
    setSavingSocial(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'social_links',
          value: JSON.stringify(socialLinks),
          description: 'Links das redes sociais exibidos no rodapé'
        }, { onConflict: 'key' });

      if (error) throw error;

      toast({
        title: "Redes sociais salvas",
        description: "Os links foram atualizados com sucesso.",
      });
    } catch (error) {
      console.error('Error saving social links:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar os links.",
        variant: "destructive",
      });
    } finally {
      setSavingSocial(false);
    }
  };

  const handleSaveSeo = async () => {
    setSavingSeo(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'seo_settings',
          value: JSON.stringify(seoSettings),
          description: 'Configurações de SEO da landing page'
        }, { onConflict: 'key' });

      if (error) throw error;

      toast({
        title: "Configurações de SEO salvas",
        description: "As meta tags foram atualizadas. Regenerando sitemap...",
      });

      // Generate sitemap
      if (seoSettings.sitemap_enabled) {
        await generateSitemap();
      }
    } catch (error) {
      console.error('Error saving SEO settings:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setSavingSeo(false);
    }
  };

  const generateSitemap = async () => {
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'sitemap_last_generated',
          value: new Date().toISOString(),
          description: 'Data da última geração do sitemap'
        }, { onConflict: 'key' });

      if (!error) {
        toast({
          title: "Sitemap gerado",
          description: "O sitemap.xml foi atualizado.",
        });
      }
    } catch (error) {
      console.error('Error generating sitemap:', error);
    }
  };

  const updateSocialLink = (index: number, field: keyof SocialLink, value: string | boolean) => {
    const updated = [...socialLinks];
    updated[index] = { ...updated[index], [field]: value };
    setSocialLinks(updated);
  };

  const addSocialLink = () => {
    setSocialLinks([...socialLinks, { name: "", href: "", enabled: true }]);
  };

  const removeSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
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
          <Globe className="w-5 h-5 text-accent" />
          SEO & Redes Sociais
        </CardTitle>
        <CardDescription>
          Configure meta tags, redes sociais e otimizações para mecanismos de busca
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="social" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="social" className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Redes Sociais
            </TabsTrigger>
            <TabsTrigger value="seo" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Meta Tags
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Avançado
            </TabsTrigger>
          </TabsList>

          {/* Social Links Tab */}
          <TabsContent value="social" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Links das Redes Sociais</Label>
                <Button variant="outline" size="sm" onClick={addSocialLink}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar
                </Button>
              </div>

              <div className="space-y-3">
                {socialLinks.map((link, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Switch
                      checked={link.enabled}
                      onCheckedChange={(checked) => updateSocialLink(index, "enabled", checked)}
                    />
                    <Input
                      placeholder="Nome (ex: Instagram)"
                      value={link.name}
                      onChange={(e) => updateSocialLink(index, "name", e.target.value)}
                      className="w-32"
                    />
                    <Input
                      placeholder="URL (ex: https://instagram.com/audisell)"
                      value={link.href}
                      onChange={(e) => updateSocialLink(index, "href", e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSocialLink(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                Apenas links habilitados e com URL preenchida serão exibidos no rodapé.
              </p>
            </div>

            <Button onClick={handleSaveSocial} disabled={savingSocial} className="w-full">
              {savingSocial ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Redes Sociais
            </Button>
          </TabsContent>

          {/* SEO Tab */}
          <TabsContent value="seo" className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meta_title">Meta Title</Label>
                <Input
                  id="meta_title"
                  value={seoSettings.meta_title}
                  onChange={(e) => setSeoSettings({ ...seoSettings, meta_title: e.target.value })}
                  placeholder="Título da página para SEO"
                />
                <p className="text-xs text-muted-foreground">
                  Recomendado: 50-60 caracteres. Atual: {seoSettings.meta_title.length}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta_description">Meta Description</Label>
                <Textarea
                  id="meta_description"
                  value={seoSettings.meta_description}
                  onChange={(e) => setSeoSettings({ ...seoSettings, meta_description: e.target.value })}
                  placeholder="Descrição da página para SEO"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Recomendado: 150-160 caracteres. Atual: {seoSettings.meta_description.length}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta_keywords">Palavras-chave</Label>
                <Input
                  id="meta_keywords"
                  value={seoSettings.meta_keywords}
                  onChange={(e) => setSeoSettings({ ...seoSettings, meta_keywords: e.target.value })}
                  placeholder="palavras, separadas, por, vírgula"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="og_image">Open Graph Image URL</Label>
                <Input
                  id="og_image"
                  value={seoSettings.og_image}
                  onChange={(e) => setSeoSettings({ ...seoSettings, og_image: e.target.value })}
                  placeholder="/og-image.png ou URL completa"
                />
                <p className="text-xs text-muted-foreground">
                  Imagem exibida quando compartilhado em redes sociais. Recomendado: 1200x630px
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitter_handle">Twitter Handle</Label>
                <Input
                  id="twitter_handle"
                  value={seoSettings.twitter_handle}
                  onChange={(e) => setSeoSettings({ ...seoSettings, twitter_handle: e.target.value })}
                  placeholder="@audisell"
                />
              </div>
            </div>

            <Button onClick={handleSaveSeo} disabled={savingSeo} className="w-full">
              {savingSeo ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Meta Tags
            </Button>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="canonical_url">Canonical URL</Label>
                <Input
                  id="canonical_url"
                  value={seoSettings.canonical_url}
                  onChange={(e) => setSeoSettings({ ...seoSettings, canonical_url: e.target.value })}
                  placeholder="https://audisell.com (deixe vazio para usar URL atual)"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label>Gerar Sitemap</Label>
                  <p className="text-xs text-muted-foreground">
                    Gera automaticamente o sitemap.xml para indexação
                  </p>
                </div>
                <Switch
                  checked={seoSettings.sitemap_enabled}
                  onCheckedChange={(checked) => setSeoSettings({ ...seoSettings, sitemap_enabled: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="robots_txt">robots.txt</Label>
                <Textarea
                  id="robots_txt"
                  value={seoSettings.robots_txt}
                  onChange={(e) => setSeoSettings({ ...seoSettings, robots_txt: e.target.value })}
                  placeholder="User-agent: *&#10;Allow: /"
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Configurações do arquivo robots.txt para controlar indexação
                </p>
              </div>

              <Button variant="outline" onClick={generateSitemap} className="w-full">
                <Globe className="w-4 h-4 mr-2" />
                Regenerar Sitemap Agora
              </Button>
            </div>

            <Button onClick={handleSaveSeo} disabled={savingSeo} className="w-full">
              {savingSeo ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Configurações Avançadas
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SEOSettingsCard;
