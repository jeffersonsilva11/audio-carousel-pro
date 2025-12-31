import { useState } from "react";
import { Bell, Check, Trash2, X, Sparkles, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { useLanguage } from "@/hooks/useLanguage";
import { formatDistanceToNow } from "date-fns";
import { ptBR, es, enUS } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification, requestPermission, hasPermission } = useNotifications();
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const getLocale = () => {
    switch (language) {
      case "pt-BR": return ptBR;
      case "es": return es;
      default: return enUS;
    }
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "carousel_ready": return <Sparkles className="w-4 h-4 text-accent" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-warning" />;
      case "success": return <Check className="w-4 h-4 text-success" />;
      default: return <Info className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs font-bold rounded-full flex items-center justify-center"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold">
            {language === "pt-BR" ? "Notificações" : language === "es" ? "Notificaciones" : "Notifications"}
          </h3>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              {language === "pt-BR" ? "Marcar todas como lidas" : language === "es" ? "Marcar todas como leídas" : "Mark all as read"}
            </Button>
          )}
        </div>

        {/* Permission Banner */}
        {!hasPermission && (
          <div className="p-3 bg-accent/10 border-b border-border">
            <p className="text-xs text-muted-foreground mb-2">
              {language === "pt-BR" 
                ? "Ative as notificações para saber quando seu carrossel estiver pronto."
                : language === "es"
                ? "Activa las notificaciones para saber cuando tu carrusel esté listo."
                : "Enable notifications to know when your carousel is ready."}
            </p>
            <Button
              size="sm"
              variant="accent"
              className="w-full"
              onClick={requestPermission}
            >
              <Bell className="w-3 h-3 mr-1" />
              {language === "pt-BR" ? "Ativar" : language === "es" ? "Activar" : "Enable"}
            </Button>
          </div>
        )}

        <ScrollArea className="max-h-80">
          <AnimatePresence mode="popLayout">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {language === "pt-BR" 
                    ? "Nenhuma notificação ainda"
                    : language === "es"
                    ? "Aún no hay notificaciones"
                    : "No notifications yet"}
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`p-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 transition-colors ${
                    !notification.read ? "bg-accent/5" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(notification.createdAt, { addSuffix: true, locale: getLocale() })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearNotification(notification.id);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
