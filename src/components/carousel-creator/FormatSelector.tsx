import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type FormatType = "POST_SQUARE" | "POST_PORTRAIT" | "STORY";

interface FormatSelectorProps {
  selectedFormat: FormatType;
  setSelectedFormat: (format: FormatType) => void;
}

const formats = [
  {
    id: "POST_SQUARE" as FormatType,
    name: "Post Quadrado",
    ratio: "1:1",
    dimensions: "1080 × 1080",
    aspectClass: "aspect-square",
    description: "Ideal para feed",
  },
  {
    id: "POST_PORTRAIT" as FormatType,
    name: "Post Retrato",
    ratio: "4:5",
    dimensions: "1080 × 1350",
    aspectClass: "aspect-[4/5]",
    description: "Mais espaço vertical",
  },
  {
    id: "STORY" as FormatType,
    name: "Stories",
    ratio: "9:16",
    dimensions: "1080 × 1920",
    aspectClass: "aspect-[9/16]",
    description: "Para stories/reels",
  },
];

const FormatSelector = ({ selectedFormat, setSelectedFormat }: FormatSelectorProps) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-1">Formato</h3>
        <p className="text-sm text-muted-foreground">
          Escolha o tamanho do seu carrossel
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {formats.map((format) => {
          const isSelected = selectedFormat === format.id;

          return (
            <Card
              key={format.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                isSelected 
                  ? "border-accent ring-2 ring-accent/20" 
                  : "hover:border-muted-foreground/30"
              )}
              onClick={() => setSelectedFormat(format.id)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  {/* Preview */}
                  <div className="w-full max-w-[60px] mb-3">
                    <div 
                      className={cn(
                        "w-full border-2 rounded-sm",
                        format.aspectClass,
                        isSelected 
                          ? "border-accent bg-accent/10" 
                          : "border-muted-foreground/30 bg-muted/30"
                      )}
                    />
                  </div>

                  {/* Label */}
                  <p className="font-medium text-sm">{format.name}</p>
                  <p className="text-xs text-muted-foreground">{format.ratio}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format.dimensions}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default FormatSelector;
