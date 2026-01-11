import { useState, useEffect } from "react";
import { Mic2 } from "lucide-react";
import { BRAND } from "@/lib/constants";
import { useLanguage, LANGUAGES } from "@/hooks/useLanguage";
import { t } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";

interface SocialLink {
  name: string;
  href: string;
  enabled: boolean;
}

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { language, setLanguage } = useLanguage();
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  // Fetch social links from database
  useEffect(() => {
    const fetchSocialLinks = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'social_links')
        .maybeSingle();

      if (data?.value) {
        try {
          const links = JSON.parse(data.value);
          setSocialLinks(links.filter((link: SocialLink) => link.enabled && link.href));
        } catch {
          // Fallback to default
          setSocialLinks([{ name: "Instagram", href: "https://instagram.com/audisell", enabled: true }]);
        }
      } else {
        // Default if not configured
        setSocialLinks([{ name: "Instagram", href: "https://instagram.com/audisell", enabled: true }]);
      }
    };

    fetchSocialLinks();
  }, []);

  const links = {
    product: [
      { name: t("nav", "features", language), href: "#features" },
      { name: t("nav", "pricing", language), href: "#pricing" },
      { name: t("nav", "faq", language), href: "#faq" },
    ],
    legal: [
      { name: t("footer", "terms", language), href: "/terms" },
      { name: t("footer", "privacy", language), href: "/privacy" },
    ],
  };

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <Mic2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">{BRAND.name}</span>
            </a>
            <p className="text-sm text-muted-foreground mb-4">{t("brand", "tagline", language)}</p>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as typeof language)}
              className="text-sm bg-secondary border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>{lang.flag} {lang.name}</option>
              ))}
            </select>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t("footer", "product", language)}</h3>
            <ul className="space-y-3">
              {links.product.map((link) => (
                <li key={link.name}><a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link.name}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{t("footer", "legal", language)}</h3>
            <ul className="space-y-3">
              {links.legal.map((link) => (
                <li key={link.name}><a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link.name}</a></li>
              ))}
            </ul>
          </div>

          {socialLinks.length > 0 && (
            <div>
              <h3 className="font-semibold mb-4">{t("footer", "social", language)}</h3>
              <ul className="space-y-3">
                {socialLinks.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© {currentYear} {BRAND.name}. {t("footer", "allRightsReserved", language)}</p>
          <p className="text-sm text-muted-foreground">{t("footer", "madeWith", language)}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
