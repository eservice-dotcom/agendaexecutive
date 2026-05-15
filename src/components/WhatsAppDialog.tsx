import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getMensagens } from "@/data/mensagensData";
import { AgendaItem } from "@/data/agendaData";
import { useState, useMemo } from "react";
import { MessageCircle, Send, FileText, CalendarDays } from "lucide-react";

interface WhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AgendaItem | null;
  allItems?: AgendaItem[];
  onSent?: (item: AgendaItem, consolidatedItems?: AgendaItem[]) => void;
}

const replacePlaceholders = (texto: string, item: AgendaItem) => {
  const [y, m, d] = item.data.split("-");
  const voos = item.passageiros.length > 0
    ? [...new Set(item.passageiros.map(p => p.voo).filter(Boolean))].join(", ")
    : "—";
  const passageiros = item.passageiros.length > 0
    ? item.passageiros.map(p => p.nome).filter(Boolean).join(", ")
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
    .replace(/{voos}/g, voos)
    .replace(/{passageiros}/g, passageiros)
    .replace(/{observacoes}/g, item.observacoes || "—");
};

const buildConsolidatedMessage = (items: AgendaItem[]) => {
  if (items.length === 0) return "";
  const first = items[0];
  const [y, m, d] = first.data.split("-");
  const dataFormatada = `${d}/${m}/${y}`;

  let msg = `Olá ${first.motorista}! Seguem os serviços do dia ${dataFormatada}:\n`;

  items
    .sort((a, b) => a.hora.localeCompare(b.hora))
    .forEach((item, idx) => {
      const passageirosDetalhados = item.passageiros.length > 0
        ? item.passageiros
            .map(p => {
              const partes = [p.nome].filter(Boolean);
              if (p.voo) partes.push(`Voo ${p.voo}`);
              if (p.telefone) partes.push(`Tel ${p.telefone}`);
              return partes.join(" — ");
            })
            .filter(Boolean)
            .join("\n   • ")
        : "—";
      const voos = item.passageiros.length > 0
        ? [...new Set(item.passageiros.map(p => p.voo).filter(Boolean))].join(", ") || "—"
        : "—";

      msg += `\n*Serviço ${idx + 1}*\n`;
      msg += `⏰ Hora: ${item.hora}\n`;
      msg += `🏢 Cliente: ${item.cliente}\n`;
      msg += `👥 SHT: ${item.pax}\n`;
      msg += `👤 Passageiros:${item.passageiros.length > 1 ? "\n   • " : " "}${passageirosDetalhados}\n`;
      msg += `✈️ Voo: ${voos}\n`;
      msg += `📍 Origem: ${item.origem}\n`;
      msg += `📍 Destino: ${item.destino}\n`;
      if (item.observacoes) {
        msg += `📝 Obs: ${item.observacoes}\n`;
      }
    });

  msg += `\nQualquer dúvida, entre em contato.`;
  return msg;
};

const WhatsAppDialog = ({ open, onOpenChange, item, allItems = [], onSent }: WhatsAppDialogProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mensagemFinal, setMensagemFinal] = useState("");
  const [modoConsolidado, setModoConsolidado] = useState(false);
  const mensagens = getMensagens();

  const sameDayItems = useMemo(() => {
    if (!item) return [];
    return allItems.filter(
      (i) => i.motorista === item.motorista && i.data === item.data && i.id !== item.id
    );
  }, [item, allItems]);

  const allDriverDayItems = useMemo(() => {
    if (!item) return [];
    // Próximo dia (para incluir serviços agendados até 01:00 do dia seguinte)
    const [y, m, d] = item.data.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, d));
    next.setUTCDate(next.getUTCDate() + 1);
    const nextStr = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;

    return allItems
      .filter((i) => {
        if (i.motorista !== item.motorista) return false;
        if (i.data === item.data) return true;
        if (i.data === nextStr && i.hora && i.hora <= "01:00") return true;
        return false;
      })
      .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  }, [item, allItems]);

  if (!item) return null;

  const handleSelectTemplate = (id: string) => {
    setModoConsolidado(false);
    const template = mensagens.find((m) => m.id === id);
    if (template) {
      setSelectedId(id);
      setMensagemFinal(replacePlaceholders(template.texto, item));
    }
  };

  const handleConsolidado = () => {
    setSelectedId(null);
    setModoConsolidado(true);
    setMensagemFinal(buildConsolidatedMessage(allDriverDayItems));
  };

  const handleSend = () => {
    const phone = item.telefone.replace(/\D/g, "");
    const phoneWithCountry = phone.startsWith("55") ? phone : `55${phone}`;

    // Anexa link da placa de receptivo (se houver) ao final da mensagem.
    // No modo consolidado, agrupa todos os links únicos dos serviços do dia.
    const placas = modoConsolidado
      ? [...new Set(allDriverDayItems.map((i) => i.placaReceptivoUrl).filter(Boolean))]
      : [item.placaReceptivoUrl].filter(Boolean) as string[];

    let mensagemFinalComPlaca = mensagemFinal;
    if (placas.length > 0) {
      mensagemFinalComPlaca += `\n\n📎 Placa de receptivo:\n${placas.join("\n")}`;
    }

    const encoded = encodeURIComponent(mensagemFinalComPlaca);
    // Em desktop, wa.me abre o WhatsApp nativo via protocolo whatsapp:// que corrompe
    // emojis de plano suplementar (🏢 👥 📍). web.whatsapp.com preserva UTF-8 corretamente.
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const url = isMobile
      ? `https://wa.me/${phoneWithCountry}?text=${encoded}`
      : `https://web.whatsapp.com/send?phone=${phoneWithCountry}&text=${encoded}`;
    window.open(url, "_blank");

    // Abre cada arquivo de placa em nova aba para que o usuário possa baixar
    // ou anexar manualmente no WhatsApp (a API web não permite anexar via URL).
    placas.forEach((u) => window.open(u, "_blank"));

    if (item) {
      onSent?.(item, modoConsolidado ? allDriverDayItems : undefined);
    }
    onOpenChange(false);
    setSelectedId(null);
    setMensagemFinal("");
    setModoConsolidado(false);
  };

  const handleClose = (v: boolean) => {
    onOpenChange(v);
    if (!v) {
      setSelectedId(null);
      setMensagemFinal("");
      setModoConsolidado(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
          {allDriverDayItems.length > 0 && (
            <button
              onClick={handleConsolidado}
              className={`flex items-center gap-2 w-full rounded-md border p-3 text-left text-sm transition-colors ${
                modoConsolidado
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-muted/50"
              }`}
            >
              <CalendarDays className={`h-4 w-4 shrink-0 ${modoConsolidado ? "text-primary" : "text-muted-foreground"}`} />
              <div>
                <p className="font-medium text-foreground">
                  {allDriverDayItems.length === 1
                    ? "Serviço do dia (formato padrão)"
                    : `Todos os serviços do dia (${allDriverDayItems.length} serviços)`}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {allDriverDayItems.length === 1
                    ? "Envia o serviço do motorista no formato padronizado"
                    : "Envia todas as tarefas do motorista neste dia em uma única mensagem"}
                </p>
              </div>
            </button>
          )}

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Selecione uma mensagem</p>
          <div className="grid gap-2 max-h-64 overflow-y-auto pr-1">
            {mensagens.map((msg) => (
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

          {(selectedId || modoConsolidado) && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pré-visualização (editável)</p>
              <Textarea
                value={mensagemFinal}
                onChange={(e) => setMensagemFinal(e.target.value)}
                rows={6}
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
