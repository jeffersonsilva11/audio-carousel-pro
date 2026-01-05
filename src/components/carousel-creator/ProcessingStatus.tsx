import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Mic2, FileText, Image, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useLanguage";
import { LottieAnimation } from "@/components/animations/LottieAnimations";

interface ProcessingStatusProps {
  status: string;
}

const ProcessingStatus = ({ status }: ProcessingStatusProps) => {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);

  const steps = [
    {
      id: "TRANSCRIBING",
      name: t("processingStatus", "transcribing"),
      description: t("processingStatus", "transcribingDesc"),
      icon: Mic2
    },
    {
      id: "SCRIPTING",
      name: t("processingStatus", "scripting"),
      description: t("processingStatus", "scriptingDesc"),
      icon: FileText
    },
    {
      id: "GENERATING",
      name: t("processingStatus", "generating"),
      description: t("processingStatus", "generatingDesc"),
      icon: Image
    },
    {
      id: "COMPLETED",
      name: t("processingStatus", "completed"),
      description: t("processingStatus", "completedDesc"),
      icon: Check
    },
  ];

  // Ensure currentStepIndex is never negative
  const rawIndex = steps.findIndex(s => s.id === status);
  const currentStepIndex = rawIndex >= 0 ? rawIndex : 0;
  const progressPerStep = 100 / (steps.length - 1);

  useEffect(() => {
    // Animate progress
    const targetProgress = currentStepIndex * progressPerStep;
    
    if (status === "COMPLETED") {
      setProgress(100);
    } else {
      const interval = setInterval(() => {
        setProgress(prev => {
          const next = prev + 1;
          if (next >= targetProgress + progressPerStep * 0.8) {
            clearInterval(interval);
            return targetProgress + progressPerStep * 0.8;
          }
          return next;
        });
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [status, currentStepIndex, progressPerStep]);

  return (
    <div className="space-y-8">
      {/* Main animation */}
      <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
        <CardContent className="p-8 flex flex-col items-center text-center">
          <div className="relative mb-6">
            {status === "COMPLETED" ? (
              <LottieAnimation type="success" size={120} loop={false} />
            ) : (
              <LottieAnimation type="processing" size={120} />
            )}
          </div>

          <h3 className="text-xl font-semibold mb-2">
            {steps[currentStepIndex]?.name || t("processingStatus", "processing")}
          </h3>
          <p className="text-muted-foreground">
            {steps[currentStepIndex]?.description || t("processingStatus", "pleaseWait")}
          </p>

          <div className="w-full max-w-xs mt-6">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">
              {t("processingStatus", "percentComplete").replace("{percent}", String(Math.round(progress)))}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Steps list */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === status;
          const isCompleted = index < currentStepIndex || status === "COMPLETED";
          const isPending = index > currentStepIndex && status !== "COMPLETED";

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-4 p-3 rounded-lg transition-all",
                isActive && "bg-accent/10",
                isCompleted && "opacity-70"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                isCompleted ? "bg-accent text-accent-foreground" :
                isActive ? "bg-accent/20 text-accent" :
                "bg-muted text-muted-foreground"
              )}>
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : isActive ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1">
                <p className={cn(
                  "font-medium",
                  isPending && "text-muted-foreground"
                )}>
                  {step.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProcessingStatus;
