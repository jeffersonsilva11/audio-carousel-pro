import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import { useAuthProtection } from "@/hooks/useAuthProtection";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { t } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic2, Mail, Lock, User, ArrowLeft, Loader2, AlertTriangle, Clock, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { BRAND } from "@/lib/constants";
import { Separator } from "@/components/ui/separator";
import { InteractiveCaptcha } from "@/components/auth/InteractiveCaptcha";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Auth = () => {
  const { language } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({});
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  
  const { user, signIn, signUp, signInWithGoogle, isEmailConfirmed } = useAuth();
  const { verifyRecaptcha } = useRecaptcha();
  const {
    isLocked,
    requiresInteractiveCaptcha,
    recordFailedAttempt,
    recordSuccessfulAttempt,
    getRemainingLockoutTime
  } = useAuthProtection();
  const { settings: systemSettings, loading: systemLoading } = useSystemSettings();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if registration is disabled
  const registrationDisabled = systemSettings.registrationDisabled && !isLogin;

  // Check if email verification is required
  const emailVerificationEnabled = systemSettings.emailVerificationEnabled !== false;

  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const emailSchema = z.string().email(t("auth", "invalidEmail", language));
  const passwordSchema = z.string().min(6, t("auth", "passwordMinLength", language));
  const nameSchema = z.string().min(2, t("auth", "nameMinLength", language)).optional();

  useEffect(() => {
    // Redirect to dashboard if user exists AND (email is confirmed OR verification is disabled)
    if (user && (isEmailConfirmed || !emailVerificationEnabled)) {
      navigate("/dashboard");
    }
  }, [user, isEmailConfirmed, emailVerificationEnabled, navigate]);

  // Update lockout countdown
  useEffect(() => {
    if (isLocked) {
      const interval = setInterval(() => {
        setLockoutSeconds(getRemainingLockoutTime());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isLocked, getRemainingLockoutTime]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; name?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    if (!isLogin && name) {
      const nameResult = nameSchema.safeParse(name);
      if (!nameResult.success) {
        newErrors.name = nameResult.error.errors[0].message;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    // Check if locked out
    if (isLocked) {
      toast({
        title: t("auth", "accountLocked", language),
        description: t("auth", "tryAgainLater", language).replace("{minutes}", String(Math.ceil(lockoutSeconds / 60))),
        variant: "destructive",
      });
      return;
    }

    // Check if interactive captcha is required but not completed
    if (requiresInteractiveCaptcha && !captchaToken) {
      toast({
        title: t("errors", "captchaRequired", language),
        description: t("errors", "completeCaptcha", language),
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Verify reCAPTCHA first (invisible v3)
      const recaptchaAction = isLogin ? 'login' : 'signup';
      const recaptchaResult = await verifyRecaptcha(recaptchaAction);
      
      if (!recaptchaResult.success) {
        await recordFailedAttempt();
        toast({
          title: t("errors", "recaptchaFailed", language),
          description: t("errors", "recaptchaFailedDescription", language),
          variant: "destructive",
        });
        setIsLoading(false);
        setCaptchaToken(null);
        return;
      }

      if (isLogin) {
        const { error, needsEmailVerification, email: unverifiedEmail } = await signIn(email, password);

        // Check if user needs to verify email first
        if (needsEmailVerification && unverifiedEmail) {
          if (emailVerificationEnabled) {
            // Email verification is required - sign out and redirect to verify page
            await supabase.auth.signOut();
            toast({
              title: t("auth", "emailNotVerified", language),
              description: t("auth", "pleaseVerifyEmail", language),
            });
            navigate(`/auth/verify?email=${encodeURIComponent(unverifiedEmail)}`);
            return;
          }
          // Email verification is disabled - allow login without email confirmation
          await recordSuccessfulAttempt();
          toast({
            title: t("auth", "welcomeBack", language),
            description: t("auth", "loginSuccess", language),
          });
          navigate("/dashboard");
          return;
        }

        if (error) {
          await recordFailedAttempt();
          setCaptchaToken(null);
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: t("auth", "loginError", language),
              description: t("auth", "invalidCredentials", language),
              variant: "destructive",
            });
          } else {
            toast({
              title: t("auth", "loginError", language),
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          await recordSuccessfulAttempt();
          toast({
            title: t("auth", "welcomeBack", language),
            description: t("auth", "loginSuccess", language),
          });
          navigate("/dashboard");
        }
      } else {
        const { error } = await signUp(email, password, name);
        if (error) {
          await recordFailedAttempt();
          setCaptchaToken(null);
          if (error.message.includes("User already registered")) {
            toast({
              title: t("auth", "emailAlreadyRegistered", language),
              description: t("auth", "emailInUse", language),
              variant: "destructive",
            });
          } else {
            toast({
              title: t("auth", "signupError", language),
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          await recordSuccessfulAttempt();

          // If email verification is disabled, go directly to dashboard
          if (!emailVerificationEnabled) {
            toast({
              title: t("auth", "accountCreated", language),
              description: t("auth", "loginSuccess", language),
            });
            navigate("/dashboard");
          } else {
            // Get the user to send verification email
            const { data: { user: newUser } } = await supabase.auth.getUser();

            if (newUser) {
              // Send verification email via SMTP
              try {
                await supabase.functions.invoke("send-signup-verification", {
                  body: {
                    userId: newUser.id,
                    email: email,
                    name: name || undefined
                  },
                });
              } catch (emailError) {
                console.error("Error sending verification email:", emailError);
              }
            }

            toast({
              title: t("auth", "accountCreated", language),
              description: t("auth", "checkEmailVerification", language),
            });
            // Redirect to email verification page
            navigate(`/auth/verify?email=${encodeURIComponent(email)}`);
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
  };

  const handleCaptchaExpire = () => {
    setCaptchaToken(null);
  };

  const handleGoogleSignIn = async () => {
    if (isLocked) {
      toast({
        title: t("auth", "accountLocked", language),
        description: t("auth", "tryAgainLater", language).replace("{minutes}", String(Math.ceil(lockoutSeconds / 60))),
        variant: "destructive",
      });
      return;
    }

    if (requiresInteractiveCaptcha && !captchaToken) {
      toast({
        title: t("errors", "captchaRequired", language),
        description: t("errors", "completeCaptcha", language),
        variant: "destructive",
      });
      return;
    }

    setIsGoogleLoading(true);
    try {
      // Verify reCAPTCHA first
      const recaptchaResult = await verifyRecaptcha('google_login');
      
      if (!recaptchaResult.success) {
        await recordFailedAttempt();
        toast({
          title: t("errors", "recaptchaFailed", language),
          description: t("errors", "recaptchaFailedDescription", language),
          variant: "destructive",
        });
        setIsGoogleLoading(false);
        setCaptchaToken(null);
        return;
      }

      const { error } = await signInWithGoogle();
      if (error) {
        await recordFailedAttempt();
        setCaptchaToken(null);
        toast({
          title: t("auth", "googleError", language),
          description: error.message,
          variant: "destructive",
        });
      } else {
        await recordSuccessfulAttempt();
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to home */}
        <a 
          href="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("auth", "backToHome", language)}
        </a>

        <Card className="border-border/50 shadow-2xl">
          <CardHeader className="text-center pb-2">
            {/* Logo */}
            <a href="/" className="flex items-center justify-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
                <Mic2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl tracking-tight">{BRAND.name}</span>
            </a>
            
            <CardTitle className="text-2xl font-bold">
              {isLogin ? t("auth", "login", language) : t("auth", "createAccount", language)}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? t("auth", "loginSubtitle", language) 
                : t("auth", "signupSubtitle", language)}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Registration Disabled Warning */}
            {registrationDisabled && (
              <Alert className="mb-4 bg-amber-500/10 border-amber-500/30">
                <UserX className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700">
                  {systemSettings.registrationDisabledMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* Lockout Warning */}
            {isLocked && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {t("auth", "accountLockedMessage", language).replace("{seconds}", String(lockoutSeconds))}
                </AlertDescription>
              </Alert>
            )}

            {/* Interactive Captcha (shown after failed attempts) */}
            {requiresInteractiveCaptcha && !isLocked && (
              <div className="mb-4">
                <p className="text-sm text-muted-foreground text-center mb-2">
                  {t("auth", "verifyCaptcha", language)}
                </p>
                <InteractiveCaptcha
                  onVerify={handleCaptchaVerify}
                  onExpire={handleCaptchaExpire}
                />
                {captchaToken && (
                  <p className="text-sm text-green-600 text-center">
                    ✓ {t("auth", "captchaVerified", language)}
                  </p>
                )}
              </div>
            )}

            {/* Google Sign In Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full mb-4"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLocked || registrationDisabled || (requiresInteractiveCaptcha && !captchaToken)}
            >
              {isGoogleLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              {t("auth", "continueWithGoogle", language)}
            </Button>

            <div className="relative my-4">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                {t("common", "or", language)}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder={t("auth", "yourName", language)}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>
              )}

              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder={t("auth", "yourEmail", language)}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder={t("auth", "yourPassword", language)}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}

                {/* Forgot password link - only show on login */}
                {isLogin && (
                  <div className="text-right">
                    <Link
                      to="/auth/forgot-password"
                      className="text-sm text-accent hover:underline"
                    >
                      {t("auth", "forgotPassword", language)}
                    </Link>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                variant="accent"
                className="w-full"
                disabled={isLoading || isLocked || registrationDisabled || (requiresInteractiveCaptcha && !captchaToken)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isLogin ? t("auth", "loggingIn", language) : t("auth", "creatingAccount", language)}
                  </>
                ) : (
                  isLogin ? t("auth", "login", language) : t("auth", "createAccount", language)
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {isLogin ? t("auth", "noAccount", language) : t("auth", "hasAccount", language)}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setErrors({});
                  }}
                  className="ml-1 text-accent hover:underline font-medium"
                >
                  {isLogin ? t("auth", "createAccount", language) : t("auth", "login", language)}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
