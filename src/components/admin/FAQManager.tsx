import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Plus, Trash2, GripVertical, HelpCircle, Eye, EyeOff } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface FAQ {
  id: string;
  question_pt: string;
  question_en: string | null;
  question_es: string | null;
  answer_pt: string;
  answer_en: string | null;
  answer_es: string | null;
  display_order: number;
  is_active: boolean;
}

interface SortableFAQItemProps {
  faq: FAQ;
  onEdit: (faq: FAQ) => void;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}

const SortableFAQItem = ({ faq, onEdit, onToggle, onDelete }: SortableFAQItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: faq.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-4 p-4 bg-card border rounded-xl ${!faq.is_active ? "opacity-50" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="w-5 h-5" />
      </button>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{faq.question_pt}</p>
        <p className="text-sm text-muted-foreground truncate mt-1">{faq.answer_pt}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onToggle(faq.id, !faq.is_active)}
          title={faq.is_active ? "Desativar" : "Ativar"}
        >
          {faq.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onEdit(faq)}>
          <HelpCircle className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(faq.id)} className="text-destructive hover:text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

const FAQManager = () => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("pt");
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [formData, setFormData] = useState({
    question_pt: "",
    question_en: "",
    question_es: "",
    answer_pt: "",
    answer_en: "",
    answer_es: "",
    is_active: true,
  });

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    try {
      const { data, error } = await supabase
        .from("faqs")
        .select("*")
        .order("display_order");

      if (error) throw error;
      setFaqs(data || []);
    } catch (error) {
      console.error("Error fetching FAQs:", error);
      toast({
        title: "Erro ao carregar FAQs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = faqs.findIndex((f) => f.id === active.id);
      const newIndex = faqs.findIndex((f) => f.id === over.id);
      
      const newFaqs = arrayMove(faqs, oldIndex, newIndex);
      setFaqs(newFaqs);

      // Update order in database
      try {
        for (let i = 0; i < newFaqs.length; i++) {
          await supabase
            .from("faqs")
            .update({ display_order: i + 1 })
            .eq("id", newFaqs[i].id);
        }
        toast({ title: "Ordem atualizada!" });
      } catch (error) {
        console.error("Error updating order:", error);
        fetchFaqs(); // Revert on error
      }
    }
  };

  const handleEdit = (faq: FAQ) => {
    setEditingFaq(faq);
    setFormData({
      question_pt: faq.question_pt,
      question_en: faq.question_en || "",
      question_es: faq.question_es || "",
      answer_pt: faq.answer_pt,
      answer_en: faq.answer_en || "",
      answer_es: faq.answer_es || "",
      is_active: faq.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingFaq(null);
    setFormData({
      question_pt: "",
      question_en: "",
      question_es: "",
      answer_pt: "",
      answer_en: "",
      answer_es: "",
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.question_pt || !formData.answer_pt) {
      toast({
        title: "Preencha pergunta e resposta em português",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingFaq) {
        const { error } = await supabase
          .from("faqs")
          .update({
            question_pt: formData.question_pt,
            question_en: formData.question_en || null,
            question_es: formData.question_es || null,
            answer_pt: formData.answer_pt,
            answer_en: formData.answer_en || null,
            answer_es: formData.answer_es || null,
            is_active: formData.is_active,
          })
          .eq("id", editingFaq.id);

        if (error) throw error;
        toast({ title: "FAQ atualizada!" });
      } else {
        const maxOrder = Math.max(...faqs.map((f) => f.display_order), 0);
        const { error } = await supabase.from("faqs").insert({
          question_pt: formData.question_pt,
          question_en: formData.question_en || null,
          question_es: formData.question_es || null,
          answer_pt: formData.answer_pt,
          answer_en: formData.answer_en || null,
          answer_es: formData.answer_es || null,
          is_active: formData.is_active,
          display_order: maxOrder + 1,
        });

        if (error) throw error;
        toast({ title: "FAQ criada!" });
      }

      setIsDialogOpen(false);
      fetchFaqs();
    } catch (error) {
      console.error("Error saving FAQ:", error);
      toast({
        title: "Erro ao salvar FAQ",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from("faqs")
        .update({ is_active: active })
        .eq("id", id);

      if (error) throw error;
      
      setFaqs((prev) =>
        prev.map((f) => (f.id === id ? { ...f, is_active: active } : f))
      );
      toast({ title: active ? "FAQ ativada" : "FAQ desativada" });
    } catch (error) {
      console.error("Error toggling FAQ:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta FAQ?")) return;

    try {
      const { error } = await supabase.from("faqs").delete().eq("id", id);
      if (error) throw error;
      
      setFaqs((prev) => prev.filter((f) => f.id !== id));
      toast({ title: "FAQ excluída" });
    } catch (error) {
      console.error("Error deleting FAQ:", error);
      toast({
        title: "Erro ao excluir FAQ",
        variant: "destructive",
      });
    }
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-accent" />
              Gerenciar FAQs
            </CardTitle>
            <CardDescription>
              Crie, edite e reordene as perguntas frequentes
            </CardDescription>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Nova FAQ
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={faqs.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {faqs.map((faq) => (
                <SortableFAQItem
                  key={faq.id}
                  faq={faq}
                  onEdit={handleEdit}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {faqs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma FAQ cadastrada. Clique em "Nova FAQ" para criar.
          </div>
        )}
      </CardContent>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFaq ? "Editar FAQ" : "Nova FAQ"}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="mb-4">
              <TabsTrigger value="pt">🇧🇷 Português</TabsTrigger>
              <TabsTrigger value="en">🇺🇸 English</TabsTrigger>
              <TabsTrigger value="es">🇪🇸 Español</TabsTrigger>
            </TabsList>

            <TabsContent value="pt" className="space-y-4">
              <div className="space-y-2">
                <Label>Pergunta *</Label>
                <Input
                  value={formData.question_pt}
                  onChange={(e) => setFormData({ ...formData, question_pt: e.target.value })}
                  placeholder="Digite a pergunta em português"
                />
              </div>
              <div className="space-y-2">
                <Label>Resposta *</Label>
                <Textarea
                  value={formData.answer_pt}
                  onChange={(e) => setFormData({ ...formData, answer_pt: e.target.value })}
                  placeholder="Digite a resposta em português"
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="en" className="space-y-4">
              <div className="space-y-2">
                <Label>Question (optional)</Label>
                <Input
                  value={formData.question_en}
                  onChange={(e) => setFormData({ ...formData, question_en: e.target.value })}
                  placeholder="Enter question in English"
                />
              </div>
              <div className="space-y-2">
                <Label>Answer (optional)</Label>
                <Textarea
                  value={formData.answer_en}
                  onChange={(e) => setFormData({ ...formData, answer_en: e.target.value })}
                  placeholder="Enter answer in English"
                  rows={4}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Se deixado em branco, será exibido o texto em português.
              </p>
            </TabsContent>

            <TabsContent value="es" className="space-y-4">
              <div className="space-y-2">
                <Label>Pregunta (opcional)</Label>
                <Input
                  value={formData.question_es}
                  onChange={(e) => setFormData({ ...formData, question_es: e.target.value })}
                  placeholder="Ingrese la pregunta en español"
                />
              </div>
              <div className="space-y-2">
                <Label>Respuesta (opcional)</Label>
                <Textarea
                  value={formData.answer_es}
                  onChange={(e) => setFormData({ ...formData, answer_es: e.target.value })}
                  placeholder="Ingrese la respuesta en español"
                  rows={4}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Se deixado em branco, será exibido o texto em português.
              </p>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>FAQ ativa</Label>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default FAQManager;
