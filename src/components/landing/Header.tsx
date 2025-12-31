import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Mic2, User, LogOut, Settings, LayoutDashboard } from "lucide-react";
import { BRAND } from "@/lib/constants";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const getInitials = (email?: string, name?: string) => {
    if (name) {
      const parts = name.split(" ");
      return parts.length > 1 
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0][0].toUpperCase();
    }
    return email?.[0]?.toUpperCase() || "U";
  };

  const navigation = [
    { name: t("nav", "features", language), href: "#features" },
    { name: t("nav", "pricing", language), href: "#pricing" },
    { name: t("nav", "faq", language), href: "#faq" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto">
        <nav className="flex items-center justify-between h-16 md:h-20">
          <a href="/" className="flex items-center gap-2 group">
            <div className="relative w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <Mic2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">{BRAND.name}</span>
          </a>

          <div className="hidden md:flex items-center gap-8">
            {navigation.map((item) => (
              <a key={item.name} href={item.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {item.name}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || ""} />
                      <AvatarFallback className="bg-accent text-accent-foreground">
                        {getInitials(user.email, user.user_metadata?.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user.user_metadata?.name || user.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a href="/dashboard" className="cursor-pointer">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href="/settings/profile" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      {t("nav", "settings", language)}
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("nav", "logout", language)}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <a href="/auth">{t("nav", "login", language)}</a>
                </Button>
                <Button variant="accent" size="sm" asChild>
                  <a href="/auth">{t("nav", "startFree", language)}</a>
                </Button>
              </>
            )}
          </div>

          <button className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>

        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-2">
              {navigation.map((item) => (
                <a key={item.name} href={item.href} className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors" onClick={() => setIsMenuOpen(false)}>
                  {item.name}
                </a>
              ))}
              <div className="flex flex-col gap-2 mt-4 px-4">
                {user ? (
                  <>
                    <Button variant="outline" className="w-full" asChild>
                      <a href="/dashboard">Dashboard</a>
                    </Button>
                    <Button variant="ghost" className="w-full" onClick={handleLogout}>
                      {t("nav", "logout", language)}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="w-full" asChild>
                      <a href="/auth">{t("nav", "login", language)}</a>
                    </Button>
                    <Button variant="accent" className="w-full" asChild>
                      <a href="/auth">{t("nav", "startFree", language)}</a>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
