import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Ticket,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Check,
  Percent,
  DollarSign,
  Calendar,
  Users,
} from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: "percentage" | "fixed_amount";
  discount_value: number;
  currency: string;
  applicable_plans: string[] | null;
  max_uses: number | null;
  max_uses_per_user: number;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  stripe_coupon_id: string | null;
  is_active: boolean;
  created_at: string;
}

const PLAN_OPTIONS = [
  { value: "starter", label: "Starter" },
  { value: "creator", label: "Creator" },
  { value: "agency", label: "Agency" },
];

export default function CouponsManager() {
  const { language } = useLanguage();
  const { toast } = useToast();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form state
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDiscountType, setFormDiscountType] = useState<"percentage" | "fixed_amount">("percentage");
  const [formDiscountValue, setFormDiscountValue] = useState(10);
  const [formMaxUses, setFormMaxUses] = useState<number | undefined>();
  const [formMaxUsesPerUser, setFormMaxUsesPerUser] = useState(1);
  const [formValidUntil, setFormValidUntil] = useState("");
  const [formApplicablePlans, setFormApplicablePlans] = useState<string[]>([]);

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCoupons((data as Coupon[]) || []);
    } catch (error) {
      console.error("Error fetching coupons:", error);
      toast({
        title: language === "pt-BR" ? "Erro" : "Error",
        description: language === "pt-BR" ? "Não foi possível carregar os cupons" : "Could not load coupons",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormCode("");
    setFormName("");
    setFormDescription("");
    setFormDiscountType("percentage");
    setFormDiscountValue(10);
    setFormMaxUses(undefined);
    setFormMaxUsesPerUser(1);
    setFormValidUntil("");
    setFormApplicablePlans([]);
  };

  const openCreateDialog = () => {
    resetForm();
    setEditingCoupon(null);
    setShowCreateDialog(true);
  };

  const openEditDialog = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormCode(coupon.code);
    setFormName(coupon.name);
    setFormDescription(coupon.description || "");
    setFormDiscountType(coupon.discount_type);
    setFormDiscountValue(coupon.discount_value);
    setFormMaxUses(coupon.max_uses || undefined);
    setFormMaxUsesPerUser(coupon.max_uses_per_user);
    setFormValidUntil(coupon.valid_until ? new Date(coupon.valid_until).toISOString().split("T")[0] : "");
    setFormApplicablePlans(coupon.applicable_plans || []);
    setShowCreateDialog(true);
  };

  const handleSave = async () => {
    if (!formCode || !formName) {
      toast({
        title: language === "pt-BR" ? "Erro" : "Error",
        description: language === "pt-BR" ? "Código e nome são obrigatórios" : "Code and name are required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const couponData = {
        code: formCode.toUpperCase().replace(/\s/g, ""),
        name: formName,
        description: formDescription || null,
        discount_type: formDiscountType,
        discount_value: formDiscountValue,
        max_uses: formMaxUses || null,
        max_uses_per_user: formMaxUsesPerUser,
        valid_until: formValidUntil ? new Date(formValidUntil).toISOString() : null,
        applicable_plans: formApplicablePlans.length > 0 ? formApplicablePlans : null,
      };

      if (editingCoupon) {
        const { error } = await supabase
          .from("coupons")
          .update(couponData)
          .eq("id", editingCoupon.id);

        if (error) throw error;

        toast({
          title: language === "pt-BR" ? "Cupom atualizado" : "Coupon updated",
        });
      } else {
        const { error } = await supabase
          .from("coupons")
          .insert(couponData);

        if (error) throw error;

        toast({
          title: language === "pt-BR" ? "Cupom criado" : "Coupon created",
        });
      }

      setShowCreateDialog(false);
      fetchCoupons();
    } catch (error: any) {
      console.error("Error saving coupon:", error);
      toast({
        title: language === "pt-BR" ? "Erro" : "Error",
        description: error.message?.includes("duplicate")
          ? (language === "pt-BR" ? "Este código já existe" : "This code already exists")
          : (language === "pt-BR" ? "Não foi possível salvar o cupom" : "Could not save coupon"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleCouponActive = async (coupon: Coupon) => {
    try {
      const { error } = await supabase
        .from("coupons")
        .update({ is_active: !coupon.is_active })
        .eq("id", coupon.id);

      if (error) throw error;

      toast({
        title: coupon.is_active
          ? (language === "pt-BR" ? "Cupom desativado" : "Coupon deactivated")
          : (language === "pt-BR" ? "Cupom ativado" : "Coupon activated"),
      });

      fetchCoupons();
    } catch (error) {
      console.error("Error toggling coupon:", error);
      toast({
        title: language === "pt-BR" ? "Erro" : "Error",
        variant: "destructive",
      });
    }
  };

  const deleteCoupon = async (coupon: Coupon) => {
    if (!confirm(language === "pt-BR" ? "Tem certeza que deseja excluir este cupom?" : "Are you sure you want to delete this coupon?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("coupons")
        .delete()
        .eq("id", coupon.id);

      if (error) throw error;

      toast({
        title: language === "pt-BR" ? "Cupom excluído" : "Coupon deleted",
      });

      fetchCoupons();
    } catch (error) {
      console.error("Error deleting coupon:", error);
      toast({
        title: language === "pt-BR" ? "Erro" : "Error",
        variant: "destructive",
      });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.discount_type === "percentage") {
      return `${coupon.discount_value}%`;
    }
    return `R$ ${(coupon.discount_value / 100).toFixed(2)}`;
  };

  const isExpired = (validUntil: string | null) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const getStatusBadge = (coupon: Coupon) => {
    if (!coupon.is_active) {
      return <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>;
    }
    if (isExpired(coupon.valid_until)) {
      return <Badge variant="destructive">Expirado</Badge>;
    }
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return <Badge variant="secondary">Esgotado</Badge>;
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
                <Ticket className="w-5 h-5" />
                {language === "pt-BR" ? "Cupons de Desconto" : language === "es" ? "Cupones de Descuento" : "Discount Coupons"}
              </CardTitle>
              <CardDescription>
                {language === "pt-BR"
                  ? "Crie e gerencie cupons de desconto para seus clientes"
                  : language === "es"
                  ? "Crea y gestiona cupones de descuento para tus clientes"
                  : "Create and manage discount coupons for your customers"}
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              {language === "pt-BR" ? "Novo Cupom" : "New Coupon"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Ticket className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{language === "pt-BR" ? "Nenhum cupom criado" : "No coupons created"}</p>
              <p className="text-sm">
                {language === "pt-BR"
                  ? "Clique em 'Novo Cupom' para criar o primeiro"
                  : "Click 'New Coupon' to create the first one"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === "pt-BR" ? "Código" : "Code"}</TableHead>
                  <TableHead>{language === "pt-BR" ? "Desconto" : "Discount"}</TableHead>
                  <TableHead>{language === "pt-BR" ? "Uso" : "Usage"}</TableHead>
                  <TableHead>{language === "pt-BR" ? "Validade" : "Validity"}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id} className={!coupon.is_active || isExpired(coupon.valid_until) ? "opacity-60" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-muted rounded font-mono text-sm">{coupon.code}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyCode(coupon.code)}
                        >
                          {copiedCode === coupon.code ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{coupon.name}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {coupon.discount_type === "percentage" ? (
                          <Percent className="w-4 h-4 text-accent" />
                        ) : (
                          <DollarSign className="w-4 h-4 text-accent" />
                        )}
                        <span className="font-semibold">{formatDiscount(coupon)}</span>
                      </div>
                      {coupon.applicable_plans && (
                        <div className="flex gap-1 mt-1">
                          {coupon.applicable_plans.map((plan) => (
                            <Badge key={plan} variant="outline" className="text-xs">
                              {plan}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="w-3 h-3" />
                        {coupon.current_uses}{coupon.max_uses ? `/${coupon.max_uses}` : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      {coupon.valid_until ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3 h-3" />
                          {formatLocalizedDate(coupon.valid_until, language, "short")}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {language === "pt-BR" ? "Sem limite" : "No limit"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(coupon)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={coupon.is_active}
                          onCheckedChange={() => toggleCouponActive(coupon)}
                        />
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(coupon)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteCoupon(coupon)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              {editingCoupon
                ? (language === "pt-BR" ? "Editar Cupom" : "Edit Coupon")
                : (language === "pt-BR" ? "Novo Cupom" : "New Coupon")}
            </DialogTitle>
            <DialogDescription>
              {language === "pt-BR"
                ? "Configure os detalhes do cupom de desconto"
                : "Configure the discount coupon details"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "pt-BR" ? "Código" : "Code"}</Label>
                <Input
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="WELCOME50"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "pt-BR" ? "Nome" : "Name"}</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Boas-vindas 50%"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{language === "pt-BR" ? "Descrição (opcional)" : "Description (optional)"}</Label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Cupom de boas-vindas para novos usuários"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "pt-BR" ? "Tipo de Desconto" : "Discount Type"}</Label>
                <Select value={formDiscountType} onValueChange={(v) => setFormDiscountType(v as "percentage" | "fixed_amount")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">
                      <div className="flex items-center gap-2">
                        <Percent className="w-4 h-4" />
                        {language === "pt-BR" ? "Porcentagem" : "Percentage"}
                      </div>
                    </SelectItem>
                    <SelectItem value="fixed_amount">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        {language === "pt-BR" ? "Valor Fixo" : "Fixed Amount"}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  {formDiscountType === "percentage"
                    ? (language === "pt-BR" ? "Porcentagem" : "Percentage")
                    : (language === "pt-BR" ? "Valor (centavos)" : "Amount (cents)")}
                </Label>
                <Input
                  type="number"
                  value={formDiscountValue}
                  onChange={(e) => setFormDiscountValue(parseInt(e.target.value) || 0)}
                  min={0}
                  max={formDiscountType === "percentage" ? 100 : undefined}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "pt-BR" ? "Máximo de Usos" : "Max Uses"}</Label>
                <Input
                  type="number"
                  value={formMaxUses || ""}
                  onChange={(e) => setFormMaxUses(e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder={language === "pt-BR" ? "Ilimitado" : "Unlimited"}
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "pt-BR" ? "Usos por Usuário" : "Uses per User"}</Label>
                <Input
                  type="number"
                  value={formMaxUsesPerUser}
                  onChange={(e) => setFormMaxUsesPerUser(parseInt(e.target.value) || 1)}
                  min={1}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{language === "pt-BR" ? "Válido Até (opcional)" : "Valid Until (optional)"}</Label>
              <Input
                type="date"
                value={formValidUntil}
                onChange={(e) => setFormValidUntil(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{language === "pt-BR" ? "Planos Aplicáveis" : "Applicable Plans"}</Label>
              <div className="flex flex-wrap gap-2">
                {PLAN_OPTIONS.map((plan) => (
                  <Badge
                    key={plan.value}
                    variant={formApplicablePlans.includes(plan.value) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      if (formApplicablePlans.includes(plan.value)) {
                        setFormApplicablePlans(formApplicablePlans.filter((p) => p !== plan.value));
                      } else {
                        setFormApplicablePlans([...formApplicablePlans, plan.value]);
                      }
                    }}
                  >
                    {plan.label}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {language === "pt-BR"
                  ? "Deixe vazio para aplicar a todos os planos"
                  : "Leave empty to apply to all plans"}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {language === "pt-BR" ? "Cancelar" : "Cancel"}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              {language === "pt-BR" ? "Salvar" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
