import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Send,
  Bell,
  Mail,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  Info,
  RefreshCw,
  Eye,
  XCircle,
  RotateCcw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PlanCount {
  plan_id: string;
  plan_name: string;
  user_count: number;
}

interface BroadcastJob {
  id: string;
  type: "notification" | "email";
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  target_plans: string[];
  target_all_users: boolean;
  total_recipients: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  created_at: string;
  completed_at: string | null;
  notification_title_pt?: string;
  email_subject_pt?: string;
}

interface FailedRecipient {
  id: string;
  email: string;
  error_message: string | null;
  created_at: string;
}

// Character limits
const LIMITS = {
  notificationTitle: 100,
  notificationMessage: 500,
  emailSubject: 150,
  emailTitle: 200,
  emailContent: 5000,
};

// Polling interval for real-time updates (5 seconds)
const POLLING_INTERVAL = 5000;

const BroadcastManager = () => {
  const [activeTab, setActiveTab] = useState<"notifications" | "email">("notifications");
  const [planCounts, setPlanCounts] = useState<PlanCount[]>([]);
  const [recentJobs, setRecentJobs] = useState<BroadcastJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);

  // Failed recipients state
  const [failedRecipientsDialog, setFailedRecipientsDialog] = useState(false);
  const [selectedJobForFailures, setSelectedJobForFailures] = useState<BroadcastJob | null>(null);
  const [failedRecipients, setFailedRecipients] = useState<FailedRecipient[]>([]);
  const [loadingFailures, setLoadingFailures] = useState(false);

  // Reprocessing state
  const [reprocessingJobId, setReprocessingJobId] = useState<string | null>(null);

  // Polling ref for cleanup
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Notification form state
  const [notifForm, setNotifForm] = useState({
    titlePt: "",
    titleEn: "",
    titleEs: "",
    messagePt: "",
    messageEn: "",
    messageEs: "",
    actionUrl: "",
    selectedPlans: [] as string[],
    allUsers: false,
  });

  // Email form state
  const [emailForm, setEmailForm] = useState({
    subjectPt: "",
    subjectEn: "",
    subjectEs: "",
    titlePt: "",
    titleEn: "",
    titleEs: "",
    contentPt: "",
    contentEn: "",
    contentEs: "",
    ctaText: "",
    ctaUrl: "",
    selectedPlans: [] as string[],
    allUsers: false,
  });

  const { toast } = useToast();

  // Fetch jobs data (used for initial load and polling)
  const fetchJobs = useCallback(async () => {
    const { data: jobs } = await supabase
      .from("broadcast_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    setRecentJobs(jobs || []);
    return jobs || [];
  }, []);

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch user counts by plan
        const { data: counts, error: countsError } = await supabase.rpc("get_users_count_by_plan");

        if (countsError) {
          // If function doesn't exist yet, use fallback query
          const { data: users } = await supabase.from("profiles").select("id");
          setPlanCounts([{ plan_id: "all", plan_name: "Todos", user_count: users?.length || 0 }]);
        } else {
          setPlanCounts(counts || []);
        }

        // Fetch recent broadcast jobs
        await fetchJobs();
      } catch (error) {
        console.error("Error fetching broadcast data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [fetchJobs]);

  // Polling for real-time job updates
  useEffect(() => {
    const hasActiveJobs = recentJobs.some(
      (job) => job.status === "processing" || job.status === "pending"
    );

    if (hasActiveJobs) {
      // Start polling if there are active jobs
      pollingRef.current = setInterval(() => {
        fetchJobs();
      }, POLLING_INTERVAL);
    } else if (pollingRef.current) {
      // Stop polling if no active jobs
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [recentJobs, fetchJobs]);

  // Fetch failed recipients for a job
  const fetchFailedRecipients = async (jobId: string) => {
    setLoadingFailures(true);
    try {
      const { data, error } = await supabase
        .from("broadcast_recipients")
        .select("id, email, error_message, created_at")
        .eq("job_id", jobId)
        .eq("status", "failed")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setFailedRecipients(data || []);
    } catch (error) {
      console.error("Error fetching failed recipients:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os destinatários que falharam.",
        variant: "destructive",
      });
    } finally {
      setLoadingFailures(false);
    }
  };

  // Open failed recipients dialog
  const handleViewFailures = async (job: BroadcastJob) => {
    setSelectedJobForFailures(job);
    setFailedRecipientsDialog(true);
    await fetchFailedRecipients(job.id);
  };

  // Reprocess failed recipients for a job
  const handleReprocessFailed = async (jobId: string) => {
    setReprocessingJobId(jobId);
    try {
      // Reset failed recipients to pending
      const { error: resetError } = await supabase
        .from("broadcast_recipients")
        .update({ status: "pending", error_message: null })
        .eq("job_id", jobId)
        .eq("status", "failed");

      if (resetError) throw resetError;

      // Update job status to processing
      const { error: jobError } = await supabase
        .from("broadcast_jobs")
        .update({ status: "processing" })
        .eq("id", jobId);

      if (jobError) throw jobError;

      // Trigger processing via edge function
      const { error: processError } = await supabase.functions.invoke("process-broadcast", {
        body: { jobId },
      });

      if (processError) {
        console.error("Process error:", processError);
      }

      toast({
        title: "Reprocessamento iniciado",
        description: "Os envios falhos estão sendo reprocessados.",
      });

      // Refresh jobs list
      await fetchJobs();

      // Close dialog if open
      setFailedRecipientsDialog(false);
    } catch (error) {
      console.error("Error reprocessing:", error);
      toast({
        title: "Erro ao reprocessar",
        description: "Não foi possível reprocessar os envios falhos.",
        variant: "destructive",
      });
    } finally {
      setReprocessingJobId(null);
    }
  };

  // Legacy fetchData for compatibility
  const fetchData = async () => {
    await fetchJobs();
  };

  const getTotalRecipients = (selectedPlans: string[], allUsers: boolean): number => {
    if (allUsers || selectedPlans.length === 0) {
      return planCounts.reduce((sum, p) => sum + p.user_count, 0);
    }
    return planCounts
      .filter((p) => selectedPlans.includes(p.plan_id))
      .reduce((sum, p) => sum + p.user_count, 0);
  };

  const handlePlanToggle = (planId: string, form: "notification" | "email") => {
    if (form === "notification") {
      setNotifForm((prev) => ({
        ...prev,
        selectedPlans: prev.selectedPlans.includes(planId)
          ? prev.selectedPlans.filter((p) => p !== planId)
          : [...prev.selectedPlans, planId],
      }));
    } else {
      setEmailForm((prev) => ({
        ...prev,
        selectedPlans: prev.selectedPlans.includes(planId)
          ? prev.selectedPlans.filter((p) => p !== planId)
          : [...prev.selectedPlans, planId],
      }));
    }
  };

  const validateNotificationForm = (): string | null => {
    if (!notifForm.titlePt.trim()) return "Título em português é obrigatório";
    if (!notifForm.messagePt.trim()) return "Mensagem em português é obrigatória";
    if (notifForm.titlePt.length > LIMITS.notificationTitle)
      return `Título excede ${LIMITS.notificationTitle} caracteres`;
    if (notifForm.messagePt.length > LIMITS.notificationMessage)
      return `Mensagem excede ${LIMITS.notificationMessage} caracteres`;
    if (!notifForm.allUsers && notifForm.selectedPlans.length === 0)
      return "Selecione pelo menos um plano ou marque 'Todos os usuários'";
    return null;
  };

  const validateEmailForm = (): string | null => {
    if (!emailForm.subjectPt.trim()) return "Assunto em português é obrigatório";
    if (!emailForm.titlePt.trim()) return "Título em português é obrigatório";
    if (!emailForm.contentPt.trim()) return "Conteúdo em português é obrigatório";
    if (emailForm.subjectPt.length > LIMITS.emailSubject)
      return `Assunto excede ${LIMITS.emailSubject} caracteres`;
    if (emailForm.contentPt.length > LIMITS.emailContent)
      return `Conteúdo excede ${LIMITS.emailContent} caracteres`;
    if (!emailForm.allUsers && emailForm.selectedPlans.length === 0)
      return "Selecione pelo menos um plano ou marque 'Todos os usuários'";
    return null;
  };

  const handleSendNotifications = async () => {
    const error = validateNotificationForm();
    if (error) {
      toast({ title: "Erro de validação", description: error, variant: "destructive" });
      return;
    }
    setConfirmDialog(true);
  };

  const handleSendEmails = async () => {
    const error = validateEmailForm();
    if (error) {
      toast({ title: "Erro de validação", description: error, variant: "destructive" });
      return;
    }
    setConfirmDialog(true);
  };

  const confirmSend = async () => {
    setConfirmDialog(false);
    setSending(true);

    try {
      if (activeTab === "notifications") {
        // Create notification broadcast job
        const { data: job, error: jobError } = await supabase
          .from("broadcast_jobs")
          .insert({
            type: "notification",
            target_plans: notifForm.allUsers ? [] : notifForm.selectedPlans,
            target_all_users: notifForm.allUsers,
            notification_title_pt: notifForm.titlePt,
            notification_title_en: notifForm.titleEn || notifForm.titlePt,
            notification_title_es: notifForm.titleEs || notifForm.titlePt,
            notification_message_pt: notifForm.messagePt,
            notification_message_en: notifForm.messageEn || notifForm.messagePt,
            notification_message_es: notifForm.messageEs || notifForm.messagePt,
            notification_type: "announcement",
            notification_action_url: notifForm.actionUrl || null,
            batch_size: 100,
            batch_delay_ms: 500,
          })
          .select()
          .single();

        if (jobError) throw jobError;

        // Trigger processing via edge function
        const { error: processError } = await supabase.functions.invoke("process-broadcast", {
          body: { jobId: job.id },
        });

        if (processError) {
          console.error("Process error:", processError);
          // Job was created, will be processed later
        }

        toast({
          title: "Notificações enviadas",
          description: `Job criado. As notificações estão sendo processadas.`,
        });

        // Reset form
        setNotifForm({
          titlePt: "",
          titleEn: "",
          titleEs: "",
          messagePt: "",
          messageEn: "",
          messageEs: "",
          actionUrl: "",
          selectedPlans: [],
          allUsers: false,
        });
      } else {
        // Create email broadcast job
        const { data: job, error: jobError } = await supabase
          .from("broadcast_jobs")
          .insert({
            type: "email",
            target_plans: emailForm.allUsers ? [] : emailForm.selectedPlans,
            target_all_users: emailForm.allUsers,
            email_subject_pt: emailForm.subjectPt,
            email_subject_en: emailForm.subjectEn || emailForm.subjectPt,
            email_subject_es: emailForm.subjectEs || emailForm.subjectPt,
            email_template_key: "announcement",
            email_template_data: {
              title_pt: emailForm.titlePt,
              title_en: emailForm.titleEn || emailForm.titlePt,
              title_es: emailForm.titleEs || emailForm.titlePt,
              content_pt: emailForm.contentPt,
              content_en: emailForm.contentEn || emailForm.contentPt,
              content_es: emailForm.contentEs || emailForm.contentPt,
              ctaText: emailForm.ctaText || null,
              ctaUrl: emailForm.ctaUrl || null,
            },
            batch_size: 20, // Smaller batches for email to avoid rate limits
            batch_delay_ms: 2000, // 2 second delay between batches
          })
          .select()
          .single();

        if (jobError) throw jobError;

        // Trigger processing via edge function
        const { error: processError } = await supabase.functions.invoke("process-broadcast", {
          body: { jobId: job.id },
        });

        if (processError) {
          console.error("Process error:", processError);
        }

        toast({
          title: "Emails sendo enviados",
          description: `Job criado. Os emails estão sendo processados em fila para evitar spam.`,
        });

        // Reset form
        setEmailForm({
          subjectPt: "",
          subjectEn: "",
          subjectEs: "",
          titlePt: "",
          titleEn: "",
          titleEs: "",
          contentPt: "",
          contentEn: "",
          contentEs: "",
          ctaText: "",
          ctaUrl: "",
          selectedPlans: [],
          allUsers: false,
        });
      }

      // Refresh jobs list
      fetchData();
    } catch (error) {
      console.error("Error sending broadcast:", error);
      toast({
        title: "Erro ao enviar",
        description: "Não foi possível criar o broadcast. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Concluído</Badge>;
      case "processing":
        return <Badge className="bg-blue-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processando</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case "failed":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Falhou</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const currentTotalRecipients =
    activeTab === "notifications"
      ? getTotalRecipients(notifForm.selectedPlans, notifForm.allUsers)
      : getTotalRecipients(emailForm.selectedPlans, emailForm.allUsers);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-accent" />
            Central de Broadcasts
          </CardTitle>
          <CardDescription>
            Envie notificações e emails em massa para seus usuários
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "notifications" | "email")}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="w-4 h-4" />
                Notificações
              </TabsTrigger>
              <TabsTrigger value="email" className="gap-2">
                <Mail className="w-4 h-4" />
                Email
              </TabsTrigger>
            </TabsList>

            {/* NOTIFICATIONS TAB */}
            <TabsContent value="notifications" className="space-y-6">
              {/* Target Selection */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Destinatários
                </Label>

                <div className="flex items-center gap-2 mb-3">
                  <Checkbox
                    id="notif-all-users"
                    checked={notifForm.allUsers}
                    onCheckedChange={(checked) =>
                      setNotifForm((prev) => ({ ...prev, allUsers: !!checked, selectedPlans: [] }))
                    }
                  />
                  <Label htmlFor="notif-all-users" className="text-sm cursor-pointer">
                    Todos os usuários
                  </Label>
                </div>

                {!notifForm.allUsers && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {planCounts.map((plan) => (
                      <div
                        key={plan.plan_id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          notifForm.selectedPlans.includes(plan.plan_id)
                            ? "border-accent bg-accent/10"
                            : "border-border hover:border-accent/50"
                        }`}
                        onClick={() => handlePlanToggle(plan.plan_id, "notification")}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{plan.plan_name}</span>
                          <Checkbox checked={notifForm.selectedPlans.includes(plan.plan_id)} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {plan.user_count} usuários
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm">
                    Total de destinatários: <strong>{currentTotalRecipients}</strong>
                  </p>
                </div>
              </div>

              {/* Notification Content */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Título (PT) *</Label>
                  <Input
                    value={notifForm.titlePt}
                    onChange={(e) => setNotifForm((prev) => ({ ...prev, titlePt: e.target.value }))}
                    placeholder="Ex: Nova funcionalidade disponível!"
                    maxLength={LIMITS.notificationTitle}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {notifForm.titlePt.length}/{LIMITS.notificationTitle}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Título (EN)</Label>
                    <Input
                      value={notifForm.titleEn}
                      onChange={(e) => setNotifForm((prev) => ({ ...prev, titleEn: e.target.value }))}
                      placeholder="English title (optional)"
                      maxLength={LIMITS.notificationTitle}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Título (ES)</Label>
                    <Input
                      value={notifForm.titleEs}
                      onChange={(e) => setNotifForm((prev) => ({ ...prev, titleEs: e.target.value }))}
                      placeholder="Título en español (opcional)"
                      maxLength={LIMITS.notificationTitle}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mensagem (PT) *</Label>
                  <Textarea
                    value={notifForm.messagePt}
                    onChange={(e) => setNotifForm((prev) => ({ ...prev, messagePt: e.target.value }))}
                    placeholder="Digite a mensagem da notificação..."
                    rows={3}
                    maxLength={LIMITS.notificationMessage}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {notifForm.messagePt.length}/{LIMITS.notificationMessage}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mensagem (EN)</Label>
                    <Textarea
                      value={notifForm.messageEn}
                      onChange={(e) => setNotifForm((prev) => ({ ...prev, messageEn: e.target.value }))}
                      placeholder="English message (optional)"
                      rows={2}
                      maxLength={LIMITS.notificationMessage}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mensagem (ES)</Label>
                    <Textarea
                      value={notifForm.messageEs}
                      onChange={(e) => setNotifForm((prev) => ({ ...prev, messageEs: e.target.value }))}
                      placeholder="Mensaje en español (opcional)"
                      rows={2}
                      maxLength={LIMITS.notificationMessage}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>URL de Ação (opcional)</Label>
                  <Input
                    value={notifForm.actionUrl}
                    onChange={(e) => setNotifForm((prev) => ({ ...prev, actionUrl: e.target.value }))}
                    placeholder="Ex: /dashboard ou https://..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Se preenchido, um botão de ação será exibido na notificação
                  </p>
                </div>
              </div>

              <Alert>
                <Info className="w-4 h-4" />
                <AlertTitle>Processamento em lotes</AlertTitle>
                <AlertDescription>
                  As notificações serão enviadas em lotes de 100 com intervalo de 500ms para evitar sobrecarga do sistema.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleSendNotifications}
                disabled={sending || currentTotalRecipients === 0}
                className="w-full"
                size="lg"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Bell className="w-4 h-4 mr-2" />
                )}
                Enviar Notificações ({currentTotalRecipients} destinatários)
              </Button>
            </TabsContent>

            {/* EMAIL TAB */}
            <TabsContent value="email" className="space-y-6">
              {/* Target Selection (same as notifications) */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Destinatários
                </Label>

                <div className="flex items-center gap-2 mb-3">
                  <Checkbox
                    id="email-all-users"
                    checked={emailForm.allUsers}
                    onCheckedChange={(checked) =>
                      setEmailForm((prev) => ({ ...prev, allUsers: !!checked, selectedPlans: [] }))
                    }
                  />
                  <Label htmlFor="email-all-users" className="text-sm cursor-pointer">
                    Todos os usuários
                  </Label>
                </div>

                {!emailForm.allUsers && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {planCounts.map((plan) => (
                      <div
                        key={plan.plan_id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          emailForm.selectedPlans.includes(plan.plan_id)
                            ? "border-accent bg-accent/10"
                            : "border-border hover:border-accent/50"
                        }`}
                        onClick={() => handlePlanToggle(plan.plan_id, "email")}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{plan.plan_name}</span>
                          <Checkbox checked={emailForm.selectedPlans.includes(plan.plan_id)} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {plan.user_count} usuários
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm">
                    Total de destinatários: <strong>{currentTotalRecipients}</strong>
                  </p>
                </div>
              </div>

              {/* Email Content */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Assunto do Email (PT) *</Label>
                  <Input
                    value={emailForm.subjectPt}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, subjectPt: e.target.value }))}
                    placeholder="Ex: Novidades importantes do Audisell"
                    maxLength={LIMITS.emailSubject}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {emailForm.subjectPt.length}/{LIMITS.emailSubject}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Assunto (EN)</Label>
                    <Input
                      value={emailForm.subjectEn}
                      onChange={(e) => setEmailForm((prev) => ({ ...prev, subjectEn: e.target.value }))}
                      placeholder="English subject (optional)"
                      maxLength={LIMITS.emailSubject}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Assunto (ES)</Label>
                    <Input
                      value={emailForm.subjectEs}
                      onChange={(e) => setEmailForm((prev) => ({ ...prev, subjectEs: e.target.value }))}
                      placeholder="Asunto en español (opcional)"
                      maxLength={LIMITS.emailSubject}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Título no Email (PT) *</Label>
                  <Input
                    value={emailForm.titlePt}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, titlePt: e.target.value }))}
                    placeholder="Título que aparece no corpo do email"
                    maxLength={LIMITS.emailTitle}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Conteúdo do Email (PT) *</Label>
                  <Textarea
                    value={emailForm.contentPt}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, contentPt: e.target.value }))}
                    placeholder="Digite o conteúdo do email..."
                    rows={6}
                    maxLength={LIMITS.emailContent}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {emailForm.contentPt.length}/{LIMITS.emailContent}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Conteúdo (EN)</Label>
                    <Textarea
                      value={emailForm.contentEn}
                      onChange={(e) => setEmailForm((prev) => ({ ...prev, contentEn: e.target.value }))}
                      placeholder="English content (optional)"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Conteúdo (ES)</Label>
                    <Textarea
                      value={emailForm.contentEs}
                      onChange={(e) => setEmailForm((prev) => ({ ...prev, contentEs: e.target.value }))}
                      placeholder="Contenido en español (opcional)"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Texto do Botão CTA (opcional)</Label>
                    <Input
                      value={emailForm.ctaText}
                      onChange={(e) => setEmailForm((prev) => ({ ...prev, ctaText: e.target.value }))}
                      placeholder="Ex: Acessar agora"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL do Botão CTA</Label>
                    <Input
                      value={emailForm.ctaUrl}
                      onChange={(e) => setEmailForm((prev) => ({ ...prev, ctaUrl: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>

              <Alert>
                <Info className="w-4 h-4" />
                <AlertTitle>Envio em fila</AlertTitle>
                <AlertDescription>
                  Os emails serão enviados em lotes de 20 com intervalo de 2 segundos entre cada lote para
                  evitar bloqueio por spam e respeitar limites do servidor SMTP.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleSendEmails}
                disabled={sending || currentTotalRecipients === 0}
                className="w-full"
                size="lg"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Enviar Emails ({currentTotalRecipients} destinatários)
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Recent Jobs */}
      {recentJobs.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Histórico de Broadcasts</CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchJobs} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 bg-muted/50 rounded-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {job.type === "notification" ? (
                        <Bell className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Mail className="w-4 h-4 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {job.type === "notification"
                            ? job.notification_title_pt
                            : job.email_subject_pt}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(job.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(job.status)}
                  </div>

                  {/* Progress Section */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progresso: {job.processed_count}/{job.total_recipients}</span>
                      <span>
                        {job.total_recipients > 0
                          ? Math.round((job.processed_count / job.total_recipients) * 100)
                          : 0}%
                      </span>
                    </div>
                    <Progress
                      value={job.total_recipients > 0 ? (job.processed_count / job.total_recipients) * 100 : 0}
                      className="h-2"
                    />
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span className="text-green-600">{job.success_count} sucesso</span>
                    </div>
                    {job.failed_count > 0 && (
                      <div className="flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-red-500" />
                        <span className="text-red-600">{job.failed_count} falhou</span>
                      </div>
                    )}
                    {(job.status === "processing" || job.status === "pending") && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-yellow-500" />
                        <span className="text-yellow-600">
                          {job.total_recipients - job.processed_count} pendentes
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {job.failed_count > 0 && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleViewFailures(job)}
                      >
                        <Eye className="w-3 h-3" />
                        Ver falhas ({job.failed_count})
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleReprocessFailed(job.id)}
                        disabled={reprocessingJobId === job.id || job.status === "processing"}
                      >
                        {reprocessingJobId === job.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3 h-3" />
                        )}
                        Reprocessar falhas
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar envio</DialogTitle>
            <DialogDescription>
              Você está prestes a enviar{" "}
              {activeTab === "notifications" ? "notificações" : "emails"} para{" "}
              <strong>{currentTotalRecipients}</strong> usuários.
              <br />
              <br />
              Esta ação não pode ser desfeita. Deseja continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmSend} disabled={sending}>
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Confirmar Envio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Failed Recipients Dialog */}
      <Dialog open={failedRecipientsDialog} onOpenChange={setFailedRecipientsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Destinatários com Falha
            </DialogTitle>
            <DialogDescription>
              {selectedJobForFailures && (
                <>
                  Job: {selectedJobForFailures.type === "notification"
                    ? selectedJobForFailures.notification_title_pt
                    : selectedJobForFailures.email_subject_pt}
                  <br />
                  <span className="text-red-500">
                    {selectedJobForFailures.failed_count} envios falharam
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {loadingFailures ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : failedRecipients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>Nenhum destinatário com falha encontrado.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Erro</TableHead>
                    <TableHead className="w-[120px]">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failedRecipients.map((recipient) => (
                    <TableRow key={recipient.id}>
                      <TableCell className="font-mono text-sm">
                        {recipient.email}
                      </TableCell>
                      <TableCell className="text-sm text-red-500 max-w-[300px] truncate">
                        {recipient.error_message || "Erro desconhecido"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(recipient.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setFailedRecipientsDialog(false)}
            >
              Fechar
            </Button>
            {failedRecipients.length > 0 && selectedJobForFailures && (
              <Button
                onClick={() => handleReprocessFailed(selectedJobForFailures.id)}
                disabled={reprocessingJobId === selectedJobForFailures.id}
                className="gap-2"
              >
                {reprocessingJobId === selectedJobForFailures.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                Reprocessar {failedRecipients.length} falhas
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BroadcastManager;
