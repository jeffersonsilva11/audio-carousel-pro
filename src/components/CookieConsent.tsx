import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Cookie } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { initGA } from "@/hooks/useAnalytics";
import { initSentry } from "@/lib/sentry";

const COOKIE_CONSENT_KEY = "cookie_consent";

type ConsentStatus = "accepted" | "rejected" | null;

export const CookieConsent = () => {
  const { language } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Small delay for better UX - let page load first
      const timer = setTimeout(() => {
        setIsVisible(true);
        setIsAnimating(true);
      }, 1500);
      return () => clearTimeout(timer);
    } else if (consent === "accepted") {
      // User has previously consented - initialize analytics
      initGA();
      initSentry();
    }
  }, []);

  const handleConsent = (status: ConsentStatus) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, status || "rejected");
    setIsAnimating(false);
    setTimeout(() => setIsVisible(false), 300);

    // Initialize analytics services if user accepted
    if (status === "accepted") {
      initGA();
      initSentry();
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 transition-all duration-300",
        isAnimating ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      )}
    >
      <div className="container mx-auto max-w-4xl">
        <div className="bg-card border border-border rounded-2xl shadow-xl p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <Cookie className="w-5 h-5 text-accent" />
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">
                {t("cookies", "title", language)}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("cookies", "description", language)}{" "}
                <a 
                  href="/privacy" 
                  className="text-accent hover:underline"
                >
                  {t("cookies", "learnMore", language)}
                </a>
              </p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleConsent("rejected")}
                className="flex-1 md:flex-initial"
              >
                {t("cookies", "reject", language)}
              </Button>
              <Button
                variant="accent"
                size="sm"
                onClick={() => handleConsent("accepted")}
                className="flex-1 md:flex-initial"
              >
                {t("cookies", "accept", language)}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleConsent("rejected")}
                className="hidden md:flex"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
