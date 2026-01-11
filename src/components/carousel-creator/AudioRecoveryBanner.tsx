import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Trash2, RefreshCw, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/useLanguage";

interface AudioRecoveryBannerProps {
  audioFile: File;
  audioDuration: number;
  onDiscard: () => void;
  onRecordNew: () => void;
}

const AudioRecoveryBanner = ({
  audioFile,
  audioDuration,
  onDiscard,
  onRecordNew,
}: AudioRecoveryBannerProps) => {
  const { language } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const langKey = language === "pt-BR" ? "pt" : language === "es" ? "es" : "en";

  const translations = {
    pt: {
      recovered: "Áudio recuperado",
      recoveredDesc: "Seu áudio anterior foi restaurado da sessão",
      listen: "Ouvir",
      pause: "Pausar",
      discard: "Descartar",
      recordNew: "Gravar novo",
      playing: "Reproduzindo...",
    },
    en: {
      recovered: "Audio recovered",
      recoveredDesc: "Your previous audio was restored from session",
      listen: "Listen",
      pause: "Pause",
      discard: "Discard",
      recordNew: "Record new",
      playing: "Playing...",
    },
    es: {
      recovered: "Audio recuperado",
      recoveredDesc: "Tu audio anterior fue restaurado de la sesión",
      listen: "Escuchar",
      pause: "Pausar",
      discard: "Descartar",
      recordNew: "Grabar nuevo",
      playing: "Reproduciendo...",
    },
  };

  const t = translations[langKey];

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const togglePlayback = () => {
    if (!audioFile) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(URL.createObjectURL(audioFile));
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (playbackIntervalRef.current) {
          clearInterval(playbackIntervalRef.current);
          playbackIntervalRef.current = null;
        }
      };
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    } else {
      audioRef.current.play();
      setIsPlaying(true);
      playbackIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      }, 100);
    }
  };

  const handleDiscard = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
    }
    onDiscard();
  };

  const handleRecordNew = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
    }
    onRecordNew();
  };

  const progress = audioDuration ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className="bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
          <Volume2 className="w-5 h-5 text-accent" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-sm">{t.recovered}</h4>
            <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
              {formatTime(audioDuration)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {t.recoveredDesc}
          </p>

          {/* Mini player */}
          <div className="flex items-center gap-3">
            {/* Play/Pause button */}
            <Button
              variant="outline"
              size="sm"
              onClick={togglePlayback}
              className={cn(
                "rounded-full w-9 h-9 p-0 transition-colors",
                isPlaying && "bg-accent text-accent-foreground hover:bg-accent/90"
              )}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </Button>

            {/* Progress bar */}
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Time display */}
            <span className="text-xs text-muted-foreground font-mono w-16 text-right">
              {isPlaying
                ? `${formatTime(currentTime)} / ${formatTime(audioDuration)}`
                : formatTime(audioDuration)}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRecordNew}
              className="text-xs h-8 px-3 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              {t.recordNew}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDiscard}
              className="text-xs h-8 px-3 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              {t.discard}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioRecoveryBanner;
