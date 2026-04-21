import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AgendaItem } from "@/data/agendaData";
import { useState, useEffect } from "react";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WhatsAppFornecedorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fornecedorNome: string;
  items: AgendaItem[];
}

const buildFornecedorMessage = (fornecedor: string, items: AgendaItem[]) => {
  if (items.length === 0) return "";
  const first = items[0];
  const [y, m, d] = first.data.split("-");
  const dataFormatada = `${d}/${m}/${y}`;

  let msg = `Olá! Seguem os serviços do dia ${dataFormatada} para ${fornecedor}:\n`;

  items
    .sort((a, b) => a.hora.localeCompare(b.hora))
    .forEach((item, idx) => {
      const passageiros = item.passageiros.length > 0
        ? item.passageiros.map(p => p.nome).filter(Boolean).join(", ")
        : "—";
      const voos = item.passageiros.length > 0
        ? [...new Set(item.passageiros.map(p => p.voo).filter(Boolean))].join(", ")
        : "—";

      msg += `\n*Serviço ${idx + 1}*\n`;
      msg += `⏰ Hora: ${item.hora}\n`;
      msg += `📋 Cliente: ${item.cliente}\n`;
      msg += `👥 SHT: ${item.pax}\n`;
      msg += `👤 Passageiros: ${passageiros}\n`;
      msg += `✈️ Voo: ${voos}\n`;
      msg += `📍 Origem: ${item.origem}\n`;
      msg += `📍 Destino: ${item.destino}\n`;
      msg += `🚗 Veículo: ${item.veiculo} (${item.placa})\n`;
      msg += `👨‍✈️ Motorista: ${item.motorista}\n`;
    });

  msg += `\nQualquer dúvida, entre em contato.`;
  return msg;
};

const WhatsAppFornecedorDialog = ({ open, onOpenChange, fornecedorNome, items }: WhatsAppFornecedorDialogProps) => {
  const [mensagemFinal, setMensagemFinal] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && fornecedorNome) {
      setMensagemFinal(buildFornecedorMessage(fornecedorNome, items));
      fetchTelefone();
    }
  }, [open, fornecedorNome, items]);

  const fetchTelefone = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("fornecedores")
      .select("telefone")
      .eq("razao_social", fornecedorNome)
      .maybeSingle();
    setTelefone(data?.telefone || "");
    setLoading(false);
  };

  const handleSend = () => {
    if (!telefone) {
      toast.error("Telefone do fornecedor não encontrado. Cadastre o telefone em Cadastros → Fornecedores.");
      return;
    }
    const phone = telefone.replace(/\D/g, "");
    const phoneWithCountry = phone.startsWith("55") ? phone : `55${phone}`;
    const encoded = encodeURIComponent(mensagemFinal);
    window.open(`https://wa.me/${phoneWithCountry}?text=${encoded}`, "_blank");
    onOpenChange(false);
  };

  const handleClose = (v: boolean) => {
    onOpenChange(v);
    if (!v) {
      setMensagemFinal("");
      setTelefone("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-accent" />
            Enviar WhatsApp ao Fornecedor
          </DialogTitle>
          <DialogDescription>
            Para: <strong>{fornecedorNome}</strong>
            {loading ? (
              <span className="ml-2 inline-flex items-center gap-1 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Buscando telefone...
              </span>
            ) : telefone ? (
              <span> — {telefone}</span>
            ) : (
              <span className="ml-1 text-destructive text-xs">(telefone não cadastrado)</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {items.length} serviço(s) no dia
          </p>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pré-visualização (editável)</p>
            <Textarea
              value={mensagemFinal}
              onChange={(e) => setMensagemFinal(e.target.value)}
              rows={10}
              className="text-sm"
            />
            <Button onClick={handleSend} className="w-full gap-2" disabled={loading || !telefone}>
              <Send className="h-4 w-4" />
              Enviar via WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppFornecedorDialog;
