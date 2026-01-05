import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { GripVertical, Move } from "lucide-react";

interface Slide {
  number: number;
  type: string;
  text: string;
  imageUrl?: string;
}

interface SortableSlideProps {
  slide: Slide;
  index: number;
  isActive: boolean;
  isModified: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function SortableSlide({ 
  slide, 
  index, 
  isActive, 
  isModified, 
  onClick,
  disabled = false 
}: SortableSlideProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    over,
  } = useSortable({ 
    id: `slide-${index}`,
    disabled 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative shrink-0 group",
        isDragging && "z-50"
      )}
    >
      {/* Main slide button */}
      <button
        onClick={onClick}
        className={cn(
          "relative w-14 h-[70px] rounded-lg overflow-hidden border-2 transition-all bg-muted/30",
          isActive
            ? "border-accent ring-2 ring-accent/20"
            : "border-transparent hover:border-muted-foreground/30",
          isDragging && "opacity-50 scale-95"
        )}
      >
        {slide.imageUrl ? (
          <img
            src={slide.imageUrl}
            alt={`Thumbnail ${index + 1}`}
            className="w-full h-full object-contain"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
            {index + 1}
          </div>
        )}
        {isActive && !isDragging && (
          <div className="absolute inset-0 bg-accent/10" />
        )}
        {isModified && (
          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
        )}
        
        {/* Slide number badge */}
        <div className="absolute bottom-1 left-1 w-5 h-5 rounded bg-background/80 backdrop-blur-sm flex items-center justify-center text-[10px] font-medium">
          {index + 1}
        </div>
      </button>
      
      {/* Drag handle - only visible on hover when not disabled */}
      {!disabled && (
        <div
          {...attributes}
          {...listeners}
          className={cn(
            "absolute -left-2 top-1/2 -translate-y-1/2 w-6 h-10 flex items-center justify-center",
            "bg-background/90 backdrop-blur-sm rounded-l-lg border border-r-0 border-border",
            "cursor-grab active:cursor-grabbing",
            "opacity-0 group-hover:opacity-100 transition-all duration-200",
            "hover:bg-accent/10 hover:border-accent/30",
            isDragging && "opacity-100 cursor-grabbing bg-accent/20 border-accent"
          )}
        >
          <GripVertical className={cn(
            "w-3.5 h-3.5",
            isDragging ? "text-accent" : "text-muted-foreground"
          )} />
        </div>
      )}

      {/* Dragging overlay - shows on the original position */}
      {isDragging && (
        <div className="absolute inset-0 rounded-lg border-2 border-dashed border-accent/50 bg-accent/5 flex items-center justify-center">
          <Move className="w-4 h-4 text-accent/50" />
        </div>
      )}
    </div>
  );
}
