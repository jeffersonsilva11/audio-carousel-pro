import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

interface SignOutConfirmDialogProps {
  onSignOut: () => Promise<void>;
  trigger?: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  className?: string;
}

const SignOutConfirmDialog = ({
  onSignOut,
  trigger,
  variant = "ghost",
  size = "sm",
  showIcon = true,
  className,
}: SignOutConfirmDialogProps) => {
  const { language } = useLanguage();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [open, setOpen] = useState(false);

  const translations = {
    title: {
      "pt-BR": "Sair da conta",
      en: "Sign out",
      es: "Cerrar sesión",
    },
    description: {
      "pt-BR": "Tem certeza que deseja sair? Você precisará fazer login novamente para acessar sua conta.",
      en: "Are you sure you want to sign out? You will need to log in again to access your account.",
      es: "¿Estás seguro de que quieres cerrar sesión? Necesitarás iniciar sesión de nuevo para acceder a tu cuenta.",
    },
    cancel: {
      "pt-BR": "Cancelar",
      en: "Cancel",
      es: "Cancelar",
    },
    confirm: {
      "pt-BR": "Sim, sair",
      en: "Yes, sign out",
      es: "Sí, cerrar sesión",
    },
    signingOut: {
      "pt-BR": "Saindo...",
      en: "Signing out...",
      es: "Cerrando sesión...",
    },
    logout: {
      "pt-BR": "Sair",
      en: "Sign out",
      es: "Cerrar sesión",
    },
  };

  const t = (key: keyof typeof translations) => {
    return translations[key][language as keyof typeof translations.title] || translations[key].en;
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await onSignOut();
    } finally {
      setIsSigningOut(false);
      setOpen(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger || (
          <Button variant={variant} size={size} className={className}>
            {showIcon && <LogOut className="w-4 h-4 mr-2" />}
            {t("logout")}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <LogOut className="w-5 h-5 text-destructive" />
            {t("title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSigningOut}>
            {t("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isSigningOut ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("signingOut")}
              </>
            ) : (
              t("confirm")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SignOutConfirmDialog;
