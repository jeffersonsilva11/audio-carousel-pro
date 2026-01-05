import { useState, useEffect } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { cn } from "@/lib/utils";

const LOCAL_VERSION_KEY = "audisell_app_version";

const VersionUpdateBanner = () => {
  const { user } = useAuth();
  const { settings, loading } = useSystemSettings();
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (loading || !user || dismissed) return;

    // Only show if version notification is enabled
    if (!settings.versionNotificationEnabled) {
      setShowBanner(false);
      return;
    }

    const serverVersion = settings.appVersion;
    const localVersion = localStorage.getItem(LOCAL_VERSION_KEY);

    // If no local version stored, save current and don't show banner
    if (!localVersion) {
      localStorage.setItem(LOCAL_VERSION_KEY, serverVersion);
      setShowBanner(false);
      return;
    }

    // If versions differ, show the update banner
    if (localVersion !== serverVersion) {
      setShowBanner(true);
    } else {
      setShowBanner(false);
    }
  }, [settings, loading, user, dismissed]);

  const handleUpdate = () => {
    setUpdating(true);

    // Update local storage with new version
    localStorage.setItem(LOCAL_VERSION_KEY, settings.appVersion);

    // Hard reload without cache
    // Using location.reload(true) is deprecated, so we use cache-busting approach
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      }).finally(() => {
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowBanner(false);
  };

  if (!showBanner || !user) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 max-w-sm",
        "animate-in slide-in-from-bottom-5 fade-in duration-300"
      )}
    >
      <div className="bg-card border border-border rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <RefreshCw className="w-5 h-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm">Nova versao disponivel!</h4>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {settings.versionUpdateMessage}
            </p>

            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleUpdate}
                disabled={updating}
                className="gap-1.5"
              >
                {updating ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Atualizar agora
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
              >
                Depois
              </Button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VersionUpdateBanner;
