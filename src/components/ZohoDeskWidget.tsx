import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

// Zoho Desk ASAP Widget Configuration
// Get these values from: Zoho Desk > Setup > Channels > ASAP > Web
interface ZohoDeskConfig {
  orgId: string;          // Organization ID from Zoho
  widgetCode: string;     // Widget embed code/key
}

// TODO: Replace with your actual Zoho Desk credentials
const ZOHO_CONFIG: ZohoDeskConfig = {
  orgId: "YOUR_ORG_ID",           // Ex: "12345678"
  widgetCode: "YOUR_WIDGET_CODE", // Ex: "abc123xyz"
};

declare global {
  interface Window {
    ZohoHCAsap?: any;
    ZohoHCAsapSettings?: any;
    ZohoHCAsapReady?: (callback: () => void) => void;
  }
}

const ZohoDeskWidget = () => {
  const { user } = useAuth();

  useEffect(() => {
    // Only load for authenticated users
    if (!user) return;

    // Skip if already loaded
    if (window.ZohoHCAsap) return;

    // Configure Zoho settings before loading
    window.ZohoHCAsapSettings = {
      hideLauncherIcon: false,
      ticketsSettings: {
        preFillFields: {
          email: { defaultValue: user.email || "" },
          contactName: { defaultValue: user.user_metadata?.name || "" },
        },
      },
      // Optional: customize appearance
      // floatButtonTheme: "light",
      // position: "right", // or "left"
    };

    // Create and inject the Zoho Desk script
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.defer = true;
    script.src = `https://desk.zoho.com/portal/api/web/inapp/${ZOHO_CONFIG.widgetCode}?orgId=${ZOHO_CONFIG.orgId}`;
    script.id = "zoho-desk-asap";

    script.onload = () => {
      // Zoho is ready
      if (window.ZohoHCAsapReady) {
        window.ZohoHCAsapReady(() => {
          // You can customize the widget after it loads
          // window.ZohoHCAsap.Action("open"); // Auto-open if needed
        });
      }
    };

    document.body.appendChild(script);

    // Cleanup on unmount
    return () => {
      const existingScript = document.getElementById("zoho-desk-asap");
      if (existingScript) {
        existingScript.remove();
      }
      // Clean up Zoho global objects
      delete window.ZohoHCAsap;
      delete window.ZohoHCAsapSettings;
      delete window.ZohoHCAsapReady;
    };
  }, [user]);

  // This component doesn't render anything - Zoho creates its own UI
  return null;
};

export default ZohoDeskWidget;
