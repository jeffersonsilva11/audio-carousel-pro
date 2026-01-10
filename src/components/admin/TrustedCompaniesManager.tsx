import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Configure DOMPurify to allow safe SVG elements and attributes
const sanitizeSvg = (svg: string): string => {
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_ATTR: ['viewBox', 'fill', 'class', 'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height', 'transform', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'fill-rule', 'clip-rule', 'opacity'],
    FORBID_TAGS: ['script', 'style', 'foreignObject'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus'],
  });
};
import { 
  Loader2, 
  Plus, 
  Save, 
  Trash2, 
  GripVertical,
  Building,
  Eye,
  EyeOff,
  Pencil
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
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TrustedCompany {
  id: string;
  name: string;
  logo_svg: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

interface SortableCompanyItemProps {
  company: TrustedCompany;
  onEdit: (company: TrustedCompany) => void;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (company: TrustedCompany) => void;
}

const SortableCompanyItem = ({ company, onEdit, onToggle, onDelete }: SortableCompanyItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: company.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-4 bg-background border rounded-lg ${!company.is_active ? 'opacity-50' : ''}`}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </button>

      <div className="w-24 h-12 flex items-center justify-center bg-muted rounded p-2">
        <div
          className="text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: sanitizeSvg(company.logo_svg) }}
        />
      </div>

      <div className="flex-1">
        <p className="font-medium">{company.name}</p>
        <p className="text-xs text-muted-foreground">
          Ordem: {company.display_order}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onToggle(company.id, !company.is_active)}
          title={company.is_active ? "Desativar" : "Ativar"}
        >
          {company.is_active ? (
            <Eye className="w-4 h-4" />
          ) : (
            <EyeOff className="w-4 h-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(company)}
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(company)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

const TrustedCompaniesManager = () => {
  const [companies, setCompanies] = useState<TrustedCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<TrustedCompany | null>(null);
  const [editingCompany, setEditingCompany] = useState<TrustedCompany | null>(null);
  const [formData, setFormData] = useState({ name: "", logo_svg: "" });
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("trusted_companies")
        .select("*")
        .order("display_order");

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error("Error fetching companies:", error);
      toast({
        title: "Erro ao carregar empresas",
        description: "Não foi possível carregar as empresas parceiras.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = companies.findIndex((c) => c.id === active.id);
    const newIndex = companies.findIndex((c) => c.id === over.id);
    
    const newOrder = arrayMove(companies, oldIndex, newIndex);
    setCompanies(newOrder);

    // Update display_order in database
    try {
      for (let i = 0; i < newOrder.length; i++) {
        await supabase
          .from("trusted_companies")
          .update({ display_order: i })
          .eq("id", newOrder[i].id);
      }
      toast({
        title: "Ordem atualizada",
        description: "A ordem das empresas foi salva.",
      });
    } catch (error) {
      console.error("Error updating order:", error);
      fetchCompanies();
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.logo_svg) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome e o código SVG do logo.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingCompany) {
        const { error } = await supabase
          .from("trusted_companies")
          .update({
            name: formData.name,
            logo_svg: formData.logo_svg,
          })
          .eq("id", editingCompany.id);

        if (error) throw error;
        toast({ title: "Empresa atualizada!" });
      } else {
        const maxOrder = companies.reduce((max, c) => Math.max(max, c.display_order), -1);
        const { error } = await supabase
          .from("trusted_companies")
          .insert({
            name: formData.name,
            logo_svg: formData.logo_svg,
            display_order: maxOrder + 1,
            is_active: true,
          });

        if (error) throw error;
        toast({ title: "Empresa adicionada!" });
      }

      setDialogOpen(false);
      setEditingCompany(null);
      setFormData({ name: "", logo_svg: "" });
      fetchCompanies();
    } catch (error) {
      console.error("Error saving company:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a empresa.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("trusted_companies")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;
      
      setCompanies(companies.map(c => 
        c.id === id ? { ...c, is_active: isActive } : c
      ));
      
      toast({
        title: isActive ? "Empresa ativada" : "Empresa desativada",
      });
    } catch (error) {
      console.error("Error toggling company:", error);
    }
  };

  const handleDelete = async () => {
    if (!companyToDelete) return;

    try {
      const { error } = await supabase
        .from("trusted_companies")
        .delete()
        .eq("id", companyToDelete.id);

      if (error) throw error;

      toast({ title: "Empresa removida!" });
      setDeleteDialogOpen(false);
      setCompanyToDelete(null);
      fetchCompanies();
    } catch (error) {
      console.error("Error deleting company:", error);
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover a empresa.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (company: TrustedCompany) => {
    setEditingCompany(company);
    setFormData({ name: company.name, logo_svg: company.logo_svg });
    setDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingCompany(null);
    setFormData({ name: "", logo_svg: "" });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
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
                <Building className="w-5 h-5 text-accent" />
                Empresas Parceiras
              </CardTitle>
              <CardDescription>
                Gerencie os logos exibidos na seção "Tecnologia usada por"
              </CardDescription>
            </div>
            <Button onClick={openNewDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar empresa
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma empresa cadastrada</p>
              <p className="text-sm">Adicione empresas parceiras para exibir na landing page.</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={companies.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {companies.map((company) => (
                    <SortableCompanyItem
                      key={company.id}
                      company={company}
                      onEdit={openEditDialog}
                      onToggle={handleToggle}
                      onDelete={(c) => {
                        setCompanyToDelete(c);
                        setDeleteDialogOpen(true);
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCompany ? "Editar empresa" : "Adicionar empresa"}
            </DialogTitle>
            <DialogDescription>
              Insira o nome e o código SVG do logo da empresa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome da empresa</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Google, Meta, OpenAI..."
              />
            </div>

            <div>
              <Label htmlFor="logo_svg">Código SVG do logo</Label>
              <Textarea
                id="logo_svg"
                value={formData.logo_svg}
                onChange={(e) => setFormData({ ...formData, logo_svg: e.target.value })}
                placeholder='<svg viewBox="0 0 24 24" fill="currentColor">...</svg>'
                rows={6}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Cole o código SVG do logo. Use viewBox e fill="currentColor" para melhor resultado.
              </p>
            </div>

            {formData.logo_svg && (
              <div>
                <Label>Prévia</Label>
                <div className="w-full h-20 bg-muted rounded-lg flex items-center justify-center p-4">
                  <div
                    className="text-muted-foreground h-10 [&>svg]:h-full [&>svg]:w-auto"
                    dangerouslySetInnerHTML={{ __html: sanitizeSvg(formData.logo_svg) }}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover "{companyToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TrustedCompaniesManager;
