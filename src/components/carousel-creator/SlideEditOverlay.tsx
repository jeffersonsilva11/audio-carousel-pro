import { useState, useRef, useEffect } from "react";
import { Edit2, Check, X, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/useLanguage";

interface SlideEditOverlayProps {
  imageUrl?: string;
  text: string;
  slideNumber: number;
  slideType: string;
  isLocked: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onSaveEdit: (text: string) => void;
  onCancelEdit: () => void;
  showWatermark?: boolean;
}

const SlideEditOverlay = ({
  imageUrl,
  text,
  slideNumber,
  slideType,
  isLocked,
  isEditing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  showWatermark = true,
}: SlideEditOverlayProps) => {
  const { language } = useLanguage();
  const [editedText, setEditedText] = useState(text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset local state when props change
  useEffect(() => {
    setEditedText(text);
  }, [text]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    onSaveEdit(editedText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancelEdit();
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSave();
    }
  };

  const isCoverSlide = slideNumber === 1;

  return (
    <div className="relative w-full h-full">
      {/* Slide Image */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`Slide ${slideNumber}`}
          className="w-full h-full object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement?.querySelector('.slide-fallback')?.classList.remove('hidden');
          }}
        />
      ) : null}
      <div className={`w-full h-full flex items-center justify-center bg-muted text-muted-foreground slide-fallback ${imageUrl ? 'hidden absolute inset-0' : ''}`}>
        {language === "pt-BR" ? "Carregando..." : "Loading..."}
      </div>

      {/* Watermark Overlay - Only in edit mode and not locked */}
      {showWatermark && !isLocked && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Multiple diagonal watermarks */}
          <div className="absolute inset-0 flex flex-col items-center justify-center -rotate-45 scale-150">
            {[-200, -100, 0, 100, 200].map((offset) => (
              <div
                key={offset}
                className="whitespace-nowrap text-foreground/[0.07] text-lg font-bold tracking-wider select-none"
                style={{ transform: `translateY(${offset}px)` }}
              >
                Feito com Audissel • Feito com Audissel • Feito com Audissel • Feito com Audissel
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Click to Edit Overlay - Only when not editing and not locked */}
      {!isEditing && !isLocked && (
        <button
          type="button"
          onClick={onStartEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onStartEdit();
            }
          }}
          className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 focus:bg-black/30 transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-accent focus:ring-inset"
          aria-label={language === "pt-BR" ? "Editar slide" : language === "es" ? "Editar slide" : "Edit slide"}
        >
          <div className="opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity bg-background/90 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium">
              {language === "pt-BR" ? "Clique para editar" : language === "es" ? "Clic para editar" : "Click to edit"}
            </span>
          </div>
        </button>
      )}

      {/* Inline Editor Overlay */}
      {isEditing && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-md p-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-accent" />
                <span className="font-medium text-sm">
                  {language === "pt-BR" ? "Editar Slide" : language === "es" ? "Editar Slide" : "Edit Slide"} {slideNumber}
                </span>
                <span className="text-xs text-muted-foreground">• {slideType}</span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCancelEdit}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Main text editor */}
            <div className="space-y-2">
              <label className="text-xs font-medium">
                {isCoverSlide
                  ? (language === "pt-BR" ? "Título Principal" : language === "es" ? "Título Principal" : "Main Title")
                  : (language === "pt-BR" ? "Texto do Slide" : language === "es" ? "Texto del Slide" : "Slide Text")}
              </label>
              <Textarea
                ref={textareaRef}
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="min-h-[100px] resize-none"
                placeholder={language === "pt-BR" ? "Digite o texto..." : "Enter text..."}
                onKeyDown={handleKeyDown}
              />
            </div>

            {/* Keyboard hint */}
            <p className="text-xs text-muted-foreground text-center">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">⌘</kbd>
              {" + "}
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Enter</kbd>
              {" "}
              {language === "pt-BR" ? "para salvar" : language === "es" ? "para guardar" : "to save"}
              {" • "}
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd>
              {" "}
              {language === "pt-BR" ? "para cancelar" : language === "es" ? "para cancelar" : "to cancel"}
            </p>

            {/* Action buttons */}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={onCancelEdit}>
                <X className="w-4 h-4 mr-1" />
                {language === "pt-BR" ? "Cancelar" : language === "es" ? "Cancelar" : "Cancel"}
              </Button>
              <Button variant="accent" size="sm" onClick={handleSave}>
                <Check className="w-4 h-4 mr-1" />
                {language === "pt-BR" ? "Salvar" : language === "es" ? "Guardar" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Locked Indicator */}
      {isLocked && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-green-500/90 text-white text-xs font-medium rounded-full flex items-center gap-1">
          <Check className="w-3 h-3" />
          {language === "pt-BR" ? "Finalizado" : language === "es" ? "Finalizado" : "Finalized"}
        </div>
      )}
    </div>
  );
};

export default SlideEditOverlay;
