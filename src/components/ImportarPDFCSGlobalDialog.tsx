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

import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorker;

interface ParsedService {
  selected: boolean;
  sht: string;
  os: string;
  data: string;
  hora: string;
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
  status?: "novo" | "alterado" | "inalterado";
  existingId?: string;
  changedFields?: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

const MESES: Record<string, string> = {
  jan: "01", fev: "02", mar: "03", abr: "04", mai: "05", jun: "06",
  jul: "07", ago: "08", set: "09", out: "10", nov: "11", dez: "12",
};

const parseDataServico = (s: string): string => {
  // "26 Jun 2026" -> "2026-06-26"
  const m = s.match(/(\d{1,2})\s+([A-Za-zç]{3,})\s+(\d{4})/);
  if (!m) return "";
  const dia = m[1].padStart(2, "0");
  const mesKey = m[2].slice(0, 3).toLowerCase();
  const mes = MESES[mesKey] || "";
  if (!mes) return "";
  return `${m[3]}-${mes}-${dia}`;
};

// Extract line-grouped text (same approach as Shift PDF)
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

const firstMatch = (lines: string[], re: RegExp): RegExpMatchArray | null => {
  for (const ln of lines) {
    const m = ln.match(re);
    if (m) return m;
  }
  return null;
};

const parsePDF = async (file: File): Promise<ParsedService[]> => {
  const buf = await file.arrayBuffer();
  const pdf = await (pdfjsLib as any).getDocument({ data: buf }).promise;
  const lines: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    lines.push(...(await extractPageLines(page)));
  }

  // Reserva # (O.S.)
  let os = "";
  const reservaLine = lines.findIndex((l) => /Reserva\s*#/i.test(l));
  if (reservaLine >= 0) {
    const m = lines[reservaLine].match(/Reserva\s*#\s*\t?\s*(\d+)/i);
    if (m) os = m[1];
    else {
      // number may be on next line
      for (let i = reservaLine + 1; i < Math.min(reservaLine + 3, lines.length); i++) {
        const n = lines[i].match(/^\s*(\d{4,})\s*$/);
        if (n) { os = n[1]; break; }
      }
    }
  }

  // Data do Serviço
  let data = "";
  const dataIdx = lines.findIndex((l) => /Data do Servi[çc]o/i.test(l));
  if (dataIdx >= 0) {
    // date may be on same line (after tab) or on next lines
    const m = lines[dataIdx].match(/(\d{1,2}\s+[A-Za-zç]{3,}\s+\d{4})/);
    if (m) data = parseDataServico(m[1]);
    if (!data) {
      for (let i = dataIdx; i < Math.min(dataIdx + 3, lines.length); i++) {
        const m2 = lines[i].match(/(\d{1,2}\s+[A-Za-zç]{3,}\s+\d{4})/);
        if (m2) { data = parseDataServico(m2[1]); break; }
      }
    }
  }

  // Horário de saída
  let hora = "";
  const horaM = firstMatch(lines, /Hor[áa]rio de sa[íi]da\s*#?\s*\t?\s*(\d{1,2}:\d{2})/i);
  if (horaM) hora = horaM[1];

  // Serviço (tipo) - it's in a column. Look for "Serviço" header, value on next non-empty line
  let tipo = "";
  const servHeaderIdx = lines.findIndex((l) => /^\s*Servi[çc]o\s*(?:Status)?\s*$/i.test(l) || /^Servi[çc]o\s+Status$/i.test(l));
  if (servHeaderIdx >= 0) {
    for (let i = servHeaderIdx + 1; i < Math.min(servHeaderIdx + 5, lines.length); i++) {
      const ln = lines[i].trim();
      if (!ln) continue;
      // e.g. "Origem Aeroporto\tUNPAID" or just "Origem Aeroporto"
      const parts = ln.split("\t");
      const cand = parts[0].trim();
      if (cand && !/^UNPAID|PAID|Detalhes/i.test(cand)) { tipo = cand; break; }
    }
  }

  // Veículo (Tipo de Veículo)
  let veiculo = "";
  const vHeaderIdx = lines.findIndex((l) => /Tipo de Ve[íi]culo/i.test(l));
  if (vHeaderIdx >= 0) {
    for (let i = vHeaderIdx + 1; i < Math.min(vHeaderIdx + 4, lines.length); i++) {
      const ln = lines[i].trim();
      if (!ln) continue;
      // veiculo is central column - it may share line with QTD Pax + Fornecedor separated by tabs
      const parts = ln.split("\t").map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        // middle column is veículo
        veiculo = parts[Math.floor(parts.length / 2) === parts.length - 1 ? 1 : Math.min(1, parts.length - 1)];
        // safer: pick element that isn't purely numeric
        const nonNum = parts.filter((p) => !/^\d+$/.test(p));
        if (nonNum.length) veiculo = nonNum[0];
      } else {
        veiculo = parts[0] || "";
      }
      if (veiculo) break;
    }
  }

  // Origem (PU:)
  let origem = "";
  const puIdx = lines.findIndex((l) => /^PU:/i.test(l));
  if (puIdx >= 0) {
    origem = lines[puIdx].replace(/^PU:\s*/i, "").trim();
  }

  // Destino (DO: + End.:)
  let destino = "";
  const doIdx = lines.findIndex((l) => /^DO:/i.test(l));
  if (doIdx >= 0) {
    const parts: string[] = [];
    const first = lines[doIdx].replace(/^DO:\s*/i, "").trim();
    if (first) parts.push(first);
    for (let i = doIdx + 1; i < Math.min(doIdx + 5, lines.length); i++) {
      const ln = lines[i];
      const em = ln.match(/^End\.?:\s*(.+)$/i);
      if (em) { parts.push(em[1].trim()); break; }
      if (/^Obs:|^Notas|^PU:/i.test(ln)) break;
    }
    destino = parts.join(" - ").replace(/\s+/g, " ").trim();
  }

  // Valor Total
  let valor = 0;
  const valorM = firstMatch(lines, /Valor\s*Total:?\s*\t?\s*R?\$?\s*([\d.,]+)/i);
  if (valorM) {
    const raw = valorM[1];
    const lastComma = raw.lastIndexOf(",");
    const lastDot = raw.lastIndexOf(".");
    if (lastComma > lastDot) {
      valor = parseFloat(raw.replace(/\./g, "").replace(",", ".")) || 0;
    } else {
      valor = parseFloat(raw.replace(/,/g, "")) || 0;
    }
  }

  // Passageiros
  const passageiros: Passageiro[] = [];
  // Voo (shared for main passenger)
  let vooShared = "";
  const vooM = firstMatch(lines, /Voo\s*#?:?\s*(\S+)/i);
  if (vooM && !/^Origem/i.test(vooM[1])) vooShared = vooM[1];

  const paxIdx = lines.findIndex((l) => /^Passageiro:/i.test(l));
  if (paxIdx >= 0) {
    // Name usually on next non-empty line, phone a couple lines later
    let nome = "";
    let telefone = "";
    for (let i = paxIdx + 1; i < Math.min(paxIdx + 6, lines.length); i++) {
      const ln = lines[i].trim();
      if (!ln) continue;
      if (/^Reservado em|^Solicitante|^PO\/voucher|^Passageiros Adicionais|^Tel:|^Email:|^Site:|^Av\.|^CNPJ/i.test(ln)) continue;
      // phone-like
      if (/^\+?\d[\d\s().\-]{6,}$/.test(ln)) { telefone = ln; continue; }
      if (!nome) nome = ln;
    }
    if (nome) passageiros.push({ nome, telefone, voo: vooShared });
  }

  // Passageiros adicionais
  const addIdx = lines.findIndex((l) => /Passageiros Adicionais/i.test(l));
  if (addIdx >= 0) {
    for (let i = addIdx + 1; i < lines.length; i++) {
      const ln = lines[i].trim();
      if (!ln) continue;
      if (/^PU:|^DO:|^Valor Total|^Notas|^Obs:|^Cia:|^Voo|^ETA|^Instru|^Detalhes|^Respons/i.test(ln)) break;
      const telM = ln.match(/([\+\(\)\d\s.\-]{8,})\s*$/);
      const telefone = telM ? telM[1].trim() : "";
      const nome = telM ? ln.slice(0, telM.index).trim() : ln;
      if (nome && nome.length > 2) passageiros.push({ nome, telefone, voo: "" });
    }
  }

  // Observações — "Obs da Reserva:" and "Obs:" blocks
  const obsParts: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    const m1 = ln.match(/^Obs da Reserva:\s*(.*)$/i);
    if (m1 && m1[1].trim()) obsParts.push(m1[1].trim());
    const m2 = ln.match(/^Notas do Pax:\s*(.*)$/i);
    if (m2 && m2[1].trim()) obsParts.push(m2[1].trim());
    const m3 = ln.match(/^Instru[çc][õo]es:\s*(.+)$/i);
    if (m3 && m3[1].trim()) obsParts.push("Instruções: " + m3[1].trim());
  }
  const observacoes = obsParts.join(" | ");

  return [{
    selected: true,
    sht: "",
    os,
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
  }];
};

const ImportarPDFCSGlobalDialog = ({ open, onOpenChange, onImported }: Props) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<ParsedService[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [tipos, setTipos] = useState<string[]>([]);
  const [clienteId, setClienteId] = useState<string>("");
  const [placaUrls, setPlacaUrls] = useState<string[]>([]);
  const [uploadingPlaca, setUploadingPlaca] = useState(false);
  const [advanced, setAdvanced] = useState(false);

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
      console.error(e);
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
      const cs = cls.find((c: any) => /cs\s*brasil/i.test(c.nome));
      if (cs) setClienteId(cs.id);
    })();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setServices([]);
      setClienteId("");
      setPlacaUrls([]);
      setAdvanced(false);
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
        let existing: any[] = [];
        try { existing = await getAgendaItems(); } catch {}
        const osSet = new Set(parsed.map((p) => p.os).filter(Boolean));
        const byOs = new Map<string, any>();
        for (const it of existing) {
          if (it.cot && osSet.has(String(it.cot))) byOs.set(String(it.cot), it);
        }
        const norm = (s: any) => String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
        const tagged: ParsedService[] = parsed.map((p) => {
          const ex = p.os ? byOs.get(p.os) : null;
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
          if (changed.length === 0) {
            return { ...p, status: "inalterado" as const, existingId: ex.id, selected: false };
          }
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
        setServices(tagged);
        toast.success(`${tagged.length} serviço(s) lido(s).`);
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
    let clienteNome = "CS Global";
    if (clienteId) {
      const c = clientes.find((x) => x.id === clienteId);
      if (c) clienteNome = c.nome;
    } else {
      try {
        const novo: any = await saveCliente({ nome: "CS Global", contato: "", telefone: "", endereco: "" } as any);
        clienteNome = novo?.nome || "CS Global";
      } catch {}
    }

    setSaving(true);
    let existingItems: any[] = [];
    try { existingItems = await getAgendaItems(); } catch {}
    const existingById = new Map(existingItems.map((i) => [i.id, i]));
    let inseridos = 0, atualizados = 0, fail = 0;
    for (const s of toImport) {
      try {
        const forn = fornecedores.find((f) => f.id === s.fornecedorId);
        const mot = motoristas.find((m) => m.id === s.motoristaId);
        if (s.status === "alterado" && s.existingId && existingById.has(s.existingId)) {
          const prev = existingById.get(s.existingId);
          await updateAgendaItem({
            ...prev,
            data: s.data,
            hora: s.hora,
            cliente: clienteNome,
            pax: s.passageiros.length,
            passageiros: s.passageiros,
            cot: s.os,
            sht: "",
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
            placaReceptivoUrls: [...new Set([...(prev.placaReceptivoUrls || []), ...(prev.placaReceptivoUrl ? [prev.placaReceptivoUrl] : []), ...placaUrls])],
            placaReceptivoUrl: prev.placaReceptivoUrl || placaUrls[0] || "",
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
            sht: "",
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
            placaReceptivoUrl: placaUrls[0] || "",
            placaReceptivoUrls: [...placaUrls],
          } as any);
          inseridos++;
        }
      } catch (e) {
        console.error("Erro ao importar O.S.", s.os, e);
        fail++;
      }
    }
    setSaving(false);
    toast.success(`${inseridos} novo(s), ${atualizados} atualizado(s).` + (fail ? ` ${fail} falharam.` : ""));
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
            Importar PDF de Pedidos (CS Global)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!advanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-lg p-8 cursor-pointer hover:bg-muted/50 transition">
                {loading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
                <div className="text-center">
                  <p className="text-sm font-medium">{loading ? "Lendo PDF..." : "PDF do serviço (CS Global)"}</p>
                  <p className="text-xs text-muted-foreground">Extrai Reserva (O.S.), data, hora, veículo, valor, passageiros e obs.</p>
                </div>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  disabled={loading}
                  onChange={(e) => handleFile(e.target.files?.[0] || null)}
                />
              </label>

              <label className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-lg p-8 cursor-pointer hover:bg-muted/50 transition ${placaUrls.length ? "border-emerald-500/60 bg-emerald-50/40" : "border-border"}`}>
                {uploadingPlaca ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : (
                  <FileText className={`h-8 w-8 ${placaUrls.length ? "text-emerald-600" : "text-muted-foreground"}`} />
                )}
                <div className="text-center">
                  <p className="text-sm font-medium">{uploadingPlaca ? "Enviando..." : "PDF da placa do serviço"}</p>
                  <p className="text-xs text-muted-foreground">
                    {placaUrls.length ? `${placaUrls.length} arquivo(s) anexado(s)` : "Opcional"}
                  </p>
                </div>
                <input
                  type="file"
                  accept="application/pdf,.pdf,image/*"
                  multiple
                  className="hidden"
                  disabled={uploadingPlaca}
                  onChange={(e) => handlePlacaFiles(Array.from(e.target.files || []))}
                />
              </label>
            </div>
          )}

          {placaUrls.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center text-xs">
              <span className="text-muted-foreground">Placas anexadas:</span>
              {placaUrls.map((u, i) => (
                <span key={u} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-100 text-emerald-800">
                  <FileText className="h-3 w-3" />
                  <a href={u} target="_blank" rel="noreferrer" className="underline">Placa {i + 1}</a>
                  <button
                    type="button"
                    className="ml-1 hover:text-destructive"
                    onClick={() => setPlacaUrls((prev) => prev.filter((x) => x !== u))}
                    aria-label="Remover"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {!advanced && (
            <div className="flex items-center justify-between gap-3 pt-2 border-t">
              <div className="text-xs text-muted-foreground">
                {services.length > 0
                  ? <><strong>{services.length}</strong> serviço(s) lido(s)</>
                  : "Anexe o PDF do serviço para avançar."}
              </div>
              <Button
                onClick={() => {
                  if (services.length === 0) {
                    toast.error("Anexe o PDF do serviço antes de avançar.");
                    return;
                  }
                  setAdvanced(true);
                }}
                disabled={services.length === 0 || loading || uploadingPlaca}
              >
                Avançar
              </Button>
            </div>
          )}

          {advanced && services.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                  <Label>Cliente (todos os serviços)</Label>
                  <Select value={clienteId} onValueChange={setClienteId}>
                    <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Padrão: CS Global. Fornecedor, motorista e custo são manuais.</p>
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

export default ImportarPDFCSGlobalDialog;
