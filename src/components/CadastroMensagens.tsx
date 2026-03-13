import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { getMensagens, salvarMensagens, mensagensPadrao, MensagemTemplate } from "@/data/mensagensData";
import { Pencil, Save, X, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const CadastroMensagens = () => {
  const [mensagens, setMensagens] = useState<MensagemTemplate[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editTexto, setEditTexto] = useState("");

  useEffect(() => {
    setMensagens(getMensagens());
  }, []);

  const handleEdit = (msg: MensagemTemplate) => {
    setEditingId(msg.id);
    setEditTitulo(msg.titulo);
    setEditTexto(msg.texto);
  };

  const handleSave = () => {
    if (!editingId) return;
    const updated = mensagens.map((m) =>
      m.id === editingId ? { ...m, titulo: editTitulo, texto: editTexto } : m
    );
    setMensagens(updated);
    salvarMensagens(updated);
    setEditingId(null);
    toast.success("Mensagem atualizada com sucesso!");
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleReset = () => {
    setMensagens([...mensagensPadrao]);
    salvarMensagens([...mensagensPadrao]);
    setEditingId(null);
    toast.success("Mensagens restauradas ao padrão!");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Edite o título e o texto das mensagens. Use os placeholders: {"{data}"}, {"{hora}"}, {"{cliente}"}, {"{origem}"}, {"{destino}"}, {"{veiculo}"}, {"{placa}"}, {"{motorista}"}, {"{pax}"}, {"{cot}"} (O.S.), {"{tipo}"}, {"{voos}"}, {"{passageiros}"}
        </p>
        <Button variant="outline" size="sm" onClick={handleReset} className="gap-1 shrink-0">
          <RotateCcw className="h-3.5 w-3.5" />
          Restaurar padrão
        </Button>
      </div>

      <div className="grid gap-3">
        {mensagens.map((msg) => (
          <Card key={msg.id} className="border-border">
            <CardContent className="p-4">
              {editingId === msg.id ? (
                <div className="space-y-3">
                  <Input
                    value={editTitulo}
                    onChange={(e) => setEditTitulo(e.target.value)}
                    placeholder="Título"
                    className="font-medium"
                  />
                  <Textarea
                    value={editTexto}
                    onChange={(e) => setEditTexto(e.target.value)}
                    rows={4}
                    placeholder="Texto da mensagem"
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave} className="gap-1">
                      <Save className="h-3.5 w-3.5" />
                      Salvar
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancel} className="gap-1">
                      <X className="h-3.5 w-3.5" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{msg.titulo}</p>
                    <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{msg.texto}</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(msg)} className="shrink-0">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CadastroMensagens;
