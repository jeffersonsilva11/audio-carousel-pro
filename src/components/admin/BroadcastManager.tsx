import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
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

// Character limits
const LIMITS = {
  notificationTitle: 100,
  notificationMessage: 500,
  emailSubject: 150,
  emailTitle: 200,
  emailContent: 5000,
};

const BroadcastManager = () => {
  const [activeTab, setActiveTab] = useState<"notifications" | "email">("notifications");
  const [planCounts, setPlanCounts] = useState<PlanCount[]>([]);
  const [recentJobs, setRecentJobs] = useState<BroadcastJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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
      const { data: jobs } = await supabase
        .from("broadcast_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      setRecentJobs(jobs || []);
    } catch (error) {
      console.error("Error fetching broadcast data:", error);
    } finally {
      setLoading(false);
    }
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
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Broadcasts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
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
                  <div className="flex items-center gap-4">
                    <div className="text-right text-xs">
                      <p className="text-muted-foreground">
                        {job.success_count}/{job.total_recipients}
                      </p>
                      {job.status === "processing" && (
                        <Progress
                          value={(job.processed_count / job.total_recipients) * 100}
                          className="w-20 h-1 mt-1"
                        />
                      )}
                    </div>
                    {getStatusBadge(job.status)}
                  </div>
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
    </div>
  );
};

export default BroadcastManager;
