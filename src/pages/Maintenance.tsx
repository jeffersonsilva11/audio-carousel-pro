import { useState, useEffect } from "react";
import { Wrench, Clock, Loader2 } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { BRAND } from "@/lib/constants";

const Maintenance = () => {
  const { settings, loading } = useSystemSettings();
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  // Calculate time remaining
  useEffect(() => {
    if (!settings.maintenanceEndTime) {
      setTimeRemaining(null);
      return;
    }

    const calculateTimeRemaining = () => {
      const endTime = new Date(settings.maintenanceEndTime!).getTime();
      const now = Date.now();
      const diff = endTime - now;

      if (diff <= 0) {
        setTimeRemaining(null);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [settings.maintenanceEndTime]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <Wrench className="w-7 h-7 text-primary-foreground" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {BRAND.name} em Manutenção
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            {settings.maintenanceMessage}
          </p>
        </div>

        {/* Countdown Timer */}
        {timeRemaining && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Previsão de retorno:</span>
            </div>

            <div className="flex items-center justify-center gap-4">
              {timeRemaining.days > 0 && (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm">
                    <span className="text-2xl font-bold">{timeRemaining.days}</span>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">dias</span>
                </div>
              )}

              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm">
                  <span className="text-2xl font-bold">
                    {String(timeRemaining.hours).padStart(2, "0")}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground mt-1">horas</span>
              </div>

              <div className="text-2xl font-bold text-muted-foreground">:</div>

              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm">
                  <span className="text-2xl font-bold">
                    {String(timeRemaining.minutes).padStart(2, "0")}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground mt-1">min</span>
              </div>

              <div className="text-2xl font-bold text-muted-foreground">:</div>

              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm">
                  <span className="text-2xl font-bold">
                    {String(timeRemaining.seconds).padStart(2, "0")}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground mt-1">seg</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-8 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            Estamos trabalhando para melhorar sua experiência.
            <br />
            Obrigado pela compreensão!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
