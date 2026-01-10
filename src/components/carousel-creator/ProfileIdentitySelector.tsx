import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  User,
  Upload,
  Camera,
  Instagram,
  X,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AVATAR_POSITIONS,
  DISPLAY_MODES,
  type AvatarPosition,
  type DisplayMode,
  getPositionLabel,
  getDisplayModeLabel
} from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/translations";

export interface ProfileIdentity {
  name: string;
  username: string;
  photoUrl: string | null;
  avatarPosition: AvatarPosition;
  displayMode: DisplayMode;
}

interface ProfileIdentitySelectorProps {
  profile: ProfileIdentity;
  setProfile: (profile: ProfileIdentity) => void;
  showValidation?: boolean;
}

const ProfileIdentitySelector = ({ profile, setProfile, showValidation = false }: ProfileIdentitySelectorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Validation states
  const isNameValid = profile.name.length >= 2;
  const isUsernameValid = profile.username.length >= 2;
  const isPhotoValid = profile.photoUrl !== null;

  // Show error states only when validation is enabled
  const showNameError = showValidation && !isNameValid;
  const showUsernameError = showValidation && !isUsernameValid;
  const showPhotoError = showValidation && !isPhotoValid;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/profile-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('carousel-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('carousel-images')
        .getPublicUrl(fileName);

      setProfile({ ...profile, photoUrl: publicUrl });
      
      toast({
        title: "Foto carregada",
        description: "Sua foto de perfil foi atualizada.",
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível carregar a foto.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = () => {
    setProfile({ ...profile, photoUrl: null });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Identidade do Perfil</h3>
        <p className="text-sm text-muted-foreground">
          Sua foto e nome aparecerão em todos os slides
        </p>
      </div>

      {/* Photo Upload */}
      <div className="flex items-start gap-4">
        <div className="relative">
          <div
            className={cn(
              "w-20 h-20 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-dashed transition-colors",
              profile.photoUrl && "border-solid border-accent",
              showPhotoError ? "border-destructive bg-destructive/5" : "border-border"
            )}
          >
            {profile.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : profile.name ? (
              <span className="text-xl font-bold text-muted-foreground">
                {getInitials(profile.name)}
              </span>
            ) : (
              <User className={cn("w-8 h-8", showPhotoError ? "text-destructive" : "text-muted-foreground")} />
            )}
          </div>
          {profile.photoUrl && (
            <button
              onClick={removePhoto}
              className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          {showPhotoError && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
              <AlertCircle className="w-3 h-3" />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant={showPhotoError ? "destructive" : "outline"}
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full sm:w-auto"
          >
            {uploading ? (
              <>
                <Camera className="w-4 h-4 mr-2 animate-pulse" />
                {t("profileIdentity", "uploading", language)}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {profile.photoUrl ? t("profileIdentity", "changePhoto", language) : t("profileIdentity", "uploadPhoto", language)}
              </>
            )}
          </Button>
          {showPhotoError ? (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {t("profileIdentity", "photoRequired", language)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              JPG, PNG ou WebP. Máx 5MB. <span className="text-accent">{t("profileIdentity", "recommended", language)}</span>
            </p>
          )}
        </div>
      </div>

      {/* Name and Username */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="profile-name" className={cn(showNameError && "text-destructive")}>
            {t("profileIdentity", "name", language)} <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="profile-name"
              placeholder={t("profileIdentity", "namePlaceholder", language)}
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              maxLength={50}
              className={cn(showNameError && "border-destructive focus-visible:ring-destructive")}
            />
            {showNameError && (
              <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
            )}
          </div>
          {showNameError && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {t("profileIdentity", "nameRequired", language)}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-username" className={cn(showUsernameError && "text-destructive")}>
            @username <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Instagram className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
              showUsernameError ? "text-destructive" : "text-muted-foreground"
            )} />
            <Input
              id="profile-username"
              placeholder={t("profileIdentity", "usernamePlaceholder", language)}
              value={profile.username}
              onChange={(e) => setProfile({
                ...profile,
                username: e.target.value.replace('@', '').replace(/\s/g, '')
              })}
              className={cn("pl-10", showUsernameError && "border-destructive focus-visible:ring-destructive")}
              maxLength={30}
            />
            {showUsernameError && (
              <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
            )}
          </div>
          {showUsernameError && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {t("profileIdentity", "usernameRequired", language)}
            </p>
          )}
        </div>
      </div>

      {/* Avatar Position */}
      <div className="space-y-3">
        <Label>Posição no slide</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {AVATAR_POSITIONS.map((pos) => (
            <button
              key={pos.id}
              type="button"
              onClick={() => setProfile({ ...profile, avatarPosition: pos.id })}
              className={cn(
                "relative p-3 rounded-lg border transition-all text-center",
                profile.avatarPosition === pos.id
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border hover:border-accent/50 text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Mini preview */}
              <div className="w-full aspect-square bg-muted/50 rounded mb-2 relative">
                <div 
                  className={cn(
                    "absolute w-3 h-3 rounded-full bg-accent",
                    pos.id === 'top-left' && "top-1 left-1",
                    pos.id === 'top-right' && "top-1 right-1",
                    pos.id === 'bottom-left' && "bottom-1 left-1",
                    pos.id === 'bottom-right' && "bottom-1 right-1"
                  )}
                />
              </div>
              <span className="text-xs font-medium">{getPositionLabel(pos.labelKey, language)}</span>
              {profile.avatarPosition === pos.id && (
                <CheckCircle2 className="absolute top-1 right-1 w-4 h-4 text-accent" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Display Mode */}
      <div className="space-y-3">
        <Label>Exibir</Label>
        <RadioGroup
          value={profile.displayMode}
          onValueChange={(value) => setProfile({ ...profile, displayMode: value as DisplayMode })}
          className="flex flex-col sm:flex-row gap-3"
        >
          {DISPLAY_MODES.map((mode) => (
            <label
              key={mode.id}
              className={cn(
                "flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                profile.displayMode === mode.id
                  ? "border-accent bg-accent/10"
                  : "border-border hover:border-accent/50"
              )}
            >
              <RadioGroupItem value={mode.id} id={mode.id} />
              <span className="text-sm font-medium">{getDisplayModeLabel(mode.labelKey, language)}</span>
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Live Slide Preview */}
      {(profile.name || profile.username) && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Preview ao vivo:</p>
          <div className="grid grid-cols-2 gap-3">
            {/* Dark preview */}
            <div className="relative aspect-square rounded-lg overflow-hidden bg-[#0A0A0A]">
              <div className="absolute top-3 right-3 text-white/50 text-[8px] font-medium">1/6</div>
              <div className={cn(
                "absolute flex items-center gap-1.5",
                profile.avatarPosition === 'top-left' && "top-2 left-2",
                profile.avatarPosition === 'top-right' && "top-2 right-2 flex-row-reverse",
                profile.avatarPosition === 'bottom-left' && "bottom-2 left-2",
                profile.avatarPosition === 'bottom-right' && "bottom-2 right-2 flex-row-reverse"
              )}>
                <div className="w-6 h-6 rounded-full overflow-hidden bg-white/15 flex items-center justify-center">
                  {profile.photoUrl ? (
                    <img src={profile.photoUrl} alt={profile.name ? `${profile.name}'s avatar` : "Profile avatar"} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[8px] font-bold text-white">{getInitials(profile.name)}</span>
                  )}
                </div>
                <div className={cn("text-left", profile.avatarPosition.includes('right') && "text-right")}>
                  {profile.displayMode === 'name_and_username' && profile.name && (
                    <p className="font-semibold text-[7px] text-white leading-tight">{profile.name}</p>
                  )}
                  {profile.username && (
                    <p className="text-[6px] text-white/70 leading-tight">@{profile.username}</p>
                  )}
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-white/40 text-[8px]">
                Conteúdo
              </div>
            </div>
            
            {/* Light preview */}
            <div className="relative aspect-square rounded-lg overflow-hidden bg-white border">
              <div className="absolute top-3 right-3 text-[#0A0A0A]/50 text-[8px] font-medium">1/6</div>
              <div className={cn(
                "absolute flex items-center gap-1.5",
                profile.avatarPosition === 'top-left' && "top-2 left-2",
                profile.avatarPosition === 'top-right' && "top-2 right-2 flex-row-reverse",
                profile.avatarPosition === 'bottom-left' && "bottom-2 left-2",
                profile.avatarPosition === 'bottom-right' && "bottom-2 right-2 flex-row-reverse"
              )}>
                <div className="w-6 h-6 rounded-full overflow-hidden bg-[#0A0A0A]/10 flex items-center justify-center">
                  {profile.photoUrl ? (
                    <img src={profile.photoUrl} alt={profile.name ? `${profile.name}'s avatar` : "Profile avatar"} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[8px] font-bold text-[#0A0A0A]">{getInitials(profile.name)}</span>
                  )}
                </div>
                <div className={cn("text-left", profile.avatarPosition.includes('right') && "text-right")}>
                  {profile.displayMode === 'name_and_username' && profile.name && (
                    <p className="font-semibold text-[7px] text-[#0A0A0A] leading-tight">{profile.name}</p>
                  )}
                  {profile.username && (
                    <p className="text-[6px] text-[#0A0A0A]/70 leading-tight">@{profile.username}</p>
                  )}
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-[#0A0A0A]/40 text-[8px]">
                Conteúdo
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileIdentitySelector;
