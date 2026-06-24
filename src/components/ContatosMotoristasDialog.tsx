import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AgendaItem } from "@/data/agendaData";
import { Copy, Send, Users, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";

interface ContatosMotoristasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: AgendaItem[];
}

const formatDate = (s: string) => {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};

const ContatosMotoristasDialog = ({ open, onOpenChange, items }: ContatosMotoristasDialogProps) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [telefoneCliente, setTelefoneCliente] = useState("");

  useEffect(() => {
    if (open) {
      // pré-seleciona todos por padrão
      setSelected(new Set(items.filter((i) => i.motorista && i.telefone).map((i) => i.id)));
      setTelefoneCliente("");
    }
  }, [open, items]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const selectable = items.filter((i) => i.motorista && i.telefone).map((i) => i.id);
    if (selected.size === selectable.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectable));
    }
  };

  const mensagem = useMemo(() => {
    const selecionados = items.filter((i) => selected.has(i.id));
    const linhas: string[] = [];
    selecionados.forEach((i) => {
      if (!i.motorista || !i.telefone) return;
      const partes = [
        i.hora || "",
        `O.S. ${i.cot || "—"}`,
        `SHT ${i.pax ?? "—"}`,
        i.motorista,
        i.telefone,
      ].filter(Boolean);
      linhas.push(partes.join(" — "));
    });
    if (linhas.length === 0) return "";
    return `Contatos dos motoristas:\n${linhas.join("\n")}`;
  }, [items, selected]);

  const handleCopy = async () => {
    if (!mensagem) {
      toast.error("Selecione ao menos um serviço com motorista e telefone");
      return;
    }
    try {
      await navigator.clipboard.writeText(mensagem);
      toast.success("Contatos copiados para a área de transferência");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const handleSendWhatsApp = () => {
    if (!mensagem) {
      toast.error("Selecione ao menos um serviço com motorista e telefone");
      return;
    }
    const phone = telefoneCliente.replace(/\D/g, "");
    if (phone.length < 10) {
      toast.error("Informe um telefone válido do cliente");
      return;
    }
    const phoneWithCountry = phone.startsWith("55") ? phone : `55${phone}`;
    const encoded = encodeURIComponent(mensagem);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const url = isMobile
      ? `https://wa.me/${phoneWithCountry}?text=${encoded}`
      : `https://web.whatsapp.com/send?phone=${phoneWithCountry}&text=${encoded}`;
    window.open(url, "_blank");
  };

  const selectableCount = items.filter((i) => i.motorista && i.telefone).length;
  const allSelected = selectableCount > 0 && selected.size === selectableCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            Enviar contatos dos motoristas ao cliente
          </DialogTitle>
          <DialogDescription>
            Selecione os serviços para gerar a lista de contatos (nome e telefone do motorista).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={toggleAll} className="gap-2">
              {allSelected ? <Square className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
              {allSelected ? "Desmarcar todos" : "Selecionar todos"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {selected.size} de {items.length} selecionados
            </span>
          </div>

          <div className="max-h-[40vh] overflow-y-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="px-2 py-1.5 text-left w-8"></th>
                  <th className="px-2 py-1.5 text-left">Data</th>
                  <th className="px-2 py-1.5 text-left">Hora</th>
                  <th className="px-2 py-1.5 text-left">Cliente</th>
                  <th className="px-2 py-1.5 text-left">Motorista</th>
                  <th className="px-2 py-1.5 text-left">Telefone</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => {
                  const disabled = !i.motorista || !i.telefone;
                  return (
                    <tr
                      key={i.id}
                      className={`border-t border-border ${disabled ? "opacity-50" : "hover:bg-muted/50 cursor-pointer"}`}
                      onClick={() => !disabled && toggle(i.id)}
                    >
                      <td className="px-2 py-1">
                        <Checkbox checked={selected.has(i.id)} disabled={disabled} onCheckedChange={() => toggle(i.id)} />
                      </td>
                      <td className="px-2 py-1 font-mono">{formatDate(i.data)}</td>
                      <td className="px-2 py-1 font-mono">{i.hora}</td>
                      <td className="px-2 py-1 truncate max-w-[140px]">{i.cliente}</td>
                      <td className="px-2 py-1">{i.motorista || "—"}</td>
                      <td className="px-2 py-1 font-mono">{i.telefone || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mensagem (editável)</p>
            <Textarea
              value={mensagem}
              readOnly
              rows={6}
              className="text-sm font-mono"
              placeholder="Selecione serviços acima para gerar a lista..."
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Telefone do cliente (opcional, para WhatsApp)</p>
            <Input
              type="tel"
              value={telefoneCliente}
              onChange={(e) => setTelefoneCliente(e.target.value)}
              placeholder="(61) 99999-0000"
              maxLength={20}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCopy} className="flex-1 gap-2">
              <Copy className="h-4 w-4" />
              Copiar
            </Button>
            <Button onClick={handleSendWhatsApp} className="flex-1 gap-2">
              <Send className="h-4 w-4" />
              Enviar via WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContatosMotoristasDialog;
