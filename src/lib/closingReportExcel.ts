import * as XLSX from "xlsx";
import type { ClosingReportItem, ClosingReportVendaInfo } from "./closingReport";

const parseAmount = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const raw = value.trim();
  if (!raw) return 0;
  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");
  let normalized = raw;
  if (hasComma && hasDot) {
    normalized = raw.lastIndexOf(",") > raw.lastIndexOf(".")
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw.replace(/,/g, "");
  } else if (hasComma) {
    normalized = raw.replace(",", ".");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

interface NormalizedExtra {
  descricao: string;
  valor: number;
}

const normalizeExtras = (extras: Array<{ descricao?: unknown; valor?: unknown }> | undefined): NormalizedExtra[] => {
  const seen = new Set<string>();
  return (Array.isArray(extras) ? extras : [])
    .map((extra) => ({
      descricao: typeof extra?.descricao === "string" ? extra.descricao.trim() : "",
      valor: parseAmount(extra?.valor),
    }))
    .filter((extra) => extra.descricao && extra.valor > 0)
    .filter((extra) => {
      const key = `${extra.descricao.toLowerCase()}|${extra.valor.toFixed(2)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

/** Extract O.S. number from extra description like "Estacionamento O.S. 266300" */
const extractOsFromExtra = (descricao: string): string | null => {
  const match = descricao.match(/O\.S\.\s*(\S+)/i);
  return match ? match[1] : null;
};

/** Split extras into mapped (by O.S.) and unmapped */
const buildExtrasPerOs = (extras: NormalizedExtra[]): { mapped: Map<string, number>; unmapped: NormalizedExtra[] } => {
  const mapped = new Map<string, number>();
  const unmapped: NormalizedExtra[] = [];
  for (const extra of extras) {
    const os = extractOsFromExtra(extra.descricao);
    if (os) {
      mapped.set(os, (mapped.get(os) || 0) + extra.valor);
    } else {
      unmapped.push(extra);
    }
  }
  return { mapped, unmapped };
};

export const generateClosingReportExcel = (
  items: ClosingReportItem[],
  title: string,
  _subtitle: string,
  vendaInfo?: ClosingReportVendaInfo,
  numeroFechamento?: number
) => {
  const wb = XLSX.utils.book_new();

  const sortedItems = [...items].sort((a, b) => {
    const dateA = a.data || "";
    const dateB = b.data || "";
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return (a.hora || "").localeCompare(b.hora || "");
  });

  // Merge extras into corresponding service item rows by O.S. number
  const selectedExtras = normalizeExtras(vendaInfo?.extras);
  const { mapped: extrasPerOs, unmapped: unmappedExtras } = buildExtrasPerOs(selectedExtras);

  const rows = sortedItems.map((ai, idx) => {
    const kmTotal = (Number(ai.km_fim) || 0) - (Number(ai.km_in) || 0);
    const outrosDespesas = ai.outros_despesas
      ? Array.isArray(ai.outros_despesas) ? ai.outros_despesas : JSON.parse(ai.outros_despesas)
      : [];
    const outrosTotal =
      outrosDespesas.reduce((s: number, d: any) => s + parseAmount(d.valor), 0) +
      parseAmount(ai.outros);

    const osCot = ai.cot || "";
    const estac = Number(ai.estacionamento) || 0;

    return {
      "#": idx + 1,
      "O.S.": osCot,
      "Data": ai.data ? formatDate(ai.data) : "",
      "Hora": ai.hora || "",
      "Tipo": ai.tipo || "",
      "Origem": ai.origem || "",
      "Destino": ai.destino || "",
      "Motorista": ai.motorista || "",
      "Veículo": ai.veiculo || "",
      "Placa": ai.placa || "",
      "Hora Início": ai.hora_in || "",
      "Hora Fim": ai.hora_fim || "",
      "Hora Extra": ai.hora_extra || "",
      "KM Início": Number(ai.km_in) || 0,
      "KM Fim": Number(ai.km_fim) || 0,
      "KM Total": kmTotal,
      "KM Extra": Number(ai.km_extra) || 0,
      "Outros": outrosTotal,
      "Estacionamento": estac,
      "Valor": (Number(ai.valor) || 0) + estac,
    };
  });

  // Only add unmapped extras (not linked to a specific O.S.) as separate rows
  unmappedExtras.forEach((extra, idx) => {
    rows.push({
      "#": sortedItems.length + idx + 1,
      "O.S.": "EXTRA",
      "Data": "",
      "Hora": "",
      "Tipo": extra.descricao,
      "Origem": extra.descricao,
      "Destino": "",
      "Motorista": "",
      "Veículo": "",
      "Placa": "",
      "Hora Início": "",
      "Hora Fim": "",
      "Hora Extra": "",
      "KM Início": 0,
      "KM Fim": 0,
      "KM Total": 0,
      "KM Extra": 0,
      "Outros": 0,
      "Estacionamento": 0,
      "Valor": extra.valor,
    });
  });

  // Totals — sum the actual row values so columns reconcile with what's displayed
  const totalServicos = sortedItems.reduce((s, ai) => s + parseAmount(ai.valor), 0);
  const totalEstac = sortedItems.reduce((s, ai) => s + parseAmount(ai.estacionamento), 0);
  const totalKm = sortedItems.reduce((s, ai) => s + (parseAmount(ai.km_fim) - parseAmount(ai.km_in)), 0);
  const totalKmExtra = sortedItems.reduce((s, ai) => s + parseAmount(ai.km_extra), 0);
  const totalOutros = sortedItems.reduce((s, ai) => {
    const od = ai.outros_despesas
      ? Array.isArray(ai.outros_despesas) ? ai.outros_despesas : JSON.parse(ai.outros_despesas)
      : [];
    return s + od.reduce((ss: number, d: any) => ss + parseAmount(d.valor), 0) + parseAmount(ai.outros);
  }, 0);
  const unmappedExtrasTotal = unmappedExtras.reduce((s, e) => s + e.valor, 0);

  rows.push({
    "#": 0,
    "O.S.": "TOTAIS",
    "Data": "",
    "Hora": "",
    "Tipo": "",
    "Origem": "",
    "Destino": "",
    "Motorista": "",
    "Veículo": "",
    "Placa": "",
    "Hora Início": "",
    "Hora Fim": "",
    "Hora Extra": "",
    "KM Início": 0,
    "KM Fim": 0,
    "KM Total": totalKm,
    "KM Extra": totalKmExtra,
    "Outros": totalOutros,
    "Estacionamento": totalEstac,
    "Valor": totalServicos + totalEstac + unmappedExtrasTotal,
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 4 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 20 },
    { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Serviços");

  // --- Sheet 2: Resumo ---
  const totalGeral = totalServicos + totalEstac + unmappedExtrasTotal;
  const resumo = [
    { Campo: "Fechamento Nº", Valor: numeroFechamento || "" },
    { Campo: "Cliente", Valor: vendaInfo?.cliente || "" },
    { Campo: "Quantidade de Serviços", Valor: items.length },
    { Campo: "KM Total", Valor: totalKm },
    { Campo: "KM Extra", Valor: totalKmExtra },
    { Campo: "Estacionamento", Valor: totalEstac },
    { Campo: "Valor Total", Valor: totalGeral },
  ];

  selectedExtras.forEach((extra, idx) => {
    resumo.push({ Campo: `  Extra ${idx + 1}: ${extra.descricao}`, Valor: extra.valor as any });
  });

  if (vendaInfo?.observacoes) {
    resumo.push({ Campo: "Observações", Valor: vendaInfo.observacoes });
  }

  const wsResumo = XLSX.utils.json_to_sheet(resumo);
  wsResumo["!cols"] = [{ wch: 40 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  const fileName = `fechamento${numeroFechamento ? `-${numeroFechamento}` : ""}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

interface BatchFechamento {
  numero_fechamento: number;
  cliente: string;
  items: any[];
  extras: { descricao: string; valor: number }[];
  observacoes?: string | null;
  valor_total: number;
  extras_total: number;
}

export const generateBatchClosingReportExcel = (fechamentos: BatchFechamento[]) => {
  const wb = XLSX.utils.book_new();

  const allRows: any[] = [];
  fechamentos.forEach((f) => {
    const extras = normalizeExtras(f.extras);
    const { mapped: extrasPerOs, unmapped: unmappedExtras } = buildExtrasPerOs(extras);

    const sorted = [...(f.items || [])].sort((a: any, b: any) => {
      const da = a.data || "", db = b.data || "";
      if (da !== db) return da.localeCompare(db);
      return (a.hora || "").localeCompare(b.hora || "");
    });

    sorted.forEach((ai: any, idx: number) => {
      const kmTotal = (Number(ai.km_fim) || 0) - (Number(ai.km_in) || 0);
      const outrosDespesas = ai.outros_despesas
        ? Array.isArray(ai.outros_despesas) ? ai.outros_despesas : JSON.parse(ai.outros_despesas)
        : [];
      const outrosTotal =
        outrosDespesas.reduce((s: number, d: any) => s + parseAmount(d.valor), 0) +
        parseAmount(ai.outros);

      const osCot = ai.cot || "";

      allRows.push({
        "Fechamento": f.numero_fechamento,
        "Cliente": f.cliente,
        "#": idx + 1,
        "O.S.": osCot,
        "Data": ai.data ? formatDate(ai.data) : "",
        "Hora": ai.hora || "",
        "Tipo": ai.tipo || "",
        "Origem": ai.origem || "",
        "Destino": ai.destino || "",
        "Motorista": ai.motorista || "",
        "Veículo": ai.veiculo || "",
        "Placa": ai.placa || "",
        "KM Total": kmTotal,
        "KM Extra": Number(ai.km_extra) || 0,
        "Outros": outrosTotal,
        "Estacionamento": Number(ai.estacionamento) || 0,
        "Valor": (Number(ai.valor) || 0) + (Number(ai.estacionamento) || 0),
      });
    });

    // Only unmapped extras as separate rows
    unmappedExtras.forEach((extra, idx) => {
      allRows.push({
        "Fechamento": f.numero_fechamento,
        "Cliente": f.cliente,
        "#": sorted.length + idx + 1,
        "O.S.": "EXTRA",
        "Data": "",
        "Hora": "",
        "Tipo": extra.descricao,
        "Origem": extra.descricao,
        "Destino": "",
        "Motorista": "",
        "Veículo": "",
        "Placa": "",
        "KM Total": 0,
        "KM Extra": 0,
        "Outros": 0,
        "Estacionamento": 0,
        "Valor": extra.valor,
      });
    });
  });

  const ws = XLSX.utils.json_to_sheet(allRows);
  ws["!cols"] = [
    { wch: 12 }, { wch: 20 }, { wch: 4 }, { wch: 10 }, { wch: 12 }, { wch: 8 },
    { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Serviços");

  // Sheet 2: Resumo per fechamento
  const resumoRows: any[] = [];
  let grandTotal = 0;
  fechamentos.forEach((f) => {
    const extras = normalizeExtras(f.extras);
    const { unmapped } = buildExtrasPerOs(extras);
    const servTotal = (f.items || []).reduce((s: number, ai: any) => s + parseAmount(ai.valor), 0);
    const estacTotal = (f.items || []).reduce((s: number, ai: any) => s + parseAmount(ai.estacionamento), 0);
    const unmappedTotal = unmapped.reduce((s, e) => s + e.valor, 0);
    const total = servTotal + estacTotal + unmappedTotal;
    grandTotal += total;
    resumoRows.push({
      "Fechamento Nº": f.numero_fechamento,
      "Cliente": f.cliente,
      "Qtd Serviços": (f.items || []).length,
      "Valor Serviços": servTotal,
      "Extras": estacTotal + unmappedTotal,
      "Total": total,
    });
  });
  resumoRows.push({
    "Fechamento Nº": "",
    "Cliente": "TOTAL GERAL",
    "Qtd Serviços": fechamentos.reduce((s, f) => s + (f.items || []).length, 0),
    "Valor Serviços": fechamentos.reduce((s, f) => s + (f.items || []).reduce((ss: number, ai: any) => ss + parseAmount(ai.valor), 0), 0),
    "Extras": grandTotal - fechamentos.reduce((s, f) => s + (f.items || []).reduce((ss: number, ai: any) => ss + parseAmount(ai.valor), 0), 0),
    "Total": grandTotal,
  });

  const wsResumo = XLSX.utils.json_to_sheet(resumoRows);
  wsResumo["!cols"] = [{ wch: 14 }, { wch: 25 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

  const nums = fechamentos.map((f) => f.numero_fechamento).join("-");
  XLSX.writeFile(wb, `fechamentos-${nums}.xlsx`);
};
