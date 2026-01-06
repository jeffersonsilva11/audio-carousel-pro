import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "carousel_ready" | "subscription_cancelled" | "payment_failed" | "plan_downgraded";
  read: boolean;
  createdAt: Date;
  link?: string;
  isFromServer?: boolean; // Distinguishes server notifications from client-side ones
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  addNotification: (notification: Omit<Notification, "id" | "read" | "createdAt">) => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Function to fetch server notifications
  const fetchServerNotifications = async () => {
    if (!user) return;

    try {
      // Get user's preferred language
      const { data: profile } = await supabase
        .from("profiles")
        .select("preferred_lang")
        .eq("user_id", user.id)
        .single();

      const lang = profile?.preferred_lang || "pt-BR";

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        // Silently handle if table doesn't exist yet
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
          return;
        }
        console.error("Error fetching notifications:", error);
        return;
      }

      if (data) {
        const serverNotifications: Notification[] = data.map((n: any) => {
          // Get localized title and message
          let title = n.title_pt;
          let message = n.message_pt;

          if (lang === "en" && n.title_en) {
            title = n.title_en;
            message = n.message_en || n.message_pt;
          } else if (lang === "es" && n.title_es) {
            title = n.title_es;
            message = n.message_es || n.message_pt;
          }

          return {
            id: n.id,
            title,
            message,
            type: n.type as Notification["type"],
            read: n.is_read,
            createdAt: new Date(n.created_at),
            link: n.action_url,
            isFromServer: true,
          };
        });

        // Merge with client-side notifications, keeping server notifications separate
        setNotifications(prev => {
          const clientNotifications = prev.filter(n => !n.isFromServer);
          return [...serverNotifications, ...clientNotifications].slice(0, 100);
        });
      }
    } catch (error) {
      // Silently handle errors (table might not exist yet)
      console.error("Error in fetchServerNotifications:", error);
    }
  };

  // Fetch server notifications on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchServerNotifications();
    }
  }, [user]);

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
        .maybeSingle();

      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("daily_limit")
        .eq("user_id", user.id)
        .maybeSingle();

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
  };

  const markAsRead = async (id: string) => {
    const notification = notifications.find(n => n.id === id);

    // Update server notification
    if (notification?.isFromServer) {
      await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", id);
    }

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    // Update all server notifications
    if (user) {
      await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("is_read", false);
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotification = async (id: string) => {
    const notification = notifications.find(n => n.id === id);

    // Delete server notification
    if (notification?.isFromServer) {
      await supabase
        .from("notifications")
        .delete()
        .eq("id", id);
    }

    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const refreshNotifications = async () => {
    await fetchServerNotifications();
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
        refreshNotifications,
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
