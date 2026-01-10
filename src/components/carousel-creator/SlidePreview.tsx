import { cn } from "@/lib/utils";
import { User } from "lucide-react";
import { ProfileIdentity } from "./ProfileIdentitySelector";
import { StyleType } from "./StyleSelector";

interface SlidePreviewProps {
  profile: ProfileIdentity;
  style: StyleType;
  className?: string;
}

const SlidePreview = ({ profile, style, className }: SlidePreviewProps) => {
  const isDark = style === 'BLACK_WHITE';
  const bgColor = isDark ? 'bg-[#0A0A0A]' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-[#0A0A0A]';
  const mutedColor = isDark ? 'text-white/70' : 'text-[#0A0A0A]/70';

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Calculate position classes based on avatarPosition
  const getPositionClasses = () => {
    switch (profile.avatarPosition) {
      case 'top-right':
        return 'top-3 right-3 flex-row-reverse';
      case 'bottom-left':
        return 'bottom-3 left-3';
      case 'bottom-right':
        return 'bottom-3 right-3 flex-row-reverse';
      default: // top-left
        return 'top-3 left-3';
    }
  };

  const getTextAlign = () => {
    return profile.avatarPosition.includes('right') ? 'text-right' : 'text-left';
  };

  return (
    <div 
      className={cn(
        "relative aspect-square rounded-lg overflow-hidden",
        bgColor,
        className
      )}
    >
      {/* Slide counter */}
      <div className={cn("absolute top-3 right-3", textColor, "opacity-50 text-xs font-medium")}>
        1/6
      </div>

      {/* Profile identity */}
      {profile.username && (
        <div className={cn("absolute flex items-center gap-2", getPositionClasses())}>
          {/* Avatar */}
          <div 
            className={cn(
              "w-8 h-8 rounded-full overflow-hidden flex items-center justify-center",
              isDark ? "bg-white/15" : "bg-[#0A0A0A]/10"
            )}
          >
            {profile.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={profile.name ? `${profile.name}'s avatar` : "Profile avatar"}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className={cn("text-xs font-semibold", textColor)}>
                {getInitials(profile.name)}
              </span>
            )}
          </div>

          {/* Name and username */}
          <div className={getTextAlign()}>
            {profile.displayMode === 'name_and_username' && profile.name && (
              <p className={cn("text-xs font-semibold leading-tight", textColor)}>
                {profile.name}
              </p>
            )}
            <p className={cn("text-xs leading-tight", mutedColor)}>
              @{profile.username}
            </p>
          </div>
        </div>
      )}

      {/* Sample content */}
      <div className={cn("absolute inset-0 flex items-center justify-center px-6", textColor)}>
        <div className="text-center space-y-2">
          <p className="text-sm font-medium">Seu conteúdo</p>
          <p className="text-xs opacity-60">aparecerá aqui</p>
        </div>
      </div>
    </div>
  );
};

export default SlidePreview;
