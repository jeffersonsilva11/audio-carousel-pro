import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic2, ArrowLeft, Loader2, Mail, CheckCircle2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BRAND } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Session storage key for email verification (avoids exposing email in URL/browser history)
const VERIFY_EMAIL_KEY = "verify_email_pending";

const VerifyEmail = () => {
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get email from sessionStorage (preferred) or fallback to URL params for backwards compatibility
  const urlEmail = searchParams.get("email") || "";
  const storedEmail = sessionStorage.getItem(VERIFY_EMAIL_KEY) || "";
  const email = storedEmail || urlEmail;

  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Store email in sessionStorage and clean URL if email was in params
  useEffect(() => {
    if (urlEmail && !storedEmail) {
      sessionStorage.setItem(VERIFY_EMAIL_KEY, urlEmail);
      // Clean URL by removing email param (security: remove from browser history)
      navigate("/auth/verify", { replace: true });
    }
  }, [urlEmail, storedEmail, navigate]);

  // Redirect if no email provided
  useEffect(() => {
    if (!email) {
      navigate("/auth");
    }
  }, [email, navigate]);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Auto-focus first input
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (value && index === 5 && newOtp.every(d => d !== "")) {
      handleVerify(newOtp.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);

    if (pastedData.length === 6) {
      const newOtp = pastedData.split("");
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (code?: string) => {
    const otpCode = code || otp.join("");

    if (otpCode.length !== 6) {
      toast({
        title: t("verifyEmail", "incompleteCode", language),
        description: t("verifyEmail", "enterSixDigitCode", language),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Use custom verification endpoint via SMTP
      const response = await supabase.functions.invoke("verify-email-token", {
        body: {
          email,
          token: otpCode,
        },
      });

      if (response.error || response.data?.error) {
        const errorMessage = response.data?.error || response.error?.message || t("verifyEmail", "invalidCode", language);
        toast({
          title: t("verifyEmail", "invalidCode", language),
          description: errorMessage,
          variant: "destructive",
        });
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      } else {
        setIsVerified(true);
        // Clear stored email from sessionStorage (security: cleanup after verification)
        sessionStorage.removeItem(VERIFY_EMAIL_KEY);

        toast({
          title: t("verifyEmail", "emailVerified", language),
          description: t("verifyEmail", "accountActivated", language),
        });

        // Refresh session to update email_confirmed_at
        await supabase.auth.refreshSession();

        // Redirect to dashboard after short delay
        setTimeout(() => {
          navigate("/dashboard");
        }, 1500);
      }
    } catch {
      toast({
        title: t("errors", "error", language),
        description: t("verifyEmail", "verificationError", language),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setIsResending(true);

    try {
      // Get current user to resend verification
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: t("verifyEmail", "resendError", language),
          description: t("verifyEmail", "userNotFound", language),
          variant: "destructive",
        });
        return;
      }

      // Use custom SMTP function to resend verification email
      const response = await supabase.functions.invoke("send-signup-verification", {
        body: {
          userId: user.id,
          email,
        },
      });

      if (response.error || response.data?.error) {
        const errorMessage = response.data?.error || response.error?.message || t("verifyEmail", "resendError", language);
        toast({
          title: t("verifyEmail", "resendError", language),
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        // Check if it was a resend (same code) or new code
        const isResend = response.data?.isResend;

        toast({
          title: isResend
            ? (language === "pt-BR" ? "Código reenviado" : language === "es" ? "Código reenviado" : "Code resent")
            : t("verifyEmail", "codeResent", language),
          description: isResend
            ? (language === "pt-BR"
                ? "O mesmo código foi reenviado para seu e-mail."
                : language === "es"
                  ? "El mismo código fue reenviado a tu correo."
                  : "The same code was resent to your email.")
            : t("verifyEmail", "checkInbox", language),
        });

        setResendCooldown(60); // 60 seconds cooldown
      }
    } catch {
      toast({
        title: t("errors", "error", language),
        description: t("verifyEmail", "resendCodeError", language),
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  if (isVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-border/50 shadow-2xl">
            <CardContent className="pt-12 pb-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">{t("verifyEmail", "emailVerified", language)}</h2>
              <p className="text-muted-foreground mb-6">
                {t("verifyEmail", "redirecting", language)}
              </p>
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-accent" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleBackToLogin = async () => {
    // Sign out any existing session before going back to login
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to auth */}
        <button
          onClick={handleBackToLogin}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("verifyEmail", "backToLogin", language)}
        </button>

        <Card className="border-border/50 shadow-2xl">
          <CardHeader className="text-center pb-2">
            {/* Logo */}
            <a href="/" className="flex items-center justify-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
                <Mic2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl tracking-tight">{BRAND.name}</span>
            </a>

            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
              <Mail className="w-8 h-8 text-accent" />
            </div>

            <CardTitle className="text-2xl font-bold">
              {t("verifyEmail", "verifyYourEmail", language)}
            </CardTitle>
            <CardDescription className="space-y-2">
              <p>{t("verifyEmail", "sentVerificationCode", language)}</p>
              <p className="font-medium text-foreground">{email}</p>
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            {/* OTP Input */}
            <div className="flex justify-center gap-2 mb-6">
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className={cn(
                    "w-12 h-14 text-center text-2xl font-bold",
                    "focus:ring-2 focus:ring-accent focus:border-accent",
                    digit && "border-accent bg-accent/5"
                  )}
                  disabled={isLoading}
                />
              ))}
            </div>

            <Button
              onClick={() => handleVerify()}
              className="w-full"
              variant="accent"
              disabled={isLoading || otp.some(d => !d)}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("verifyEmail", "verifying", language)}
                </>
              ) : (
                t("verifyEmail", "verifyEmailButton", language)
              )}
            </Button>

            {/* Resend code */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                {t("verifyEmail", "didNotReceiveCode", language)}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResend}
                disabled={isResending || resendCooldown > 0}
                className="gap-2"
              >
                {isResending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {resendCooldown > 0
                  ? t("verifyEmail", "resendIn", language).replace("{seconds}", String(resendCooldown))
                  : t("verifyEmail", "resendCode", language)
                }
              </Button>
            </div>

            {/* Help text */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground text-center">
                💡 {t("verifyEmail", "spamHint", language)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmail;
