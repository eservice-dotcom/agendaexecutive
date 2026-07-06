import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Upload, FileText, Loader2, Trash2, X } from "lucide-react";
import { getClientes, getFornecedores, getMotoristas, getTiposServico, saveAgendaItem, saveCliente, getAgendaItems, updateAgendaItem } from "@/data/cadastroStorage";
import { supabase } from "@/integrations/supabase/client";
import type { Passageiro } from "@/data/agendaData";

// pdfjs-dist (v6, ESM)
import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - vite handles the URL
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorker;

interface ParsedService {
  selected: boolean;
  sht: string;
  os: string;
  data: string; // yyyy-mm-dd
  hora: string; // HH:MM
  tipo: string;
  veiculoTipo: string;
  origem: string;
  destino: string;
  observacoes: string;
  valor: number;
  passageiros: Passageiro[];
  fornecedorId: string;
  motoristaId: string;
  custo: string;
  // duplicate-detection metadata (filled after comparing with existing agenda items)
  status?: "novo" | "alterado" | "inalterado";
  existingId?: string;
  changedFields?: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

const ddmmyyyyToISO = (s: string): string => {
  const m = s.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (!m) return "";
  return `${m[3]}-${m[2]}-${m[1]}`;
};

// Build line-grouped text from a PDF page. Large horizontal gaps within a line are marked with TAB so callers can split columns.
const extractPageLines = async (page: any): Promise<string[]> => {
  const content = await page.getTextContent();
  const items: { str: string; x: number; y: number; w: number }[] = content.items
    .filter((i: any) => i.str && i.str.trim().length > 0)
    .map((i: any) => ({ str: i.str, x: i.transform[4], y: i.transform[5], w: i.width || 0 }));
  items.sort((a, b) => (b.y - a.y) || (a.x - b.x));
  const lines: { y: number; items: typeof items }[] = [];
  for (const it of items) {
    const cur = lines[lines.length - 1];
    if (cur && Math.abs(cur.y - it.y) < 3) {
      cur.items.push(it);
    } else {
      lines.push({ y: it.y, items: [it] });
    }
  }
  return lines.map((l) => {
    const sorted = l.items.sort((a, b) => a.x - b.x);
    let out = "";
    let prevEnd = -1;
    for (const it of sorted) {
      if (prevEnd >= 0 && it.x - prevEnd > 60) out += "\t";
      else if (out) out += " ";
      out += it.str;
      prevEnd = it.x + (it.w || 0);
    }
    return out.replace(/[ ]+/g, " ").trim();
  });
};

const extractOsFromProposta = (text: string): string => {
  // "Proposta: COT-268881-W2S5D7" → "268881"
  const m = text.match(/Proposta[^\n]*?[A-Z]{2,}-(\d+)-[A-Z0-9]+/i);
  return m ? m[1] : "";
};

const parsePDF = async (file: File): Promise<ParsedService[]> => {
  const buf = await file.arrayBuffer();
  const pdf = await (pdfjsLib as any).getDocument({ data: buf }).promise;
  const allLines: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const lines = await extractPageLines(page);
    allLines.push(...lines, "---PAGE---");
  }

  // Global O.S. extracted from any "Proposta:" line in the document.
  const globalOs = extractOsFromProposta(allLines.join("\n"));

  // Split into service blocks by SHT marker. The "Veículo X" line precedes the SHT line in this layout,
  // so we look back one line when starting a new block.
  const fullText = allLines.join("\n");
  const blocks: { sht: string; lines: string[]; veiculo?: string; tipo?: string }[] = [];
  let current: { sht: string; lines: string[]; veiculo?: string; tipo?: string } | null = null;
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    const shtMatch = line.match(/SHT-(\d+)/);
    if (shtMatch && /Servi[çc]o\s*-\s*SHT/i.test(line)) {
      if (current) blocks.push(current);
      // Look back for "Veículo <tipo>" line (skip blanks/page markers)
      let veiculo = "";
      for (let j = i - 1; j >= 0 && j >= i - 4; j--) {
        const prev = allLines[j];
        if (!prev || prev === "---PAGE---") continue;
        const vm = prev.match(/^\s*Ve[íi]culo\s+(.+?)\s*$/i);
        if (vm) { veiculo = vm[1].trim(); break; }
        // stop if we hit another structural line
        if (/Fornecedor:|Cliente Final:|À Faturar:|SHT-/i.test(prev)) break;
      }
      // Tipo de serviço appears on the same SHT line after the second column (TAB-separated)
      // e.g. "1\tServiço - SHT-1769088\tServiço Traslado (Ida ou Volta)"
      let tipo = "";
      const cols = line.split("\t");
      for (const c of cols) {
        const tm = c.match(/^\s*Servi[çc]o\s+(.+)$/i);
        if (tm && !/SHT-/i.test(c)) { tipo = tm[1].trim(); break; }
      }
      current = { sht: shtMatch[1], lines: [line], veiculo, tipo };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) blocks.push(current);

  const services: ParsedService[] = blocks.map((b) => {
    const text = b.lines.join("\n");

    const dataAp = text.match(/Data de Apresenta[çc][ãa]o[^\d]*(\d{2}-\d{2}-\d{4})\s+(\d{2}:\d{2})/i);
    const dataSa = text.match(/Data de Sa[íi]da[^\d]*(\d{2}-\d{2}-\d{4})\s+(\d{2}:\d{2})/i);
    const valorM = text.match(/Valor\s*R\$\s*([\d.,]+)/i);

    // Veículo & tipo serviço — preferentially from the block header captured above; fallback to scanning lines.
    let veiculo = b.veiculo || "";
    let tipo = b.tipo || "";
    if (!veiculo || !tipo) {
      for (const ln of b.lines) {
        if (!veiculo) {
          const v = ln.match(/^\s*Ve[íi]culo\s+(.+?)\s*$/i);
          if (v && !/SHT-/i.test(v[1])) veiculo = v[1].trim();
        }
        if (!tipo) {
          const t = ln.match(/^\s*Servi[çc]o\s+([A-Za-zÀ-ÿ].+)$/);
          if (t && !/SHT-/i.test(ln)) tipo = t[1].trim();
        }
        if (veiculo && tipo) break;
      }
    }


    // (origem/destino computed below using two-column layout)
    // Local de Apresentação & Local de Destino — labels appear BELOW the address text in two columns separated by a TAB.
    let origem = "";
    let destino = "";
    const labelIdx = b.lines.findIndex(
      (l) => /Local de Apresenta[çc][ãa]o/i.test(l) && /Local de Destino/i.test(l)
    );
    const STOP_RE = /Valor\s*R\$|Data de (Apresenta|Sa[íi]da)|Telefone|Motorista|Placa|Ve[íi]culo|Servi[çc]o\s*-?\s*SHT|Fornecedor:|Cliente Final:|À Faturar:|^---PAGE---$/i;
    if (labelIdx >= 0) {
      // collect address rows immediately above the label until we hit a stop marker
      const rows: string[] = [];
      for (let i = labelIdx - 1; i >= 0; i--) {
        const ln = b.lines[i];
        if (!ln.trim()) continue;
        if (STOP_RE.test(ln)) break;
        rows.unshift(ln);
      }
      // also pick up any trailing text on the label line itself (after the labels)
      const labelLine = b.lines[labelIdx];
      const labelParts = labelLine.split("\t").map((s) => s.trim());
      const tailOri = labelParts[0]?.replace(/Local de Apresenta[çc][ãa]o/i, "").trim() || "";
      const tailDes = labelParts[1]?.replace(/Local de Destino/i, "").trim() || "";
      const oriParts: string[] = [];
      const desParts: string[] = [];
      for (const r of rows) {
        const cols = r.split("\t");
        if (cols.length >= 2) {
          if (cols[0].trim()) oriParts.push(cols[0].trim());
          if (cols[1].trim()) desParts.push(cols[1].trim());
        } else {
          // single column — assume it belongs to origem
          if (cols[0].trim()) oriParts.push(cols[0].trim());
        }
      }
      if (tailOri) oriParts.push(tailOri);
      if (tailDes) desParts.push(tailDes);
      origem = oriParts.join(" ").replace(/\s+/g, " ").trim();
      destino = desParts.join(" ").replace(/\s+/g, " ").trim();
    }

    // Observação
    let observacoes = "";
    const obsIdx = b.lines.findIndex((l) => /^Observa[çc][ãa]o/i.test(l));
    if (obsIdx >= 0) {
      const parts: string[] = [];
      const first = b.lines[obsIdx].replace(/Observa[çc][ãa]o/i, "").trim();
      if (first) parts.push(first);
      for (let i = obsIdx + 1; i < b.lines.length; i++) {
        const ln = b.lines[i];
        if (/Passageiro\s+Telefone|^Passageiro$|Telefone\s+Documento|Voo\s*$|---PAGE---/i.test(ln)) break;
        if (/Motorista faz/i.test(ln)) continue;
        parts.push(ln);
      }
      observacoes = parts.join(" ").replace(/\s+/g, " ").trim();
    }

    // Passageiros — after a "Passageiro ... Voo" header row
    const passageiros: Passageiro[] = [];
    const paxHeaderIdx = b.lines.findIndex((l) => /Passageiro\s+Telefone\s+Documento\s+Voo/i.test(l) || /Passageiro.*Voo/i.test(l));
    if (paxHeaderIdx >= 0) {
      for (let i = paxHeaderIdx + 1; i < b.lines.length; i++) {
        const ln = b.lines[i];
        if (/Fornecedor:|^---PAGE---$|Total:\s*R\$/i.test(ln)) break;
        if (!ln.trim()) continue;
        // Try to split: name + phone + voo (e.g. "LA 3749")
        const vooM = ln.match(/([A-Z]{1,3}\s?\d{3,5})\s*$/);
        const voo = vooM ? vooM[1].trim() : "";
        let rest = vooM ? ln.slice(0, vooM.index).trim() : ln.trim();
        const telM = rest.match(/([\(\)\d\s.\-]{8,})\s*$/);
        const telefone = telM ? telM[1].trim() : "";
        const nome = telM ? rest.slice(0, telM.index).trim() : rest;
        if (nome) passageiros.push({ nome, telefone, voo });
      }
    }

    const valor = valorM ? (() => {
      const raw = valorM[1];
      // Detect Brazilian (1.234,56) vs US (1,234.56 or 500.00) format by position of last comma/dot.
      const lastComma = raw.lastIndexOf(",");
      const lastDot = raw.lastIndexOf(".");
      if (lastComma > lastDot) {
        // Brazilian: dots = thousands, comma = decimal
        return parseFloat(raw.replace(/\./g, "").replace(",", ".")) || 0;
      }
      // US / plain: commas = thousands, dot = decimal
      return parseFloat(raw.replace(/,/g, "")) || 0;
    })() : 0;
    const baseDate = dataSa || dataAp;
    const data = baseDate ? ddmmyyyyToISO(baseDate[1]) : "";
    const hora = baseDate ? baseDate[2] : "";

    return {
      selected: true,
      sht: b.sht,
      os: globalOs,
      data,
      hora,
      tipo: tipo || "Translado",
      veiculoTipo: veiculo,
      origem,
      destino,
      observacoes,
      valor,
      passageiros,
      fornecedorId: "",
      motoristaId: "",
      custo: "",
    };
  });

  return services;
};

const ImportarPDFDialog = ({ open, onOpenChange, onImported }: Props) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<ParsedService[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [tipos, setTipos] = useState<string[]>([]);
  const [clienteShiftId, setClienteShiftId] = useState<string>("");
  const [placaUrls, setPlacaUrls] = useState<string[]>([]);
  const [uploadingPlaca, setUploadingPlaca] = useState(false);

  const handlePlacaFiles = async (files: File[]) => {
    if (!files.length) return;
    setUploadingPlaca(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) throw new Error("Sessão expirada. Faça login novamente.");
      const novos: string[] = [];
      for (const file of files) {
        const ext = (file.name.split(".").pop() || "pdf").toLowerCase();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("placas-receptivo")
          .upload(path, file, { upsert: false, contentType: file.type || "application/pdf" });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("placas-receptivo").getPublicUrl(path);
        novos.push(data.publicUrl);
      }
      setPlacaUrls((prev) => [...prev, ...novos]);
      toast.success(`${novos.length} PDF de placa anexado(s).`);
    } catch (e: any) {
      console.error("[ImportPDF placa] falha:", e);
      toast.error("Erro ao enviar PDF da placa: " + (e?.message || ""));
    } finally {
      setUploadingPlaca(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [cls, fs, ms, ts] = await Promise.all([
        getClientes(), getFornecedores(), getMotoristas(), getTiposServico(),
      ]);
      setClientes(cls);
      setFornecedores(fs);
      setMotoristas(ms);
      setTipos(ts);
      const shift = cls.find((c: any) => /shift/i.test(c.nome));
      if (shift) setClienteShiftId(shift.id);
    })();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setServices([]);
      setClienteShiftId("");
    }
  }, [open]);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setLoading(true);
    try {
      const parsed = await parsePDF(file);
      if (parsed.length === 0) {
        toast.error("Nenhum serviço identificado no PDF.");
      } else {
        // Compare with existing agenda items to detect duplicates / changes
        let existing: any[] = [];
        try { existing = await getAgendaItems(); } catch {}
        const shtSet = new Set(parsed.map((p) => p.sht));
        const byCot = new Map<string, any>();
        for (const it of existing) {
          // Match by SHT (preferred) or fallback to cot for legacy items imported before the SHT field existed.
          const key = (it as any).sht ? String((it as any).sht) : (it.cot ? String(it.cot) : "");
          if (key && shtSet.has(key)) byCot.set(key, it);
        }
        const norm = (s: any) => String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
        const tagged: ParsedService[] = parsed.map((p) => {
          const ex = byCot.get(p.sht);
          if (!ex) return { ...p, status: "novo" as const };
          const changed: string[] = [];
          if (norm(ex.data) !== norm(p.data)) changed.push("data");
          if (norm(ex.hora) !== norm(p.hora)) changed.push("hora");
          if (norm(ex.tipo) !== norm(p.tipo)) changed.push("tipo");
          if (norm(ex.veiculo) !== norm(p.veiculoTipo)) changed.push("veículo");
          if (norm(ex.origem) !== norm(p.origem)) changed.push("origem");
          if (norm(ex.destino) !== norm(p.destino)) changed.push("destino");
          if (Number(ex.valor || 0) !== Number(p.valor || 0)) changed.push("valor");
          if (norm(ex.observacoes) !== norm(p.observacoes)) changed.push("obs");
          const exPax = JSON.stringify((ex.passageiros || []).map((x: any) => ({ n: norm(x.nome), v: norm(x.voo), t: norm(x.telefone) })));
          const pPax = JSON.stringify((p.passageiros || []).map((x: any) => ({ n: norm(x.nome), v: norm(x.voo), t: norm(x.telefone) })));
          if (exPax !== pPax) changed.push("passageiros");
          if (changed.length === 0) {
            return { ...p, status: "inalterado" as const, existingId: ex.id, selected: false };
          }
          // pre-fill fornecedor/motorista IDs from existing record so the user doesn't re-pick them
          const fornecedorMatch = fornecedores.find((f) => norm(f.razaoSocial) === norm(ex.fornecedor));
          const motoristaMatch = motoristas.find((m) => norm(m.nome) === norm(ex.motorista));
          return {
            ...p,
            status: "alterado" as const,
            existingId: ex.id,
            changedFields: changed,
            fornecedorId: fornecedorMatch?.id || p.fornecedorId,
            motoristaId: motoristaMatch?.id || p.motoristaId,
            custo: ex.custo ? String(ex.custo) : p.custo,
          };
        });
        const novos = tagged.filter((t) => t.status === "novo").length;
        const alterados = tagged.filter((t) => t.status === "alterado").length;
        const iguais = tagged.filter((t) => t.status === "inalterado").length;
        setServices(tagged);
        toast.success(`${tagged.length} serviço(s) lido(s). ${novos} novo(s), ${alterados} alterado(s), ${iguais} sem mudanças.`);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Falha ao ler o PDF: " + (e?.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const updateService = (idx: number, patch: Partial<ParsedService>) => {
    setServices((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const removeService = (idx: number) => {
    setServices((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleImport = async () => {
    const toImport = services.filter((s) => s.selected);
    if (toImport.length === 0) {
      toast.error("Selecione ao menos um serviço.");
      return;
    }
    let clienteNome = "Shift";
    if (clienteShiftId) {
      const c = clientes.find((x) => x.id === clienteShiftId);
      if (c) clienteNome = c.nome;
    } else {
      // Auto-create "Shift" cliente if missing
      try {
        const novo: any = await saveCliente({ nome: "Shift", contato: "", telefone: "", endereco: "" } as any);
        clienteNome = novo?.nome || "Shift";
      } catch {}
    }

    setSaving(true);
    // Load existing items once so we can preserve manual fields on update
    let existingItems: any[] = [];
    try { existingItems = await getAgendaItems(); } catch {}
    const existingById = new Map(existingItems.map((i) => [i.id, i]));
    let inseridos = 0, atualizados = 0, fail = 0;
    for (const s of toImport) {
      try {
        const forn = fornecedores.find((f) => f.id === s.fornecedorId);
        const mot = motoristas.find((m) => m.id === s.motoristaId);
        if (s.status === "alterado" && s.existingId && existingById.has(s.existingId)) {
          // Preserve manual fields (placa, km, hora_in/fim, extras, anexos, etc.) and only overwrite PDF-derived fields + the chosen fornecedor/motorista/custo.
          const prev = existingById.get(s.existingId);
          await updateAgendaItem({
            ...prev,
            data: s.data,
            hora: s.hora,
            cliente: clienteNome,
            pax: s.passageiros.length,
            passageiros: s.passageiros,
            cot: s.os,
            sht: s.sht,
            tipo: s.tipo,
            origem: s.origem,
            destino: s.destino,
            veiculo: s.veiculoTipo,
            valor: s.valor,
            observacoes: s.observacoes,
            motorista: mot?.nome || prev.motorista || "",
            telefone: mot?.telefone || prev.telefone || "",
            fornecedor: forn?.razaoSocial || prev.fornecedor || "",
            custo: forn?.razaoSocial?.toLowerCase().includes("executive")
              ? 0
              : (parseFloat(s.custo) || Number(prev.custo) || 0),
          });
          atualizados++;
        } else {
          await saveAgendaItem({
            data: s.data,
            hora: s.hora,
            cliente: clienteNome,
            pax: s.passageiros.length,
            passageiros: s.passageiros,
            cot: s.os,
            sht: s.sht,
            tipo: s.tipo,
            origem: s.origem,
            destino: s.destino,
            placa: "",
            veiculo: s.veiculoTipo,
            motorista: mot?.nome || "",
            telefone: mot?.telefone || "",
            valor: s.valor,
            fornecedor: forn?.razaoSocial || "",
            custo: forn?.razaoSocial?.toLowerCase().includes("executive") ? 0 : (parseFloat(s.custo) || 0),
            observacoes: s.observacoes,
            receptivo: "",
            statusFaturamento: "",
            outrosDespesas: [],
          } as any);
          inseridos++;
        }
      } catch (e) {
        console.error("Erro ao importar SHT", s.sht, e);
        fail++;
      }
    }
    setSaving(false);
    toast.success(
      `${inseridos} novo(s), ${atualizados} atualizado(s).` + (fail ? ` ${fail} falharam.` : "")
    );
    if (inseridos + atualizados > 0) {
      onImported();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Importar PDF de Pedidos (Shift)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {services.length === 0 && (
            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-lg p-10 cursor-pointer hover:bg-muted/50 transition">
              {loading ? (
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="h-10 w-10 text-muted-foreground" />
              )}
              <div className="text-center">
                <p className="text-sm font-medium">{loading ? "Lendo PDF..." : "Selecione ou arraste o PDF do pedido"}</p>
                <p className="text-xs text-muted-foreground">O sistema extrai automaticamente SHT, datas, horários, veículo, valor e passageiros</p>
              </div>
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                disabled={loading}
                onChange={(e) => handleFile(e.target.files?.[0] || null)}
              />
            </label>
          )}

          {services.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                  <Label>Cliente (todos os serviços)</Label>
                  <Select value={clienteShiftId} onValueChange={setClienteShiftId}>
                    <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Padrão: Shift. Fornecedor, motorista e custo são definidos por linha.</p>
                </div>
                <div className="text-sm text-muted-foreground">
                  <strong>{services.length}</strong> serviço(s) extraído(s). Revise antes de importar.
                </div>
              </div>

              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2"><Checkbox checked={services.every(s => s.selected)} onCheckedChange={(v) => setServices(prev => prev.map(s => ({ ...s, selected: !!v })))} /></th>
                      <th className="p-2 text-left">Status</th>
                      <th className="p-2 text-left">SHT</th>
                      <th className="p-2 text-left">O.S.</th>
                      <th className="p-2 text-left">Data</th>
                      <th className="p-2 text-left">Hora</th>
                      <th className="p-2 text-left">Tipo Serviço</th>
                      <th className="p-2 text-left">Tipo Veículo</th>
                      <th className="p-2 text-left">Origem</th>
                      <th className="p-2 text-left">Destino</th>
                      <th className="p-2 text-left">Valor</th>
                      
                      <th className="p-2 text-left">Fornecedor</th>
                      <th className="p-2 text-left">Motorista</th>
                      <th className="p-2 text-left">Custo</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((s, idx) => (
                      <tr key={idx} className={`border-t ${s.status === "inalterado" ? "opacity-60" : ""}`}>
                        <td className="p-1 text-center">
                          <Checkbox checked={s.selected} onCheckedChange={(v) => updateService(idx, { selected: !!v })} />
                        </td>
                        <td className="p-1">
                          {s.status === "novo" && (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">NOVO</span>
                          )}
                          {s.status === "alterado" && (
                            <span
                              className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800"
                              title={`Campos alterados: ${(s.changedFields || []).join(", ")}`}
                            >
                              ALTERADO
                            </span>
                          )}
                          {s.status === "inalterado" && (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground">SEM MUDANÇAS</span>
                          )}
                        </td>
                        <td className="p-1">
                          <Input value={s.sht} onChange={(e) => updateService(idx, { sht: e.target.value })} className="h-8 w-28" />
                        </td>
                        <td className="p-1">
                          <Input value={s.os} onChange={(e) => updateService(idx, { os: e.target.value })} className="h-8 w-28" placeholder="O.S." />
                        </td>
                        <td className="p-1">
                          <Input type="date" value={s.data} onChange={(e) => updateService(idx, { data: e.target.value })} className="h-8 w-36" />
                        </td>
                        <td className="p-1">
                          <Input type="time" value={s.hora} onChange={(e) => updateService(idx, { hora: e.target.value })} className="h-8 w-24" />
                        </td>
                        <td className="p-1">
                          <Select value={s.tipo} onValueChange={(v) => updateService(idx, { tipo: v })}>
                            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {tipos.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                              {tipos.indexOf(s.tipo) < 0 && s.tipo ? <SelectItem value={s.tipo}>{s.tipo}</SelectItem> : null}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-1">
                          <Input value={s.veiculoTipo} onChange={(e) => updateService(idx, { veiculoTipo: e.target.value })} className="h-8 w-36" />
                        </td>
                        <td className="p-1">
                          <Input value={s.origem} onChange={(e) => updateService(idx, { origem: e.target.value })} className="h-8 w-56" title={s.origem} />
                        </td>
                        <td className="p-1">
                          <Input value={s.destino} onChange={(e) => updateService(idx, { destino: e.target.value })} className="h-8 w-56" title={s.destino} />
                        </td>
                        <td className="p-1">
                          <Input type="number" step="0.01" value={s.valor} onChange={(e) => updateService(idx, { valor: parseFloat(e.target.value) || 0 })} className="h-8 w-24" />
                        </td>
                        
                        <td className="p-1">
                          <Select value={s.fornecedorId} onValueChange={(v) => updateService(idx, { fornecedorId: v })}>
                            <SelectTrigger className="h-8 w-40"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent>
                              {fornecedores.map((f) => (<SelectItem key={f.id} value={f.id}>{f.razaoSocial}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-1">
                          <Select value={s.motoristaId} onValueChange={(v) => updateService(idx, { motoristaId: v })}>
                            <SelectTrigger className="h-8 w-40"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent>
                              {motoristas.map((m) => (<SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-1">
                          <Input type="number" step="0.01" value={s.custo} onChange={(e) => updateService(idx, { custo: e.target.value })} className="h-8 w-24" placeholder="0,00" />
                        </td>
                        <td className="p-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeService(idx)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          {services.length > 0 && (
            <Button onClick={handleImport} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Importar {services.filter(s => s.selected).length} serviço(s) para Agenda
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportarPDFDialog;
