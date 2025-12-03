import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Archive, Bell, Calendar, Car, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: any;
  status: string;
  created_at: string;
  read_at: string | null;
  archived_at?: string | null;
  user_id: string;
}

interface NotificationListProps {
  onUpdate?: () => void;
}

export const NotificationList = ({ onUpdate }: NotificationListProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Error loading notifications:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las notificaciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ status: "read", read_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      loadNotifications();
      onUpdate?.();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const archiveNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ status: "archived", archived_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      loadNotifications();
      onUpdate?.();
      toast({
        title: "Notificación archivada",
      });
    } catch (error) {
      console.error("Error archiving notification:", error);
    }
  };

  const getIcon = (type: string) => {
    if (type.includes("reserva")) return <Calendar className="h-4 w-4" />;
    if (type.includes("vehiculo")) return <Car className="h-4 w-4" />;
    if (type.includes("pago")) return <CreditCard className="h-4 w-4" />;
    return <Bell className="h-4 w-4" />;
  };

  const getTypeColor = (type: string) => {
    if (type.includes("expirada") || type.includes("cancelada")) return "destructive";
    if (type.includes("pagada") || type.includes("confirmada")) return "default";
    return "secondary";
  };

  const renderNotification = (notification: Notification) => (
    <div
      key={notification.id}
      className={`p-4 border-b last:border-b-0 ${
        notification.status === "unread" ? "bg-muted/30" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1">{getIcon(notification.type)}</div>
        <div className="flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm">{notification.title}</h4>
            <Badge variant={getTypeColor(notification.type)} className="text-xs">
              {notification.type.replace(/_/g, " ")}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{notification.message}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: es,
            })}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          {notification.status === "unread" && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => markAsRead(notification.id)}
              className="h-8 w-8"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => archiveNotification(notification.id)}
            className="h-8 w-8"
          >
            <Archive className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  const unreadNotifications = notifications.filter((n) => n.status === "unread");
  const readNotifications = notifications.filter((n) => n.status === "read");
  const archivedNotifications = notifications.filter((n) => n.status === "archived");

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Cargando...</div>;
  }

  return (
    <Tabs defaultValue="unread" className="mt-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="unread">
          No leídas {unreadNotifications.length > 0 && `(${unreadNotifications.length})`}
        </TabsTrigger>
        <TabsTrigger value="read">Leídas</TabsTrigger>
        <TabsTrigger value="archived">Archivadas</TabsTrigger>
      </TabsList>

      <TabsContent value="unread">
        <ScrollArea className="h-[600px]">
          {unreadNotifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No hay notificaciones sin leer
            </div>
          ) : (
            unreadNotifications.map(renderNotification)
          )}
        </ScrollArea>
      </TabsContent>

      <TabsContent value="read">
        <ScrollArea className="h-[600px]">
          {readNotifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No hay notificaciones leídas
            </div>
          ) : (
            readNotifications.map(renderNotification)
          )}
        </ScrollArea>
      </TabsContent>

      <TabsContent value="archived">
        <ScrollArea className="h-[600px]">
          {archivedNotifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No hay notificaciones archivadas
            </div>
          ) : (
            archivedNotifications.map(renderNotification)
          )}
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );
};
