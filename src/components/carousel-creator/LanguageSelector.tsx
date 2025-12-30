import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { LANGUAGES, SupportedLanguage } from "@/hooks/useLanguage";

interface LanguageSelectorProps {
  value: SupportedLanguage;
  onChange: (value: SupportedLanguage) => void;
  className?: string;
}

const LanguageSelector = ({ value, onChange, className }: LanguageSelectorProps) => {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <Globe className="w-4 h-4 text-muted-foreground" />
        <span>Idioma do Carrossel</span>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            type="button"
            onClick={() => onChange(lang.code)}
            className={cn(
              "flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all",
              "hover:border-accent/50 hover:bg-accent/5",
              value === lang.code
                ? "border-accent bg-accent/10 ring-1 ring-accent/30"
                : "border-border bg-card"
            )}
          >
            <span className="text-2xl">{lang.flag}</span>
            <span className="text-xs font-medium">{lang.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSelector;
