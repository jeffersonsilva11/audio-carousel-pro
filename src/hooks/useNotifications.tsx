import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "carousel_ready";
  read: boolean;
  createdAt: Date;
  link?: string;
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  addNotification: (notification: Omit<Notification, "id" | "read" | "createdAt">) => void;
  requestPermission: () => Promise<boolean>;
  hasPermission: boolean;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

// Request browser notification permission
async function requestBrowserPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    return false;
  }
  
  if (Notification.permission === "granted") {
    return true;
  }
  
  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  
  return false;
}

// Show browser notification
function showBrowserNotification(title: string, body: string, icon?: string) {
  if (Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon: icon || "/favicon.ico",
      badge: "/favicon.ico",
    });
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasPermission, setHasPermission] = useState(false);

  // Check permission on mount
  useEffect(() => {
    if ("Notification" in window) {
      setHasPermission(Notification.permission === "granted");
    }
  }, []);

  // Listen for carousel completion
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("carousel-notifications")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "carousels",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const carousel = payload.new as { status: string; id: string };
          
          if (carousel.status === "COMPLETED") {
            addNotification({
              title: "Carrossel pronto! 🎉",
              message: "Seu carrossel foi gerado com sucesso.",
              type: "carousel_ready",
              link: `/carousel/${carousel.id}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Check daily limit warning
  useEffect(() => {
    if (!user) return;

    const checkDailyLimit = async () => {
      const today = new Date().toISOString().split("T")[0];
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("daily_carousels_used, plan_tier")
        .eq("user_id", user.id)
        .single();
      
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("daily_limit")
        .eq("user_id", user.id)
        .single();

      if (profile && subscription) {
        const used = profile.daily_carousels_used || 0;
        const limit = subscription.daily_limit || 1;
        
        // Warn when 80% of limit reached
        if (used >= Math.floor(limit * 0.8) && used < limit) {
          const remaining = limit - used;
          addNotification({
            title: "Limite diário quase atingido",
            message: `Você ainda pode criar ${remaining} carrossel(s) hoje.`,
            type: "warning",
          });
        }
      }
    };

    // Check on mount and every 5 minutes
    checkDailyLimit();
    const interval = setInterval(checkDailyLimit, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = (notification: Omit<Notification, "id" | "read" | "createdAt">) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      read: false,
      createdAt: new Date(),
    };

    setNotifications((prev) => [newNotification, ...prev].slice(0, 50)); // Keep max 50

    // Show browser notification if permitted
    if (hasPermission) {
      showBrowserNotification(notification.title, notification.message);
    }
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const requestPermission = async () => {
    const granted = await requestBrowserPermission();
    setHasPermission(granted);
    return granted;
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotification,
        addNotification,
        requestPermission,
        hasPermission,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return context;
}
