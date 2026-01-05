import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  User,
  Camera,
  Upload,
  X,
  Instagram,
  Save,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { 
  AVATAR_POSITIONS, 
  DISPLAY_MODES, 
  BRAND,
  type AvatarPosition, 
  type DisplayMode,
  getPositionLabel,
  getDisplayModeLabel
} from "@/lib/constants";
import SlidePreview from "@/components/carousel-creator/SlidePreview";

const ProfileSettings = () => {
  const { user, loading: authLoading } = useAuth();
  const { preferences, loading: prefsLoading, saving, savePreferences } = useUserPreferences();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state for form
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [avatarPosition, setAvatarPosition] = useState<AvatarPosition>("top-left");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("name_and_username");
  const [uploading, setUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize from preferences
  useEffect(() => {
    if (!prefsLoading) {
      setName(preferences.name);
      setUsername(preferences.username);
      setPhotoUrl(preferences.photoUrl);
      setAvatarPosition(preferences.avatarPosition);
      setDisplayMode(preferences.displayMode);
    }
  }, [preferences, prefsLoading]);

  // Track changes
  useEffect(() => {
    if (!prefsLoading) {
      const changed =
        name !== preferences.name ||
        username !== preferences.username ||
        photoUrl !== preferences.photoUrl ||
        avatarPosition !== preferences.avatarPosition ||
        displayMode !== preferences.displayMode;
      setHasChanges(changed);
    }
  }, [name, username, photoUrl, avatarPosition, displayMode, preferences, prefsLoading]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: t("profileSettings", "invalidFile", language),
        description: t("profileSettings", "selectImage", language),
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t("profileSettings", "fileTooLarge", language),
        description: t("profileSettings", "maxFileSize", language),
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

      setPhotoUrl(publicUrl);
      
      toast({
        title: t("profileSettings", "photoUploaded", language),
        description: t("profileSettings", "photoUploadedDesc", language),
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: t("profileSettings", "uploadError", language),
        description: t("profileSettings", "uploadErrorDesc", language),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = () => {
    setPhotoUrl(null);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';
  };

  const handleSave = async () => {
    await savePreferences({
      name,
      username,
      photoUrl,
      avatarPosition,
      displayMode,
    });

    toast({
      title: t("profileSettings", "saved", language),
      description: t("profileSettings", "savedDesc", language),
    });
  };

  if (authLoading || prefsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/dashboard")}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h1 className="font-semibold">{t("profileSettings", "pageTitle", language)}</h1>
            </div>

            <Button 
              onClick={handleSave} 
              disabled={saving || !hasChanges}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {t("common", "save", language)}
            </Button>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Identity Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Identidade do Perfil
                </CardTitle>
                <CardDescription>
                  Estas informações aparecerão em todos os seus carrosséis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Photo Upload */}
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div 
                      className={cn(
                        "w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-dashed border-border transition-colors",
                        photoUrl && "border-solid border-accent"
                      )}
                    >
                      {photoUrl ? (
                        <img 
                          src={photoUrl} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : name ? (
                        <span className="text-2xl font-bold text-muted-foreground">
                          {getInitials(name)}
                        </span>
                      ) : (
                        <User className="w-10 h-10 text-muted-foreground" />
                      )}
                    </div>
                    {photoUrl && (
                      <button
                        onClick={removePhoto}
                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
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
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <Camera className="w-4 h-4 mr-2 animate-pulse" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          {photoUrl ? 'Trocar foto' : 'Carregar foto'}
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG ou WebP. Máx 5MB.
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Name and Username */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      placeholder="Seu nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={50}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">@username</Label>
                    <div className="relative">
                      <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="username"
                        placeholder="seuusername"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.replace('@', '').replace(/\s/g, ''))}
                        className="pl-10"
                        maxLength={30}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Avatar Position */}
                <div className="space-y-3">
                  <Label>Posição no slide</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {AVATAR_POSITIONS.map((pos) => (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => setAvatarPosition(pos.id)}
                        className={cn(
                          "relative p-3 rounded-lg border transition-all text-center",
                          avatarPosition === pos.id
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border hover:border-accent/50 text-muted-foreground hover:text-foreground"
                        )}
                      >
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
                        {avatarPosition === pos.id && (
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
                    value={displayMode}
                    onValueChange={(value) => setDisplayMode(value as DisplayMode)}
                    className="flex flex-col sm:flex-row gap-3"
                  >
                    {DISPLAY_MODES.map((mode) => (
                      <label
                        key={mode.id}
                        className={cn(
                          "flex-1 flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                          displayMode === mode.id
                            ? "border-accent bg-accent/10"
                            : "border-border hover:border-accent/50"
                        )}
                      >
                        <RadioGroupItem value={mode.id} />
                        <span className="text-sm font-medium">{getDisplayModeLabel(mode.labelKey, language)}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Right column - Preview */}
          <div className="space-y-4">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-base">Preview do Slide</CardTitle>
                <CardDescription>
                  Como sua identidade aparecerá nos carrosséis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SlidePreview 
                  profile={{
                    name,
                    username,
                    photoUrl,
                    avatarPosition,
                    displayMode
                  }}
                  style="BLACK_WHITE"
                  className="w-full"
                />
                <SlidePreview 
                  profile={{
                    name,
                    username,
                    photoUrl,
                    avatarPosition,
                    displayMode
                  }}
                  style="WHITE_BLACK"
                  className="w-full"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfileSettings;
