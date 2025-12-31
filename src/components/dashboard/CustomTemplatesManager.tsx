import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { 
  Loader2, 
  Save, 
  Trash2, 
  Plus,
  Palette,
  Type,
  Star,
  Check
} from "lucide-react";
import { AVAILABLE_FONTS, GRADIENT_PRESETS, FontId, GradientId } from "@/lib/constants";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CustomTemplate {
  id: string;
  user_id: string;
  name: string;
  font_id: FontId;
  gradient_id: GradientId | null;
  custom_colors: string[] | null;
  style: 'BLACK_WHITE' | 'WHITE_BLACK' | 'GRADIENT';
  is_default: boolean;
  created_at: string;
}

const translations = {
  "pt-BR": {
    title: "Meus Templates",
    description: "Salve suas configurações favoritas de estilo",
    noTemplates: "Nenhum template salvo",
    noTemplatesDesc: "Crie templates personalizados para usar rapidamente.",
    addTemplate: "Criar template",
    editTemplate: "Editar template",
    templateName: "Nome do template",
    templateNamePlaceholder: "Ex: Meu estilo principal",
    font: "Fonte",
    style: "Estilo de fundo",
    gradient: "Gradiente",
    setAsDefault: "Definir como padrão",
    save: "Salvar",
    cancel: "Cancelar",
    deleteTitle: "Excluir template?",
    deleteDesc: "Esta ação não pode ser desfeita.",
    delete: "Excluir",
    saved: "Template salvo!",
    deleted: "Template excluído!",
    error: "Erro ao salvar template",
    blackWhite: "Preto/Branco",
    whiteBlack: "Branco/Preto",
    gradientBg: "Gradiente",
  },
  en: {
    title: "My Templates",
    description: "Save your favorite style configurations",
    noTemplates: "No saved templates",
    noTemplatesDesc: "Create custom templates for quick use.",
    addTemplate: "Create template",
    editTemplate: "Edit template",
    templateName: "Template name",
    templateNamePlaceholder: "Ex: My main style",
    font: "Font",
    style: "Background style",
    gradient: "Gradient",
    setAsDefault: "Set as default",
    save: "Save",
    cancel: "Cancel",
    deleteTitle: "Delete template?",
    deleteDesc: "This action cannot be undone.",
    delete: "Delete",
    saved: "Template saved!",
    deleted: "Template deleted!",
    error: "Error saving template",
    blackWhite: "Black/White",
    whiteBlack: "White/Black",
    gradientBg: "Gradient",
  },
  es: {
    title: "Mis Plantillas",
    description: "Guarda tus configuraciones de estilo favoritas",
    noTemplates: "Sin plantillas guardadas",
    noTemplatesDesc: "Crea plantillas personalizadas para uso rápido.",
    addTemplate: "Crear plantilla",
    editTemplate: "Editar plantilla",
    templateName: "Nombre de la plantilla",
    templateNamePlaceholder: "Ej: Mi estilo principal",
    font: "Fuente",
    style: "Estilo de fondo",
    gradient: "Gradiente",
    setAsDefault: "Establecer como predeterminado",
    save: "Guardar",
    cancel: "Cancelar",
    deleteTitle: "¿Eliminar plantilla?",
    deleteDesc: "Esta acción no se puede deshacer.",
    delete: "Eliminar",
    saved: "¡Plantilla guardada!",
    deleted: "¡Plantilla eliminada!",
    error: "Error al guardar plantilla",
    blackWhite: "Negro/Blanco",
    whiteBlack: "Blanco/Negro",
    gradientBg: "Gradiente",
  },
};

const CustomTemplatesManager = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = translations[language];
  const [templates, setTemplates] = useState<CustomTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<CustomTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<CustomTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    font_id: "inter" as FontId,
    style: "BLACK_WHITE" as 'BLACK_WHITE' | 'WHITE_BLACK' | 'GRADIENT',
    gradient_id: null as GradientId | null,
    is_default: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user]);

  const fetchTemplates = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("custom_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates((data as unknown as CustomTemplate[]) || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !formData.name.trim()) {
      toast({
        title: t.error,
        description: "Nome é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // If setting as default, unset other defaults first
      if (formData.is_default) {
        await supabase
          .from("custom_templates")
          .update({ is_default: false } as never)
          .eq("user_id", user.id);
      }

      const templateData = {
        user_id: user.id,
        name: formData.name.trim(),
        font_id: formData.font_id,
        style: formData.style,
        gradient_id: formData.style === 'GRADIENT' ? formData.gradient_id : null,
        is_default: formData.is_default,
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from("custom_templates")
          .update(templateData as never)
          .eq("id", editingTemplate.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("custom_templates")
          .insert(templateData as never);

        if (error) throw error;
      }

      toast({ title: t.saved });
      setDialogOpen(false);
      setEditingTemplate(null);
      resetForm();
      fetchTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: t.error,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;

    try {
      const { error } = await supabase
        .from("custom_templates")
        .delete()
        .eq("id", templateToDelete.id as never);

      if (error) throw error;

      toast({ title: t.deleted });
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
    }
  };

  const openEditDialog = (template: CustomTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      font_id: template.font_id,
      style: template.style,
      gradient_id: template.gradient_id,
      is_default: template.is_default,
    });
    setDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingTemplate(null);
    resetForm();
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      font_id: "inter",
      style: "BLACK_WHITE",
      gradient_id: null,
      is_default: false,
    });
  };

  const getGradientStyle = (colors: string[]) => {
    return `linear-gradient(135deg, ${colors.join(", ")})`;
  };

  const getStylePreview = (template: CustomTemplate) => {
    if (template.style === 'GRADIENT' && template.gradient_id) {
      const gradient = GRADIENT_PRESETS.find(g => g.id === template.gradient_id);
      if (gradient) {
        return { background: getGradientStyle(gradient.colors) };
      }
    }
    return { 
      background: template.style === 'BLACK_WHITE' ? '#000' : '#fff',
      color: template.style === 'BLACK_WHITE' ? '#fff' : '#000',
    };
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
                <Palette className="w-5 h-5 text-accent" />
                {t.title}
              </CardTitle>
              <CardDescription>{t.description}</CardDescription>
            </div>
            <Button onClick={openNewDialog}>
              <Plus className="w-4 h-4 mr-2" />
              {t.addTemplate}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Palette className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t.noTemplates}</p>
              <p className="text-sm">{t.noTemplatesDesc}</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => {
                const font = AVAILABLE_FONTS.find(f => f.id === template.font_id);
                const previewStyle = getStylePreview(template);
                
                return (
                  <div
                    key={template.id}
                    className="border rounded-lg p-4 hover:border-accent/50 transition-colors cursor-pointer relative group"
                    onClick={() => openEditDialog(template)}
                  >
                    {template.is_default && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                        <Star className="w-3 h-3 text-accent-foreground fill-current" />
                      </div>
                    )}
                    
                    <div 
                      className="h-20 rounded-lg mb-3 flex items-center justify-center text-sm"
                      style={{ 
                        ...previewStyle,
                        fontFamily: font?.family,
                      }}
                    >
                      Aa Bb Cc
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{template.name}</p>
                        <p className="text-xs text-muted-foreground">{font?.name}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTemplateToDelete(template);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? t.editTemplate : t.addTemplate}
            </DialogTitle>
            <DialogDescription>
              Configure as opções de estilo para seu template.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">{t.templateName}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t.templateNamePlaceholder}
              />
            </div>

            <div>
              <Label>{t.font}</Label>
              <Select
                value={formData.font_id}
                onValueChange={(value) => setFormData({ ...formData, font_id: value as FontId })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_FONTS.map((font) => (
                    <SelectItem key={font.id} value={font.id}>
                      <span style={{ fontFamily: font.family }}>{font.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t.style}</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { value: 'BLACK_WHITE', label: t.blackWhite, bg: '#000', color: '#fff' },
                  { value: 'WHITE_BLACK', label: t.whiteBlack, bg: '#fff', color: '#000' },
                  { value: 'GRADIENT', label: t.gradientBg, bg: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff' },
                ].map((style) => (
                  <button
                    key={style.value}
                    type="button"
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.style === style.value ? 'border-accent' : 'border-transparent'
                    }`}
                    style={{ background: style.bg, color: style.color }}
                    onClick={() => setFormData({ ...formData, style: style.value as typeof formData.style })}
                  >
                    <span className="text-xs">{style.label}</span>
                    {formData.style === style.value && (
                      <Check className="w-4 h-4 mx-auto mt-1" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {formData.style === 'GRADIENT' && (
              <div>
                <Label>{t.gradient}</Label>
                <div className="grid grid-cols-4 gap-2 mt-2 max-h-40 overflow-y-auto">
                  {GRADIENT_PRESETS.map((gradient) => (
                    <button
                      key={gradient.id}
                      type="button"
                      className={`h-12 rounded-lg border-2 transition-all ${
                        formData.gradient_id === gradient.id ? 'border-accent ring-2 ring-accent/50' : 'border-transparent'
                      }`}
                      style={{ background: getGradientStyle(gradient.colors) }}
                      onClick={() => setFormData({ ...formData, gradient_id: gradient.id })}
                      title={gradient.name}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="rounded border-input"
              />
              <Label htmlFor="is_default" className="cursor-pointer">
                {t.setAsDefault}
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.deleteDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CustomTemplatesManager;
