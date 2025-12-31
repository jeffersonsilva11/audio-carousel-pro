import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Upload, Square, Trash2, Play, Pause, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useLanguage";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import { useToast } from "@/hooks/use-toast";
import { LottieAnimation } from "@/components/animations/LottieAnimations";

interface AudioUploaderProps {
  audioFile: File | null;
  setAudioFile: (file: File | null) => void;
  audioDuration: number | null;
  setAudioDuration: (duration: number | null) => void;
}

const MAX_DURATION = 30; // 30 seconds (Whisper limit)
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a", "audio/webm"];

const AudioUploader = ({ 
  audioFile, 
  setAudioFile, 
  audioDuration, 
  setAudioDuration 
}: AudioUploaderProps) => {
  const { t } = useTranslation();
  const { verifyRecaptcha, isLoading: recaptchaLoading } = useRecaptcha();
  const { toast } = useToast();
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return t("audioUploader", "unsupportedFormat");
    }
    if (file.size > MAX_SIZE) {
      return t("audioUploader", "fileTooLarge");
    }
    return null;
  }, [t]);

  const getAudioDuration = useCallback((file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(audio.src);
        resolve(audio.duration);
      };
      audio.onerror = () => reject(new Error(t("audioUploader", "couldNotReadAudio")));
    });
  }, [t]);

  const handleFileSelect = async (file: File) => {
    setError(null);
    setIsVerifying(true);
    
    try {
      // Verify reCAPTCHA before processing file
      const recaptchaResult = await verifyRecaptcha('audio_upload');
      
      if (!recaptchaResult.success) {
        toast({
          title: t("errors", "recaptchaFailed"),
          description: t("errors", "recaptchaFailedDescription"),
          variant: "destructive",
        });
        setIsVerifying(false);
        return;
      }

      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setIsVerifying(false);
        return;
      }

      const duration = await getAudioDuration(file);
      if (duration > MAX_DURATION) {
        setError(t("audioUploader", "audioTooLong").replace("{seconds}", String(MAX_DURATION)));
        setIsVerifying(false);
        return;
      }
      
      setAudioFile(file);
      setAudioDuration(duration);
    } catch {
      setError(t("audioUploader", "processingError"));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const startRecording = async () => {
    setIsVerifying(true);
    
    try {
      // Verify reCAPTCHA before recording
      const recaptchaResult = await verifyRecaptcha('audio_record');
      
      if (!recaptchaResult.success) {
        toast({
          title: t("errors", "recaptchaFailed"),
          description: t("errors", "recaptchaFailedDescription"),
          variant: "destructive",
        });
        setIsVerifying(false);
        return;
      }
      
      setIsVerifying(false);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const file = new File([audioBlob], "recording.webm", { type: "audio/webm" });
        
        stream.getTracks().forEach(track => track.stop());
        
        if (recordingTime <= MAX_DURATION) {
          setAudioFile(file);
          setAudioDuration(recordingTime);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setError(null);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= MAX_DURATION) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setIsVerifying(false);
      setError(t("audioUploader", "microphoneError"));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const togglePlayback = () => {
    if (!audioFile) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(URL.createObjectURL(audioFile));
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const removeAudio = () => {
    setAudioFile(null);
    setAudioDuration(null);
    setError(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (audioFile) {
    return (
      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="icon"
                onClick={togglePlayback}
                className="rounded-full w-12 h-12"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </Button>
              <div>
                <p className="font-medium">{audioFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(audioDuration || 0)} • {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={removeAudio}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Waveform animation */}
          <div className="mt-4 flex items-center justify-center">
            <LottieAnimation type="audioWave" size={80} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recording button */}
      <Card className={cn(
        "transition-all cursor-pointer",
        isRecording && "border-red-500 bg-red-500/5"
      )}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center">
            <Button
              variant={isRecording ? "destructive" : "outline"}
              size="lg"
              className="w-16 h-16 rounded-full mb-4"
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? (
                <Square className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </Button>
            
            {isRecording ? (
              <>
                <p className="font-semibold text-destructive">{t("audioUploader", "recording")}</p>
                <p className="text-2xl font-mono font-bold">
                  {formatTime(recordingTime)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("audioUploader", "maxDuration").replace("{seconds}", String(MAX_DURATION))}
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold">{t("audioUploader", "recordAudio")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("audioUploader", "clickToRecord")}
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-sm text-muted-foreground">{t("common", "or")}</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Upload area */}
      <Card
        className={cn(
          "border-dashed transition-all cursor-pointer",
          isDragging && "border-accent bg-accent/5"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center">
            {isDragging ? (
              <LottieAnimation type="upload" size={80} className="mb-4" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <p className="font-semibold mb-1">
              {t("audioUploader", "dragOrClick")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("audioUploader", "fileTypes").replace("{seconds}", String(MAX_DURATION))}
            </p>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  );
};

export default AudioUploader;