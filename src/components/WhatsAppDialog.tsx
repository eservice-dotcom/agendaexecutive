import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { mensagensPreCadastradas } from "@/data/mensagensData";
import { AgendaItem } from "@/data/agendaData";
import { useState } from "react";
import { MessageCircle, Send, FileText } from "lucide-react";

interface WhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AgendaItem | null;
}

const replacePlaceholders = (texto: string, item: AgendaItem) => {
  const [y, m, d] = item.data.split("-");
  const voos = item.passageiros.length > 0
    ? [...new Set(item.passageiros.map(p => p.voo).filter(Boolean))].join(", ")
    : "—";
  return texto
    .replace(/{data}/g, `${d}/${m}/${y}`)
    .replace(/{hora}/g, item.hora)
    .replace(/{cliente}/g, item.cliente)
    .replace(/{origem}/g, item.origem)
    .replace(/{destino}/g, item.destino)
    .replace(/{veiculo}/g, item.veiculo)
    .replace(/{placa}/g, item.placa)
    .replace(/{motorista}/g, item.motorista)
    .replace(/{pax}/g, String(item.pax))
    .replace(/{cot}/g, item.cot)
    .replace(/{tipo}/g, item.tipo)
    .replace(/{voos}/g, voos);
};

const WhatsAppDialog = ({ open, onOpenChange, item }: WhatsAppDialogProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mensagemFinal, setMensagemFinal] = useState("");

  if (!item) return null;

  const handleSelectTemplate = (id: string) => {
    const template = mensagensPreCadastradas.find((m) => m.id === id);
    if (template) {
      setSelectedId(id);
      setMensagemFinal(replacePlaceholders(template.texto, item));
    }
  };

  const handleSend = () => {
    const phone = item.telefone.replace(/\D/g, "");
    const phoneWithCountry = phone.startsWith("55") ? phone : `55${phone}`;
    const encoded = encodeURIComponent(mensagemFinal);
    window.open(`https://wa.me/${phoneWithCountry}?text=${encoded}`, "_blank");
    onOpenChange(false);
    setSelectedId(null);
    setMensagemFinal("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setSelectedId(null); setMensagemFinal(""); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-accent" />
            Enviar WhatsApp
          </DialogTitle>
          <DialogDescription>
            Para: <strong>{item.motorista}</strong> — {item.telefone}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Selecione uma mensagem</p>
          <div className="grid gap-2 max-h-64 overflow-y-auto pr-1">
            {mensagensPreCadastradas.map((msg) => (
              <button
                key={msg.id}
                onClick={() => handleSelectTemplate(msg.id)}
                className={`flex items-start gap-2 rounded-md border p-3 text-left text-sm transition-colors ${
                  selectedId === msg.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/50"
                }`}
              >
                <FileText className={`mt-0.5 h-4 w-4 shrink-0 ${selectedId === msg.id ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className="font-medium text-foreground">{msg.titulo}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{msg.texto}</p>
                </div>
              </button>
            ))}
          </div>

          {selectedId && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pré-visualização (editável)</p>
              <Textarea
                value={mensagemFinal}
                onChange={(e) => setMensagemFinal(e.target.value)}
                rows={4}
                className="text-sm"
              />
              <Button onClick={handleSend} className="w-full gap-2">
                <Send className="h-4 w-4" />
                Enviar via WhatsApp
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppDialog;
