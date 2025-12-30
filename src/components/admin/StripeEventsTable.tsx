import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { formatLocalizedDate } from "@/lib/localization";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Clock } from "lucide-react";

interface StripeEvent {
  id: string;
  event_id: string;
  event_type: string;
  processed: boolean | null;
  created_at: string;
  data: unknown;
}

export default function StripeEventsTable() {
  const { language } = useLanguage();
  const [events, setEvents] = useState<StripeEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from("stripe_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        setEvents(data || []);
      } catch (error) {
        console.error("Error fetching Stripe events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const getEventTypeBadge = (type: string) => {
    const isCheckout = type.includes("checkout");
    const isSubscription = type.includes("subscription");
    const isInvoice = type.includes("invoice");
    
    let variant: "default" | "secondary" | "outline" = "outline";
    if (isCheckout) variant = "default";
    if (isSubscription) variant = "secondary";
    if (isInvoice) variant = "outline";
    
    return <Badge variant={variant} className="text-xs">{type.replace(/^customer\./, "").replace(/^checkout\.session\./, "")}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {language === "pt-BR" ? "Eventos Stripe" : language === "es" ? "Eventos Stripe" : "Stripe Events"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === "pt-BR" ? "Tipo" : language === "es" ? "Tipo" : "Type"}</TableHead>
                <TableHead>Event ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>{language === "pt-BR" ? "Data" : language === "es" ? "Fecha" : "Date"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{getEventTypeBadge(event.event_type)}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground max-w-[150px] truncate">
                    {event.event_id}
                  </TableCell>
                  <TableCell>
                    {event.processed ? (
                      <span className="flex items-center gap-1 text-green-500 text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        {language === "pt-BR" ? "Processado" : language === "es" ? "Procesado" : "Processed"}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-500 text-sm">
                        <Clock className="w-4 h-4" />
                        {language === "pt-BR" ? "Pendente" : language === "es" ? "Pendiente" : "Pending"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatLocalizedDate(event.created_at, language, "withTime")}
                  </TableCell>
                </TableRow>
              ))}
              {events.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    {language === "pt-BR" ? "Nenhum evento encontrado" : language === "es" ? "No se encontraron eventos" : "No events found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
