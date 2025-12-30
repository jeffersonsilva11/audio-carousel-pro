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
import { Loader2 } from "lucide-react";

interface UsageLog {
  id: string;
  user_id: string | null;
  action: string;
  resource: string | null;
  status: string | null;
  ip_address: string | null;
  created_at: string;
  metadata: unknown;
}

export default function UsageLogsTable() {
  const { language } = useLanguage();
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data, error } = await supabase
          .from("usage_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;
        setLogs(data || []);
      } catch (error) {
        console.error("Error fetching usage logs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const getActionBadge = (action: string) => {
    const actionConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      login: { variant: "default", label: "Login" },
      login_attempt: { variant: "outline", label: "Login Attempt" },
      signup: { variant: "default", label: "Signup" },
      carousel_created: { variant: "secondary", label: "Carousel" },
      checkout: { variant: "default", label: "Checkout" },
      transcribe: { variant: "outline", label: "Transcribe" },
      generate_script: { variant: "outline", label: "Script" },
      generate_images: { variant: "outline", label: "Images" },
    };
    const config = actionConfig[action] || { variant: "outline" as const, label: action };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    const isSuccess = status === "success";
    return (
      <Badge variant={isSuccess ? "outline" : "destructive"} className={isSuccess ? "text-green-500 border-green-500/30" : ""}>
        {status}
      </Badge>
    );
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
          {language === "pt-BR" ? "Logs de uso" : language === "es" ? "Registros de uso" : "Usage logs"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === "pt-BR" ? "Ação" : language === "es" ? "Acción" : "Action"}</TableHead>
                <TableHead>{language === "pt-BR" ? "Recurso" : language === "es" ? "Recurso" : "Resource"}</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>{language === "pt-BR" ? "Data" : language === "es" ? "Fecha" : "Date"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{getActionBadge(log.action)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.resource || "—"}
                  </TableCell>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {log.ip_address || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatLocalizedDate(log.created_at, language, "withTime")}
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {language === "pt-BR" ? "Nenhum log encontrado" : language === "es" ? "No se encontraron registros" : "No logs found"}
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
