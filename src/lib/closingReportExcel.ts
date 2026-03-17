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

export const generateClosingReportExcel = (
  items: ClosingReportItem[],
  title: string,
  _subtitle: string,
  vendaInfo?: ClosingReportVendaInfo,
  numeroFechamento?: number
) => {
  const wb = XLSX.utils.book_new();

  // --- Sheet 1: Serviços ---
  const sortedItems = [...items].sort((a, b) => {
    const dateA = a.data || "";
    const dateB = b.data || "";
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    const horaA = a.hora || "";
    const horaB = b.hora || "";
    return horaA.localeCompare(horaB);
  });

  const rows = sortedItems.map((ai, idx) => {
    const kmTotal = (Number(ai.km_fim) || 0) - (Number(ai.km_in) || 0);
    const outrosDespesas = ai.outros_despesas
      ? Array.isArray(ai.outros_despesas) ? ai.outros_despesas : JSON.parse(ai.outros_despesas)
      : [];
    const outrosTotal =
      outrosDespesas.reduce((s: number, d: any) => s + parseAmount(d.valor), 0) +
      parseAmount(ai.outros);

    return {
      "#": idx + 1,
      "O.S.": ai.cot || "",
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
      "Estacionamento": Number(ai.estacionamento) || 0,
      "Outros": outrosTotal,
      "Valor": Number(ai.valor) || 0,
    };
  });

  // Extras rows
  const selectedExtras = vendaInfo?.extras || [];
  selectedExtras.forEach((extra, idx) => {
    rows.push({
      "#": sortedItems.length + idx + 1,
      "O.S.": "EXTRA",
      "Data": "",
      "Hora": "",
      "Tipo": "Extra",
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
      "Estacionamento": 0,
      "Outros": 0,
      "Valor": parseAmount(extra.valor),
    });
  });

  // Totals row
  const totalServicos = sortedItems.reduce((s, ai) => s + parseAmount(ai.valor), 0);
  const totalEstac = sortedItems.reduce((s, ai) => s + parseAmount(ai.estacionamento), 0);
  const totalKm = sortedItems.reduce((s, ai) => s + (parseAmount(ai.km_fim) - parseAmount(ai.km_in)), 0);
  const totalKmExtra = sortedItems.reduce((s, ai) => s + parseAmount(ai.km_extra), 0);
  const extrasTotal = selectedExtras.reduce((s, e) => s + parseAmount(e.valor), 0);

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
    "Estacionamento": totalEstac,
    "Outros": extrasTotal,
    "Valor": totalServicos + extrasTotal,
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  ws["!cols"] = [
    { wch: 4 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 20 },
    { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Serviços");

  // --- Sheet 2: Extras ---
  if (selectedExtras.length > 0) {
    const extrasRows = selectedExtras.map((extra, idx) => ({
      "#": idx + 1,
      "Descrição": extra.descricao,
      "Valor": parseAmount(extra.valor),
    }));
    extrasRows.push({
      "#": 0,
      "Descrição": "TOTAL EXTRAS",
      "Valor": extrasTotal,
    });
    const wsExtras = XLSX.utils.json_to_sheet(extrasRows);
    wsExtras["!cols"] = [{ wch: 5 }, { wch: 40 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsExtras, "Extras");
  }

  // --- Sheet 3: Resumo ---
  const resumo = [
    { Campo: "Fechamento Nº", Valor: numeroFechamento || "" },
    { Campo: "Cliente", Valor: vendaInfo?.cliente || "" },
    { Campo: "Quantidade de Serviços", Valor: items.length },
    { Campo: "KM Total", Valor: totalKm },
    { Campo: "KM Extra", Valor: totalKmExtra },
    { Campo: "Estacionamento", Valor: totalEstac },
    { Campo: "Extras", Valor: extrasTotal },
    { Campo: "Valor Total", Valor: totalServicos + extrasTotal },
  ];

  // Detail extras in resumo
  selectedExtras.forEach((extra, idx) => {
    resumo.push({ Campo: `  Extra ${idx + 1}: ${extra.descricao}`, Valor: parseAmount(extra.valor) as any });
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
