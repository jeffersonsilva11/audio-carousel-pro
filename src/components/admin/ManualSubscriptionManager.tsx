import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatLocalizedDate } from "@/lib/localization";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Gift,
  Search,
  UserPlus,
  Crown,
  Calendar,
  Trash2,
  AlertTriangle,
  Check,
  Clock,
  Infinity,
} from "lucide-react";

interface ManualSubscription {
  id: string;
  user_id: string;
  plan_tier: string;
  reason: string | null;
  notes: string | null;
  granted_by: string | null;
  starts_at: string;
  expires_at: string | null;
  custom_daily_limit: number | null;
  is_active: boolean;
  created_at: string;
  user_email?: string;
  user_name?: string;
  granted_by_email?: string;
}

interface UserSearchResult {
  user_id: string;
  email: string | null;
  name: string | null;
  plan_tier: string | null;
}

const PLAN_TIERS = ["starter", "creator", "agency"];
const VALIDITY_OPTIONS = [
  { value: "1_month", label: { "pt-BR": "1 mês", en: "1 month", es: "1 mes" } },
  { value: "3_months", label: { "pt-BR": "3 meses", en: "3 months", es: "3 meses" } },
  { value: "6_months", label: { "pt-BR": "6 meses", en: "6 months", es: "6 meses" } },
  { value: "1_year", label: { "pt-BR": "1 ano", en: "1 year", es: "1 año" } },
  { value: "permanent", label: { "pt-BR": "Permanente", en: "Permanent", es: "Permanente" } },
];

const REASON_PRESETS = [
  { value: "influencer", label: { "pt-BR": "Parceria com Influenciador", en: "Influencer Partnership", es: "Asociación con Influencer" } },
  { value: "testing", label: { "pt-BR": "Teste interno", en: "Internal Testing", es: "Prueba interna" } },
  { value: "promotion", label: { "pt-BR": "Promoção/Campanha", en: "Promotion/Campaign", es: "Promoción/Campaña" } },
  { value: "support", label: { "pt-BR": "Suporte ao cliente", en: "Customer Support", es: "Soporte al cliente" } },
  { value: "beta", label: { "pt-BR": "Beta tester", en: "Beta Tester", es: "Beta tester" } },
  { value: "other", label: { "pt-BR": "Outro", en: "Other", es: "Otro" } },
];

export default function ManualSubscriptionManager() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();

  const [subscriptions, setSubscriptions] = useState<ManualSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<ManualSubscription | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);

  // Form state
  const [formPlan, setFormPlan] = useState("creator");
  const [formValidity, setFormValidity] = useState("3_months");
  const [formReason, setFormReason] = useState("influencer");
  const [formNotes, setFormNotes] = useState("");
  const [formCustomLimit, setFormCustomLimit] = useState<number | undefined>();

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const { data: subs, error } = await supabase
        .from("manual_subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user details for each subscription
      const subsWithUsers = await Promise.all(
        (subs || []).map(async (sub) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, name")
            .eq("user_id", sub.user_id)
            .single();

          let grantedByEmail = null;
          if (sub.granted_by) {
            const { data: grantedProfile } = await supabase
              .from("profiles")
              .select("email")
              .eq("user_id", sub.granted_by)
              .single();
            grantedByEmail = grantedProfile?.email;
          }

          return {
            ...sub,
            user_email: profile?.email,
            user_name: profile?.name,
            granted_by_email: grantedByEmail,
          };
        })
      );

      setSubscriptions(subsWithUsers);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      toast({
        title: language === "pt-BR" ? "Erro" : "Error",
        description: language === "pt-BR" ? "Não foi possível carregar as assinaturas" : "Could not load subscriptions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, email, name, plan_tier")
        .or(`email.ilike.%${query}%,name.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setSearching(false);
    }
  };

  const calculateExpiresAt = (validity: string): string | null => {
    if (validity === "permanent") return null;

    const now = new Date();
    switch (validity) {
      case "1_month":
        now.setMonth(now.getMonth() + 1);
        break;
      case "3_months":
        now.setMonth(now.getMonth() + 3);
        break;
      case "6_months":
        now.setMonth(now.getMonth() + 6);
        break;
      case "1_year":
        now.setFullYear(now.getFullYear() + 1);
        break;
    }
    return now.toISOString();
  };

  const handleCreate = async () => {
    if (!selectedUser || !user) return;

    setIsCreating(true);
    try {
      // First deactivate any existing active subscription for this user
      await supabase
        .from("manual_subscriptions")
        .update({ is_active: false })
        .eq("user_id", selectedUser.user_id)
        .eq("is_active", true);

      // Create new subscription
      const { error } = await supabase.from("manual_subscriptions").insert({
        user_id: selectedUser.user_id,
        plan_tier: formPlan,
        reason: REASON_PRESETS.find(r => r.value === formReason)?.label["pt-BR"] || formReason,
        notes: formNotes || null,
        granted_by: user.id,
        expires_at: calculateExpiresAt(formValidity),
        custom_daily_limit: formCustomLimit || null,
        is_active: true,
      });

      if (error) throw error;

      toast({
        title: language === "pt-BR" ? "Assinatura criada" : "Subscription created",
        description: language === "pt-BR"
          ? `${selectedUser.email} agora tem acesso ao plano ${formPlan}`
          : `${selectedUser.email} now has access to ${formPlan} plan`,
      });

      // Reset form
      setShowCreateDialog(false);
      setSelectedUser(null);
      setSearchQuery("");
      setSearchResults([]);
      setFormNotes("");
      setFormCustomLimit(undefined);

      fetchSubscriptions();
    } catch (error) {
      console.error("Error creating subscription:", error);
      toast({
        title: language === "pt-BR" ? "Erro" : "Error",
        description: language === "pt-BR" ? "Não foi possível criar a assinatura" : "Could not create subscription",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (sub: ManualSubscription) => {
    try {
      const { error } = await supabase
        .from("manual_subscriptions")
        .update({ is_active: false })
        .eq("id", sub.id);

      if (error) throw error;

      toast({
        title: language === "pt-BR" ? "Assinatura revogada" : "Subscription revoked",
        description: language === "pt-BR"
          ? `O acesso de ${sub.user_email} foi removido`
          : `Access for ${sub.user_email} has been removed`,
      });

      setDeleteConfirm(null);
      fetchSubscriptions();
    } catch (error) {
      console.error("Error revoking subscription:", error);
      toast({
        title: language === "pt-BR" ? "Erro" : "Error",
        variant: "destructive",
      });
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getStatusBadge = (sub: ManualSubscription) => {
    if (!sub.is_active) {
      return <Badge variant="outline" className="text-muted-foreground">Revogado</Badge>;
    }
    if (isExpired(sub.expires_at)) {
      return <Badge variant="destructive">Expirado</Badge>;
    }
    return <Badge variant="default" className="bg-green-500">Ativo</Badge>;
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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5" />
                {language === "pt-BR" ? "Assinaturas Manuais" : language === "es" ? "Suscripciones Manuales" : "Manual Subscriptions"}
              </CardTitle>
              <CardDescription>
                {language === "pt-BR"
                  ? "Atribua planos manualmente para influenciadores, testes ou promoções"
                  : language === "es"
                  ? "Asigna planes manualmente para influencers, pruebas o promociones"
                  : "Assign plans manually for influencers, testing or promotions"}
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              {language === "pt-BR" ? "Atribuir Plano" : "Assign Plan"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{language === "pt-BR" ? "Nenhuma assinatura manual" : "No manual subscriptions"}</p>
              <p className="text-sm">
                {language === "pt-BR"
                  ? "Clique em 'Atribuir Plano' para começar"
                  : "Click 'Assign Plan' to get started"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === "pt-BR" ? "Usuário" : "User"}</TableHead>
                  <TableHead>{language === "pt-BR" ? "Plano" : "Plan"}</TableHead>
                  <TableHead>{language === "pt-BR" ? "Motivo" : "Reason"}</TableHead>
                  <TableHead>{language === "pt-BR" ? "Validade" : "Validity"}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => (
                  <TableRow key={sub.id} className={!sub.is_active || isExpired(sub.expires_at) ? "opacity-60" : ""}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{sub.user_name || "—"}</p>
                        <p className="text-sm text-muted-foreground">{sub.user_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sub.plan_tier === "creator" ? "default" : "secondary"} className="gap-1">
                        <Crown className="w-3 h-3" />
                        {sub.plan_tier}
                      </Badge>
                      {sub.custom_daily_limit && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({sub.custom_daily_limit}/dia)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{sub.reason || "—"}</span>
                      {sub.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{sub.notes}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        {sub.expires_at ? (
                          <>
                            <Calendar className="w-3 h-3" />
                            {formatLocalizedDate(sub.expires_at, language, "short")}
                          </>
                        ) : (
                          <>
                            <Infinity className="w-3 h-3" />
                            {language === "pt-BR" ? "Permanente" : "Permanent"}
                          </>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {language === "pt-BR" ? "por" : "by"} {sub.granted_by_email || "sistema"}
                      </p>
                    </TableCell>
                    <TableCell>{getStatusBadge(sub)}</TableCell>
                    <TableCell>
                      {sub.is_active && !isExpired(sub.expires_at) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirm(sub)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              {language === "pt-BR" ? "Atribuir Plano Manualmente" : "Assign Plan Manually"}
            </DialogTitle>
            <DialogDescription>
              {language === "pt-BR"
                ? "Busque um usuário e atribua um plano premium sem cobrança"
                : "Search for a user and assign a premium plan without charge"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* User Search */}
            <div className="space-y-2">
              <Label>{language === "pt-BR" ? "Buscar Usuário" : "Search User"}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  placeholder={language === "pt-BR" ? "Digite email ou nome..." : "Enter email or name..."}
                  className="pl-10"
                />
              </div>

              {/* Search Results */}
              {(searching || searchResults.length > 0) && (
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  {searching ? (
                    <div className="p-3 text-center text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                      {language === "pt-BR" ? "Buscando..." : "Searching..."}
                    </div>
                  ) : (
                    searchResults.map((result) => (
                      <button
                        key={result.user_id}
                        onClick={() => {
                          setSelectedUser(result);
                          setSearchQuery(result.email || "");
                          setSearchResults([]);
                        }}
                        className="w-full p-3 text-left hover:bg-muted/50 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{result.name || result.email}</p>
                          <p className="text-sm text-muted-foreground">{result.email}</p>
                        </div>
                        <Badge variant="outline">{result.plan_tier || "free"}</Badge>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Selected User */}
              {selectedUser && (
                <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-accent" />
                    <div>
                      <p className="font-medium">{selectedUser.name || selectedUser.email}</p>
                      <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                    {language === "pt-BR" ? "Trocar" : "Change"}
                  </Button>
                </div>
              )}
            </div>

            {/* Plan Selection */}
            <div className="space-y-2">
              <Label>{language === "pt-BR" ? "Plano" : "Plan"}</Label>
              <Select value={formPlan} onValueChange={setFormPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_TIERS.map((tier) => (
                    <SelectItem key={tier} value={tier}>
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4" />
                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Validity */}
            <div className="space-y-2">
              <Label>{language === "pt-BR" ? "Validade" : "Validity"}</Label>
              <Select value={formValidity} onValueChange={setFormValidity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VALIDITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        {opt.value === "permanent" ? <Infinity className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        {opt.label[language]}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label>{language === "pt-BR" ? "Motivo" : "Reason"}</Label>
              <Select value={formReason} onValueChange={setFormReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASON_PRESETS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label[language]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>{language === "pt-BR" ? "Observações (opcional)" : "Notes (optional)"}</Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder={language === "pt-BR" ? "Informações adicionais..." : "Additional information..."}
                rows={2}
              />
            </div>

            {/* Custom Daily Limit */}
            <div className="space-y-2">
              <Label>{language === "pt-BR" ? "Limite diário customizado (opcional)" : "Custom daily limit (optional)"}</Label>
              <Input
                type="number"
                value={formCustomLimit || ""}
                onChange={(e) => setFormCustomLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder={language === "pt-BR" ? "Deixe vazio para usar o padrão do plano" : "Leave empty for plan default"}
                min={1}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {language === "pt-BR" ? "Cancelar" : "Cancel"}
            </Button>
            <Button onClick={handleCreate} disabled={!selectedUser || isCreating}>
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Gift className="w-4 h-4 mr-2" />
              )}
              {language === "pt-BR" ? "Atribuir Plano" : "Assign Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              {language === "pt-BR" ? "Revogar Assinatura?" : "Revoke Subscription?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "pt-BR"
                ? `${deleteConfirm?.user_email} perderá acesso imediato ao plano ${deleteConfirm?.plan_tier}. Esta ação não pode ser desfeita.`
                : `${deleteConfirm?.user_email} will immediately lose access to ${deleteConfirm?.plan_tier} plan. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === "pt-BR" ? "Cancelar" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteConfirm && handleRevoke(deleteConfirm)}
            >
              {language === "pt-BR" ? "Revogar" : "Revoke"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
