import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic2, ArrowLeft, Loader2, Mail, CheckCircle2, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BRAND } from "@/lib/constants";
import { z } from "zod";

const ForgotPassword = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailSchema = z.string().email("Por favor, insira um email válido.");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate email
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    try {
      // Call custom password reset function that sends OTP via SMTP
      const response = await supabase.functions.invoke("request-password-reset", {
        body: { email },
      });

      if (response.error) {
        const errorMessage = response.error.message || "Erro ao enviar email";

        if (errorMessage.includes("rate limit") || errorMessage.includes("muitas solicitações")) {
          toast({
            title: "Muitas tentativas",
            description: "Aguarde alguns minutos antes de tentar novamente.",
            variant: "destructive",
          });
        } else {
          // Show success even if email doesn't exist (security best practice)
          setEmailSent(true);
        }
      } else {
        setEmailSent(true);
        toast({
          title: "Código enviado!",
          description: "Verifique sua caixa de entrada para o código de recuperação.",
        });
      }
    } catch (err) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao enviar o email. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para login
          </Link>

          <Card className="border-border/50 shadow-2xl">
            <CardContent className="pt-12 pb-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Código Enviado!</h2>
              <p className="text-muted-foreground mb-2">
                Se existe uma conta com o email
              </p>
              <p className="font-medium text-foreground mb-4">{email}</p>
              <p className="text-muted-foreground mb-6">
                você receberá um código de 6 dígitos para redefinir sua senha.
              </p>

              <div className="p-4 bg-muted/50 rounded-lg mb-6">
                <p className="text-sm text-muted-foreground">
                  💡 Verifique também a pasta de spam. O código expira em 1 hora.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  variant="accent"
                  className="w-full"
                  onClick={() => navigate(`/auth/reset-password?email=${encodeURIComponent(email)}`)}
                >
                  Inserir código de verificação
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setEmailSent(false)}
                >
                  Enviar para outro email
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate("/auth")}
                >
                  Voltar para login
                </Button>
              </div>
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
              Esqueceu a senha?
            </CardTitle>
            <CardDescription>
              Digite seu email para receber um código de recuperação
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Seu email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    className="pl-10"
                    required
                    autoFocus
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
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
                    Enviando...
                  </>
                ) : (
                  "Enviar código de recuperação"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Lembrou a senha?{" "}
                <Link
                  to="/auth"
                  className="text-accent hover:underline font-medium"
                >
                  Fazer login
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
