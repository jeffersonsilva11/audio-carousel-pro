import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useLanguage";
import { Instagram, Music, Linkedin } from "lucide-react";

export type PlatformFormat = {
  platform: 'instagram' | 'tiktok' | 'linkedin';
  format: 'feed' | 'story' | 'reels' | 'post';
  width: number;
  height: number;
  aspectRatio: string;
};

export const PLATFORM_FORMATS: PlatformFormat[] = [
  // Instagram
  { platform: 'instagram', format: 'feed', width: 1080, height: 1080, aspectRatio: '1:1' },
  { platform: 'instagram', format: 'post', width: 1080, height: 1350, aspectRatio: '4:5' },
  { platform: 'instagram', format: 'story', width: 1080, height: 1920, aspectRatio: '9:16' },
  { platform: 'instagram', format: 'reels', width: 1080, height: 1920, aspectRatio: '9:16' },
  // TikTok
  { platform: 'tiktok', format: 'post', width: 1080, height: 1920, aspectRatio: '9:16' },
  // LinkedIn
  { platform: 'linkedin', format: 'feed', width: 1200, height: 1200, aspectRatio: '1:1' },
  { platform: 'linkedin', format: 'post', width: 1200, height: 628, aspectRatio: '1.91:1' },
];

interface ExportFormatSelectorProps {
  selectedFormat: PlatformFormat | null;
  onSelectFormat: (format: PlatformFormat) => void;
}

const ExportFormatSelector = ({ selectedFormat, onSelectFormat }: ExportFormatSelectorProps) => {
  const { t } = useTranslation();

  const platforms = [
    { 
      id: 'instagram', 
      name: 'Instagram', 
      icon: Instagram, 
      color: 'from-pink-500 to-purple-600',
      formats: PLATFORM_FORMATS.filter(f => f.platform === 'instagram')
    },
    { 
      id: 'tiktok', 
      name: 'TikTok', 
      icon: Music, 
      color: 'from-black to-gray-700',
      formats: PLATFORM_FORMATS.filter(f => f.platform === 'tiktok')
    },
    { 
      id: 'linkedin', 
      name: 'LinkedIn', 
      icon: Linkedin, 
      color: 'from-blue-600 to-blue-700',
      formats: PLATFORM_FORMATS.filter(f => f.platform === 'linkedin')
    },
  ];

  const getFormatLabel = (format: PlatformFormat) => {
    const labels: Record<string, Record<string, string>> = {
      'instagram-feed': { 'pt-BR': 'Feed Quadrado', en: 'Square Feed', es: 'Feed Cuadrado' },
      'instagram-post': { 'pt-BR': 'Post Vertical', en: 'Vertical Post', es: 'Post Vertical' },
      'instagram-story': { 'pt-BR': 'Stories', en: 'Stories', es: 'Stories' },
      'instagram-reels': { 'pt-BR': 'Reels', en: 'Reels', es: 'Reels' },
      'tiktok-post': { 'pt-BR': 'Vídeo/Slide', en: 'Video/Slide', es: 'Video/Slide' },
      'linkedin-feed': { 'pt-BR': 'Post Quadrado', en: 'Square Post', es: 'Post Cuadrado' },
      'linkedin-post': { 'pt-BR': 'Artigo/Link', en: 'Article/Link', es: 'Artículo/Enlace' },
    };
    const key = `${format.platform}-${format.format}`;
    const lang = t('common', 'loading') === 'Carregando...' ? 'pt-BR' : 
                 t('common', 'loading') === 'Loading...' ? 'en' : 'es';
    return labels[key]?.[lang] || format.format;
  };

  const getAspectClass = (ratio: string) => {
    switch (ratio) {
      case '1:1': return 'aspect-square';
      case '4:5': return 'aspect-[4/5]';
      case '9:16': return 'aspect-[9/16]';
      case '1.91:1': return 'aspect-[1.91/1]';
      default: return 'aspect-square';
    }
  };

  const isSelected = (format: PlatformFormat) => 
    selectedFormat?.platform === format.platform && 
    selectedFormat?.format === format.format;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">{t("exportFormat", "title")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("exportFormat", "subtitle")}
        </p>
      </div>

      <div className="space-y-6">
        {platforms.map((platform) => (
          <div key={platform.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br",
                platform.color
              )}>
                <platform.icon className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium">{platform.name}</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {platform.formats.map((format) => (
                <Card
                  key={`${format.platform}-${format.format}`}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    isSelected(format)
                      ? "border-accent ring-2 ring-accent/20"
                      : "hover:border-muted-foreground/30"
                  )}
                  onClick={() => onSelectFormat(format)}
                >
                  <CardContent className="p-3">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-full max-w-[40px] mb-2">
                        <div
                          className={cn(
                            "w-full border-2 rounded-sm",
                            getAspectClass(format.aspectRatio),
                            isSelected(format)
                              ? "border-accent bg-accent/10"
                              : "border-muted-foreground/30 bg-muted/30"
                          )}
                        />
                      </div>
                      <p className="font-medium text-xs">{getFormatLabel(format)}</p>
                      <p className="text-xs text-muted-foreground">{format.aspectRatio}</p>
                      <p className="text-xs text-muted-foreground">
                        {format.width}×{format.height}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExportFormatSelector;
