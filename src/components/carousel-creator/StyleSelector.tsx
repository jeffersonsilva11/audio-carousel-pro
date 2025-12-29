import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StyleType = "BLACK_WHITE" | "WHITE_BLACK";

interface StyleSelectorProps {
  selectedStyle: StyleType;
  setSelectedStyle: (style: StyleType) => void;
}

const styles = [
  {
    id: "BLACK_WHITE" as StyleType,
    name: "Escuro",
    description: "Fundo preto com texto branco",
    preview: {
      bg: "bg-[#0A0A0A]",
      text: "text-white",
    },
  },
  {
    id: "WHITE_BLACK" as StyleType,
    name: "Claro",
    description: "Fundo branco com texto preto",
    preview: {
      bg: "bg-white",
      text: "text-[#0A0A0A]",
    },
  },
];

const StyleSelector = ({ selectedStyle, setSelectedStyle }: StyleSelectorProps) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-1">Estilo Visual</h3>
        <p className="text-sm text-muted-foreground">
          Escolha as cores do seu carrossel
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {styles.map((style) => {
          const isSelected = selectedStyle === style.id;

          return (
            <Card
              key={style.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md overflow-hidden",
                isSelected 
                  ? "border-accent ring-2 ring-accent/20" 
                  : "hover:border-muted-foreground/30"
              )}
              onClick={() => setSelectedStyle(style.id)}
            >
              <CardContent className="p-0">
                {/* Preview */}
                <div className={cn(
                  "aspect-square flex items-center justify-center p-4",
                  style.preview.bg
                )}>
                  <div className={cn(
                    "text-center",
                    style.preview.text
                  )}>
                    <p className="text-xs font-medium mb-1">Slide de exemplo</p>
                    <p className="text-[10px] opacity-70">Seu texto aqui</p>
                  </div>
                </div>

                {/* Label */}
                <div className="p-3 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{style.name}</p>
                      <p className="text-xs text-muted-foreground">{style.description}</p>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                        <svg className="w-3 h-3 text-accent-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default StyleSelector;
