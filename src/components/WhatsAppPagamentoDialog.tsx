import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContaPagarInfo {
  fornecedor: string;
  descritivo: string;
  valor: number;
  data: string;
  data_vencimento: string | null;
  data_pagamento: string | null;
  status: string;
  placa?: string;
}

interface VendaInfo {
  numero_venda: number;
  cliente: string;
  cots: string[];
}

interface WhatsAppPagamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conta: ContaPagarInfo | null;
  contas?: ContaPagarInfo[];
  vendaInfo?: VendaInfo | null;
  vendaInfoMap?: Record<string, VendaInfo>;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const buildSingleMessage = (conta: ContaPagarInfo, vendaInfo?: VendaInfo | null) => {
  let msg = `Olá *${conta.fornecedor}*!\n\n`;
  msg += `Segue informação de pagamento:\n\n`;

  if (vendaInfo) {
    msg += `📋 *Venda Nº ${vendaInfo.numero_venda}*\n`;
    if (vendaInfo.cots.length > 0) {
      msg += `🔢 O.S.: ${vendaInfo.cots.join(", ")}\n`;
    }
  }

  msg += `📝 Descritivo: ${conta.descritivo}\n`;
  msg += `💰 *Valor: ${formatCurrency(conta.valor)}*\n`;
  msg += `📅 Data: ${formatDate(conta.data)}\n`;

  if (conta.data_vencimento) {
    msg += `📅 Vencimento: ${formatDate(conta.data_vencimento)}\n`;
  }

  if (conta.data_pagamento) {
    msg += `✅ Pago em: ${formatDate(conta.data_pagamento)}\n`;
  }

  msg += `📊 Status: ${conta.status.toUpperCase()}\n`;
  msg += `\nQualquer dúvida, entre em contato.`;
  return msg;
};

const buildMultiMessage = (contas: ContaPagarInfo[], vendaInfoMap?: Record<string, VendaInfo>) => {
  const fornecedor = contas[0]?.fornecedor || "";
  let msg = `Olá *${fornecedor}*!\n\n`;
  msg += `Seguem informações de pagamento:\n`;

  const total = contas.reduce((s, c) => s + c.valor, 0);

  contas.forEach((conta, i) => {
    msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `*${i + 1}.* ${conta.descritivo}\n`;
    msg += `💰 *Valor: ${formatCurrency(conta.valor)}*\n`;
    msg += `📅 Data: ${formatDate(conta.data)}\n`;
    if (conta.data_vencimento) {
      msg += `📅 Vencimento: ${formatDate(conta.data_vencimento)}\n`;
    }
    if (conta.data_pagamento) {
      msg += `✅ Pago em: ${formatDate(conta.data_pagamento)}\n`;
    }
    msg += `📊 Status: ${conta.status.toUpperCase()}\n`;
  });

  msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `💰 *TOTAL: ${formatCurrency(total)}*\n`;
  msg += `\nQualquer dúvida, entre em contato.`;
  return msg;
};

const WhatsAppPagamentoDialog = ({ open, onOpenChange, conta, contas, vendaInfo, vendaInfoMap }: WhatsAppPagamentoDialogProps) => {
  const [mensagemFinal, setMensagemFinal] = useState("");
  const [telefone, setTelefone] = useState("");
  const [pix, setPix] = useState("");
  const [loading, setLoading] = useState(false);

  const allContas = contas && contas.length > 0 ? contas : conta ? [conta] : [];
  const isMulti = allContas.length > 1;
  const fornecedorName = allContas[0]?.fornecedor || "";

  useEffect(() => {
    if (open && allContas.length > 0) {
      if (isMulti) {
        setMensagemFinal(buildMultiMessage(allContas, vendaInfoMap));
      } else {
        setMensagemFinal(buildSingleMessage(allContas[0], vendaInfo));
      }
      fetchFornecedorData();
    }
  }, [open, conta, contas, vendaInfo, vendaInfoMap]);

  const fetchFornecedorData = async () => {
    if (allContas.length === 0) return;
    setLoading(true);
    const name = allContas[0].fornecedor;
    const { data } = await supabase
      .from("fornecedores")
      .select("telefone, pix")
      .ilike("razao_social", name)
      .maybeSingle();
    
    if (!data) {
      const { data: partial } = await supabase
        .from("fornecedores")
        .select("telefone, pix")
        .ilike("razao_social", `%${name}%`)
        .limit(1)
        .maybeSingle();
      setTelefone(partial?.telefone || "");
      setPix(partial?.pix || "");
    } else {
      setTelefone(data.telefone || "");
      setPix(data.pix || "");
    }
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
      setPix("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-accent" />
            Enviar Pagamento via WhatsApp
          </DialogTitle>
          <DialogDescription>
            Para: <strong>{fornecedorName}</strong>
            {isMulti && <span className="ml-1 text-xs">({allContas.length} contas)</span>}
            {loading ? (
              <span className="ml-2 inline-flex items-center gap-1 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Buscando dados...
              </span>
            ) : telefone ? (
              <span> — {telefone}</span>
            ) : (
              <span className="ml-1 text-destructive text-xs">(telefone não cadastrado)</span>
            )}
            {pix && (
              <span className="block text-xs mt-1">PIX: {pix}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pré-visualização (editável)</p>
            <Textarea
              value={mensagemFinal}
              onChange={(e) => setMensagemFinal(e.target.value)}
              rows={14}
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

export default WhatsAppPagamentoDialog;
