import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic2, ArrowLeft, Loader2, Lock, CheckCircle2, Eye, EyeOff, AlertCircle, Mail, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BRAND } from "@/lib/constants";
import { z } from "zod";
import { cn } from "@/lib/utils";

const ResetPassword = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Get email from URL params
  const emailFromParams = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailFromParams);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; otp?: string; password?: string; confirmPassword?: string }>({});

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const passwordSchema = z.string()
    .min(8, "A senha deve ter no mínimo 8 caracteres")
    .regex(/[A-Z]/, "A senha deve conter ao menos uma letra maiúscula")
    .regex(/[a-z]/, "A senha deve conter ao menos uma letra minúscula")
    .regex(/[0-9]/, "A senha deve conter ao menos um número");

  const emailSchema = z.string().email("Por favor, insira um email válido.");

  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setErrors({ ...errors, otp: undefined });

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace on OTP input
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste on OTP input
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData) {
      const newOtp = [...otp];
      for (let i = 0; i < pastedData.length; i++) {
        newOtp[i] = pastedData[i];
      }
      setOtp(newOtp);
      // Focus the next empty input or the last one
      const nextEmpty = newOtp.findIndex(v => !v);
      if (nextEmpty !== -1) {
        otpInputRefs.current[nextEmpty]?.focus();
      } else {
        otpInputRefs.current[5]?.focus();
      }
    }
  };

  // Password strength indicator
  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score: 1, label: "Fraca", color: "bg-red-500" };
    if (score <= 4) return { score: 2, label: "Média", color: "bg-yellow-500" };
    return { score: 3, label: "Forte", color: "bg-green-500" };
  };

  const passwordStrength = getPasswordStrength(password);

  const validateForm = () => {
    const newErrors: { email?: string; otp?: string; password?: string; confirmPassword?: string } = {};

    // Validate email
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    // Validate OTP
    const otpValue = otp.join("");
    if (otpValue.length !== 6) {
      newErrors.otp = "Digite o código completo de 6 dígitos";
    }

    // Validate password
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    // Validate password match
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "As senhas não coincidem";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const otpValue = otp.join("");

      // Call verify-reset-token edge function
      const response = await supabase.functions.invoke("verify-reset-token", {
        body: {
          email,
          token: otpValue,
          newPassword: password,
        },
      });

      if (response.error) {
        const errorData = response.error;
        toast({
          title: "Erro ao alterar senha",
          description: errorData.message || "Código inválido ou expirado. Tente novamente.",
          variant: "destructive",
        });
        setErrors({ otp: "Código inválido ou expirado" });
      } else if (response.data?.error) {
        toast({
          title: "Erro ao alterar senha",
          description: response.data.error,
          variant: "destructive",
        });
        setErrors({ otp: response.data.error });
      } else {
        setIsSuccess(true);
        toast({
          title: "Senha alterada!",
          description: "Sua senha foi atualizada com sucesso.",
        });

        // Redirect to login
        setTimeout(() => {
          navigate("/auth");
        }, 3000);
      }
    } catch (err) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao alterar a senha. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-border/50 shadow-2xl">
            <CardContent className="pt-12 pb-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Senha Alterada!</h2>
              <p className="text-muted-foreground mb-6">
                Sua senha foi atualizada com sucesso. Redirecionando para o login...
              </p>
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-accent" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to auth */}
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para login
        </Link>

        <Card className="border-border/50 shadow-2xl">
          <CardHeader className="text-center pb-2">
            {/* Logo */}
            <Link to="/" className="flex items-center justify-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
                <Mic2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl tracking-tight">{BRAND.name}</span>
            </Link>

            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
              <KeyRound className="w-8 h-8 text-accent" />
            </div>

            <CardTitle className="text-2xl font-bold">
              Redefinir Senha
            </CardTitle>
            <CardDescription>
              Digite o código enviado para seu email e crie uma nova senha
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Seu email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrors({ ...errors, email: undefined });
                    }}
                    className="pl-10"
                    required
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              {/* OTP Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Código de verificação</label>
                <div className="flex gap-2 justify-center">
                  {otp.map((digit, index) => (
                    <Input
                      key={index}
                      ref={el => otpInputRefs.current[index] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={index === 0 ? handleOtpPaste : undefined}
                      className={cn(
                        "w-12 h-12 text-center text-xl font-bold",
                        errors.otp && "border-destructive"
                      )}
                    />
                  ))}
                </div>
                {errors.otp && <p className="text-sm text-destructive text-center">{errors.otp}</p>}
                <p className="text-xs text-muted-foreground text-center">
                  Digite o código de 6 dígitos enviado para seu email
                </p>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Nova senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Nova senha"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrors({ ...errors, password: undefined });
                    }}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength indicator */}
                {password && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3].map((level) => (
                        <div
                          key={level}
                          className={cn(
                            "h-1 flex-1 rounded-full transition-colors",
                            passwordStrength.score >= level
                              ? passwordStrength.color
                              : "bg-muted"
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Força: <span className={cn(
                        passwordStrength.score === 1 && "text-red-500",
                        passwordStrength.score === 2 && "text-yellow-500",
                        passwordStrength.score === 3 && "text-green-500"
                      )}>{passwordStrength.label}</span>
                    </p>
                  </div>
                )}

                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirme a nova senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirme a nova senha"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setErrors({ ...errors, confirmPassword: undefined });
                    }}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}

                {/* Match indicator */}
                {confirmPassword && password === confirmPassword && (
                  <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Senhas coincidem
                  </p>
                )}
              </div>

              {/* Password requirements */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium mb-2">Requisitos da senha:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className={cn(password.length >= 8 && "text-green-600 dark:text-green-400")}>
                    • Mínimo 8 caracteres
                  </li>
                  <li className={cn(/[A-Z]/.test(password) && "text-green-600 dark:text-green-400")}>
                    • Uma letra maiúscula
                  </li>
                  <li className={cn(/[a-z]/.test(password) && "text-green-600 dark:text-green-400")}>
                    • Uma letra minúscula
                  </li>
                  <li className={cn(/[0-9]/.test(password) && "text-green-600 dark:text-green-400")}>
                    • Um número
                  </li>
                </ul>
              </div>

              <Button
                type="submit"
                className="w-full"
                variant="accent"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Alterando senha...
                  </>
                ) : (
                  "Alterar Senha"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Não recebeu o código?{" "}
                <Link
                  to="/auth/forgot-password"
                  className="text-accent hover:underline font-medium"
                >
                  Solicitar novo código
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
