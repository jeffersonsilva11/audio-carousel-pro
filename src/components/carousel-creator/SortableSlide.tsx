import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";

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
        isDragging && "z-50 opacity-90"
      )}
    >
      <button
        onClick={onClick}
        className={cn(
          "relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
          isActive
            ? "border-accent ring-2 ring-accent/20"
            : "border-transparent hover:border-muted-foreground/30",
          isDragging && "shadow-lg scale-105"
        )}
      >
        {slide.imageUrl ? (
          <img
            src={slide.imageUrl}
            alt={`Thumbnail ${index + 1}`}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
            {index + 1}
          </div>
        )}
        {isActive && (
          <div className="absolute inset-0 bg-accent/10" />
        )}
        {isModified && (
          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
        )}
      </button>
      
      {/* Drag handle */}
      {!disabled && (
        <div
          {...attributes}
          {...listeners}
          className={cn(
            "absolute -left-1 top-1/2 -translate-y-1/2 w-5 h-8 flex items-center justify-center",
            "bg-background/80 backdrop-blur-sm rounded-l border border-r-0 border-border",
            "cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity",
            isDragging && "opacity-100"
          )}
        >
          <GripVertical className="w-3 h-3 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
