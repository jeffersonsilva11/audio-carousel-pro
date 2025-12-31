import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Plus, Trash2, GripVertical, Quote, Eye, EyeOff, Star } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Testimonial {
  id: string;
  quote_pt: string;
  quote_en: string | null;
  quote_es: string | null;
  author_name: string;
  author_role_pt: string;
  author_role_en: string | null;
  author_role_es: string | null;
  author_company: string | null;
  author_avatar: string | null;
  metric_value: string | null;
  metric_label_pt: string | null;
  metric_label_en: string | null;
  metric_label_es: string | null;
  rating: number;
  display_order: number;
  is_active: boolean;
}

interface SortableItemProps {
  testimonial: Testimonial;
  onEdit: (t: Testimonial) => void;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}

const SortableTestimonialItem = ({ testimonial, onEdit, onToggle, onDelete }: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: testimonial.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-4 p-4 bg-card border rounded-xl ${!testimonial.is_active ? "opacity-50" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="w-5 h-5" />
      </button>
      
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {testimonial.author_avatar && (
          <img 
            src={testimonial.author_avatar} 
            alt={testimonial.author_name}
            className="w-10 h-10 rounded-full object-cover"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{testimonial.author_name}</p>
          <p className="text-sm text-muted-foreground truncate">{testimonial.author_role_pt}</p>
          <div className="flex gap-0.5 mt-1">
            {[...Array(testimonial.rating)].map((_, i) => (
              <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onToggle(testimonial.id, !testimonial.is_active)}
        >
          {testimonial.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onEdit(testimonial)}>
          <Quote className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(testimonial.id)} className="text-destructive hover:text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

const TestimonialsManager = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<Testimonial | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("pt");
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [formData, setFormData] = useState({
    quote_pt: "",
    quote_en: "",
    quote_es: "",
    author_name: "",
    author_role_pt: "",
    author_role_en: "",
    author_role_es: "",
    author_company: "",
    author_avatar: "",
    metric_value: "",
    metric_label_pt: "",
    metric_label_en: "",
    metric_label_es: "",
    rating: 5,
    is_active: true,
  });

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .order("display_order");

      if (error) throw error;
      setTestimonials(data || []);
    } catch (error) {
      console.error("Error fetching testimonials:", error);
      toast({ title: "Erro ao carregar depoimentos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = testimonials.findIndex((t) => t.id === active.id);
      const newIndex = testimonials.findIndex((t) => t.id === over.id);
      
      const newItems = arrayMove(testimonials, oldIndex, newIndex);
      setTestimonials(newItems);

      try {
        for (let i = 0; i < newItems.length; i++) {
          await supabase.from("testimonials").update({ display_order: i + 1 }).eq("id", newItems[i].id);
        }
        toast({ title: "Ordem atualizada!" });
      } catch (error) {
        fetchTestimonials();
      }
    }
  };

  const handleEdit = (item: Testimonial) => {
    setEditingItem(item);
    setFormData({
      quote_pt: item.quote_pt,
      quote_en: item.quote_en || "",
      quote_es: item.quote_es || "",
      author_name: item.author_name,
      author_role_pt: item.author_role_pt,
      author_role_en: item.author_role_en || "",
      author_role_es: item.author_role_es || "",
      author_company: item.author_company || "",
      author_avatar: item.author_avatar || "",
      metric_value: item.metric_value || "",
      metric_label_pt: item.metric_label_pt || "",
      metric_label_en: item.metric_label_en || "",
      metric_label_es: item.metric_label_es || "",
      rating: item.rating,
      is_active: item.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({
      quote_pt: "",
      quote_en: "",
      quote_es: "",
      author_name: "",
      author_role_pt: "",
      author_role_en: "",
      author_role_es: "",
      author_company: "",
      author_avatar: "",
      metric_value: "",
      metric_label_pt: "",
      metric_label_en: "",
      metric_label_es: "",
      rating: 5,
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.quote_pt || !formData.author_name || !formData.author_role_pt) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        quote_pt: formData.quote_pt,
        quote_en: formData.quote_en || null,
        quote_es: formData.quote_es || null,
        author_name: formData.author_name,
        author_role_pt: formData.author_role_pt,
        author_role_en: formData.author_role_en || null,
        author_role_es: formData.author_role_es || null,
        author_company: formData.author_company || null,
        author_avatar: formData.author_avatar || null,
        metric_value: formData.metric_value || null,
        metric_label_pt: formData.metric_label_pt || null,
        metric_label_en: formData.metric_label_en || null,
        metric_label_es: formData.metric_label_es || null,
        rating: formData.rating,
        is_active: formData.is_active,
      };

      if (editingItem) {
        const { error } = await supabase.from("testimonials").update(payload).eq("id", editingItem.id);
        if (error) throw error;
        toast({ title: "Depoimento atualizado!" });
      } else {
        const maxOrder = Math.max(...testimonials.map((t) => t.display_order), 0);
        const { error } = await supabase.from("testimonials").insert({ ...payload, display_order: maxOrder + 1 });
        if (error) throw error;
        toast({ title: "Depoimento criado!" });
      }

      setIsDialogOpen(false);
      fetchTestimonials();
    } catch (error) {
      console.error("Error saving:", error);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase.from("testimonials").update({ is_active: active }).eq("id", id);
      if (error) throw error;
      setTestimonials((prev) => prev.map((t) => (t.id === id ? { ...t, is_active: active } : t)));
      toast({ title: active ? "Depoimento ativado" : "Depoimento desativado" });
    } catch (error) {
      console.error("Error toggling:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este depoimento?")) return;

    try {
      const { error } = await supabase.from("testimonials").delete().eq("id", id);
      if (error) throw error;
      setTestimonials((prev) => prev.filter((t) => t.id !== id));
      toast({ title: "Depoimento excluído" });
    } catch (error) {
      console.error("Error deleting:", error);
      toast({ title: "Erro ao excluir", variant: "destructive" });
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
              <Quote className="w-5 h-5 text-accent" />
              Gerenciar Depoimentos
            </CardTitle>
            <CardDescription>Crie, edite e reordene os depoimentos da landing page</CardDescription>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Depoimento
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={testimonials.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {testimonials.map((item) => (
                <SortableTestimonialItem
                  key={item.id}
                  testimonial={item}
                  onEdit={handleEdit}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {testimonials.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum depoimento cadastrado.
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Depoimento" : "Novo Depoimento"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 mt-4">
            {/* Author info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do autor *</Label>
                <Input
                  value={formData.author_name}
                  onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                  placeholder="Maria Silva"
                />
              </div>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Input
                  value={formData.author_company}
                  onChange={(e) => setFormData({ ...formData, author_company: e.target.value })}
                  placeholder="Agência Digital"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>URL do Avatar</Label>
              <Input
                value={formData.author_avatar}
                onChange={(e) => setFormData({ ...formData, author_avatar: e.target.value })}
                placeholder="https://..."
              />
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Métrica (valor)</Label>
                <Input
                  value={formData.metric_value}
                  onChange={(e) => setFormData({ ...formData, metric_value: e.target.value })}
                  placeholder="+340%"
                />
              </div>
              <div className="space-y-2">
                <Label>Avaliação (1-5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) || 5 })}
                />
              </div>
            </div>

            {/* Language tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="pt">🇧🇷 Português</TabsTrigger>
                <TabsTrigger value="en">🇺🇸 English</TabsTrigger>
                <TabsTrigger value="es">🇪🇸 Español</TabsTrigger>
              </TabsList>

              <TabsContent value="pt" className="space-y-4">
                <div className="space-y-2">
                  <Label>Depoimento *</Label>
                  <Textarea
                    value={formData.quote_pt}
                    onChange={(e) => setFormData({ ...formData, quote_pt: e.target.value })}
                    placeholder="O que o cliente disse..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cargo *</Label>
                    <Input
                      value={formData.author_role_pt}
                      onChange={(e) => setFormData({ ...formData, author_role_pt: e.target.value })}
                      placeholder="Social Media Manager"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Label da métrica</Label>
                    <Input
                      value={formData.metric_label_pt}
                      onChange={(e) => setFormData({ ...formData, metric_label_pt: e.target.value })}
                      placeholder="engajamento"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="en" className="space-y-4">
                <div className="space-y-2">
                  <Label>Testimonial</Label>
                  <Textarea
                    value={formData.quote_en}
                    onChange={(e) => setFormData({ ...formData, quote_en: e.target.value })}
                    placeholder="What the customer said..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input
                      value={formData.author_role_en}
                      onChange={(e) => setFormData({ ...formData, author_role_en: e.target.value })}
                      placeholder="Social Media Manager"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Metric label</Label>
                    <Input
                      value={formData.metric_label_en}
                      onChange={(e) => setFormData({ ...formData, metric_label_en: e.target.value })}
                      placeholder="engagement"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="es" className="space-y-4">
                <div className="space-y-2">
                  <Label>Testimonio</Label>
                  <Textarea
                    value={formData.quote_es}
                    onChange={(e) => setFormData({ ...formData, quote_es: e.target.value })}
                    placeholder="Lo que dijo el cliente..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cargo</Label>
                    <Input
                      value={formData.author_role_es}
                      onChange={(e) => setFormData({ ...formData, author_role_es: e.target.value })}
                      placeholder="Social Media Manager"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Etiqueta de métrica</Label>
                    <Input
                      value={formData.metric_label_es}
                      onChange={(e) => setFormData({ ...formData, metric_label_es: e.target.value })}
                      placeholder="engagement"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Ativo</Label>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
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

export default TestimonialsManager;
