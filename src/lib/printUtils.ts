const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const openPrint = (title: string, body: string) => {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;padding:20px;color:#1a1a1a;font-size:11px}
h1{font-size:16px;margin-bottom:4px}
.sub{font-size:10px;color:#666;margin-bottom:12px}
table{width:100%;border-collapse:collapse;margin-top:8px}
th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}
th{background:#f0f0f0;font-weight:600;font-size:10px}
td{font-size:10px}
.r{text-align:right}.c{text-align:center}.b{font-weight:700}
.totals{margin-top:12px;font-size:11px}
@media print{body{padding:10px}@page{size:landscape;margin:10mm}}
</style></head><body>
<h1>${title}</h1>
<p class="sub">Emitido em: ${new Date().toLocaleString("pt-BR")}</p>
${body}
</body></html>`);
  w.document.close();
  w.onload = () => w.print();
};

export const printAgenda = (items: any[], includeFinancials = true) => {
  const rows = items.map(i => {
    let row = `<tr>
<td>${formatDate(i.data)}</td><td>${i.hora}</td><td>${i.cot}</td>
<td>${i.cliente}</td><td>${i.tipo}</td><td class="c">${i.pax}</td>
<td>${i.origem}</td><td>${i.destino}</td>
<td>${i.veiculo} (${i.placa})</td><td>${i.motorista}</td>
<td>${i.fornecedor}</td>`;
    if (includeFinancials) {
      row += `<td class="r">${formatCurrency(i.valor)}</td><td class="r">${formatCurrency(i.custo)}</td>
<td class="r b">${formatCurrency(i.valor - i.custo)}</td>`;
    }
    row += `<td>${i.observacoes || ""}</td></tr>`;
    return row;
  }).join("");

  const finHeaders = includeFinancials ? `<th class="r">Valor</th><th class="r">Custo</th><th class="r">Margem</th>` : "";

  let totals = "";
  if (includeFinancials) {
    const totalValor = items.reduce((s, i) => s + Number(i.valor), 0);
    const totalCusto = items.reduce((s, i) => s + Number(i.custo), 0);
    totals = `<div class="totals">
<b>Total Valor:</b> ${formatCurrency(totalValor)} &nbsp;|&nbsp;
<b>Total Custo:</b> ${formatCurrency(totalCusto)} &nbsp;|&nbsp;
<b>Margem:</b> ${formatCurrency(totalValor - totalCusto)}
</div>`;
  }

  openPrint("Agenda de Serviços", `
<p class="sub">${items.length} registro(s)</p>
<table>
<thead><tr>
<th>Data</th><th>Hora</th><th>O.S.</th><th>Cliente</th><th>Tipo</th>
<th class="c">PAX</th><th>Origem</th><th>Destino</th><th>Veículo</th>
<th>Motorista</th><th>Fornecedor</th>${finHeaders}<th>Obs</th>
</tr></thead>
<tbody>${rows}</tbody>
</table>
${totals}`);
};

export const printFatVeiculo = (items: any[], includeFinancials = true) => {
  const map = new Map<string, { veiculo: string; placa: string; viagens: number; receita: number; custo: number }>();
  items.forEach(i => {
    const e = map.get(i.placa) || { veiculo: i.veiculo, placa: i.placa, viagens: 0, receita: 0, custo: 0 };
    e.viagens += 1; e.receita += Number(i.valor); e.custo += Number(i.custo);
    map.set(i.placa, e);
  });
  const dados = Array.from(map.values()).sort((a, b) => b.receita - a.receita);

  const rows = dados.map(d => {
    let row = `<tr><td>${d.veiculo}</td><td>${d.placa}</td><td class="c">${d.viagens}</td>`;
    if (includeFinancials) {
      const margem = d.receita - d.custo;
      const pct = d.receita > 0 ? ((margem / d.receita) * 100).toFixed(1) : "0";
      row += `<td class="r">${formatCurrency(d.receita)}</td><td class="r">${formatCurrency(d.custo)}</td>
<td class="r b">${formatCurrency(margem)}</td><td class="r">${pct}%</td>`;
    }
    row += `</tr>`;
    return row;
  }).join("");

  const finHeaders = includeFinancials ? `<th class="r">Receita</th><th class="r">Custo</th><th class="r">Margem</th><th class="r">%</th>` : "";
  let totals = "";
  if (includeFinancials) {
    const totalR = dados.reduce((s, d) => s + d.receita, 0);
    const totalC = dados.reduce((s, d) => s + d.custo, 0);
    totals = `<div class="totals"><b>Receita:</b> ${formatCurrency(totalR)} | <b>Custo:</b> ${formatCurrency(totalC)} | <b>Margem:</b> ${formatCurrency(totalR - totalC)}</div>`;
  }

  openPrint("Faturamento por Veículo", `
<table><thead><tr><th>Veículo</th><th>Placa</th><th class="c">Viagens</th>${finHeaders}
</tr></thead><tbody>${rows}</tbody></table>
${totals}`);
};

export const printContasPagar = (items: any[], vendaOsMap: Record<string, any> = {}) => {
  const rows = items.map(cp => {
    const venda = vendaOsMap[cp.venda_id];
    return `<tr>
<td class="c">${venda?.numero_venda || "—"}</td>
<td>${formatDate(cp.data)}</td>
<td>${cp.fornecedor}</td>
<td>${venda?.cliente || "—"}</td>
<td>${venda?.cots?.join(", ") || "—"}</td>
<td>${cp.centro_custo || "—"}</td>
<td>${cp.subgrupo_custo || "—"}</td>
<td>${cp.descritivo}</td>
<td class="r">${formatCurrency(Number(cp.valor))}</td>
<td>${cp.data_vencimento ? formatDate(cp.data_vencimento) : "—"}</td>
<td>${cp.data_pagamento ? formatDate(cp.data_pagamento) : "—"}</td>
<td class="c">${cp.status}</td>
</tr>`;
  }).join("");

  const total = items.reduce((s, cp) => s + Number(cp.valor), 0);
  const totalPendente = items.filter(c => c.status === "pendente").reduce((s, c) => s + Number(c.valor), 0);
  const totalPago = items.filter(c => c.status === "pago").reduce((s, c) => s + Number(c.valor), 0);

  openPrint("Relatório de Contas a Pagar", `
<p class="sub">${items.length} registro(s)</p>
<table>
<thead><tr>
<th class="c">Venda</th><th>Data</th><th>Fornecedor</th><th>Cliente</th><th>O.S.</th>
<th>Centro Custo</th><th>Subgrupo</th><th>Descritivo</th>
<th class="r">Valor</th><th>Vencimento</th><th>Pagamento</th><th class="c">Status</th>
</tr></thead>
<tbody>${rows}</tbody>
</table>
<div class="totals">
<b>Total:</b> ${formatCurrency(total)} &nbsp;|&nbsp;
<b>Pendente:</b> ${formatCurrency(totalPendente)} &nbsp;|&nbsp;
<b>Pago:</b> ${formatCurrency(totalPago)}
</div>`);
};

export const printContasReceber = (items: any[], vendaOsMap: Record<string, any> = {}) => {
  const rows = items.map(cr => {
    const venda = vendaOsMap[cr.venda_id];
    return `<tr>
<td class="c">${venda?.numero_venda || "—"}</td>
<td>${formatDate(cr.data)}</td>
<td>${cr.cliente}</td>
<td>${venda?.cots?.join(", ") || "—"}</td>
<td>${cr.centro_receita || "—"}</td>
<td>${cr.subgrupo_receita || "—"}</td>
<td>${cr.descritivo}</td>
<td class="r">${formatCurrency(Number(cr.valor))}</td>
<td>${cr.data_vencimento ? formatDate(cr.data_vencimento) : "—"}</td>
<td>${cr.data_pagamento ? formatDate(cr.data_pagamento) : "—"}</td>
<td class="c">${cr.status}</td>
</tr>`;
  }).join("");

  const total = items.reduce((s, cr) => s + Number(cr.valor), 0);
  const totalPendente = items.filter(c => c.status === "pendente").reduce((s, c) => s + Number(c.valor), 0);
  const totalPago = items.filter(c => c.status === "pago").reduce((s, c) => s + Number(c.valor), 0);

  openPrint("Relatório de Contas a Receber", `
<p class="sub">${items.length} registro(s)</p>
<table>
<thead><tr>
<th class="c">Venda</th><th>Data</th><th>Cliente</th><th>O.S.</th>
<th>Centro Receita</th><th>Subgrupo</th><th>Descritivo</th>
<th class="r">Valor</th><th>Vencimento</th><th>Pagamento</th><th class="c">Status</th>
</tr></thead>
<tbody>${rows}</tbody>
</table>
<div class="totals">
<b>Total:</b> ${formatCurrency(total)} &nbsp;|&nbsp;
<b>Pendente:</b> ${formatCurrency(totalPendente)} &nbsp;|&nbsp;
<b>Pago:</b> ${formatCurrency(totalPago)}
</div>`);
};

export const printCotacao = (cotacao: {
  numero_cotacao: number;
  nome: string;
  data: string;
  forma_pagamento: string;
  validade_proposta: string;
  observacoes: string;
  valor_total: number;
  status: string;
  items: { descritivo: string; valor: number; hora_extra: string; km_extra: number }[];
}, logoUrl: string) => {
  const fc = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  const fd = (d: string) => { if (!d) return ""; const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; };

  const rows = cotacao.items.map((item, idx) => `<tr>
    <td class="c">${idx + 1}</td>
    <td>${item.descritivo}</td>
    <td class="r">${fc(item.valor)}</td>
    <td class="c">${item.hora_extra || "—"}</td>
    <td class="c">${item.km_extra || "—"}</td>
  </tr>`).join("");

  const statusLabel = cotacao.status === "aprovada" ? "APROVADA" : cotacao.status === "recusada" ? "RECUSADA" : "PENDENTE";

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>Cotação #${cotacao.numero_cotacao}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;font-size:12px;padding:0}
.page{max-width:210mm;margin:0 auto;padding:15mm 20mm}
.header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #1a3a5c;padding-bottom:12px;margin-bottom:20px}
.header-left{display:flex;align-items:center;gap:12px}
.header-left img{height:60px;width:60px;object-fit:contain}
.header-left .company{font-size:18px;font-weight:700;color:#1a3a5c}
.header-right{text-align:right}
.header-right .cotacao-num{font-size:22px;font-weight:700;color:#1a3a5c}
.header-right .cotacao-label{font-size:10px;color:#666;text-transform:uppercase;letter-spacing:1px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-bottom:20px;font-size:11px}
.info-grid .label{font-weight:600;color:#555}
.info-grid .value{color:#1a1a1a}
table{width:100%;border-collapse:collapse;margin-top:8px;margin-bottom:16px}
th{background:#1a3a5c;color:#fff;padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:0.5px}
td{border-bottom:1px solid #ddd;padding:7px 10px;font-size:11px}
tr:nth-child(even){background:#f8f9fa}
.r{text-align:right}.c{text-align:center}
.total-row{background:#1a3a5c !important;color:#fff;font-weight:700;font-size:13px}
.total-row td{border:none;padding:10px}
.obs-section{margin-top:16px;padding:12px;background:#f0f4f8;border-radius:6px;font-size:11px}
.obs-section .obs-title{font-weight:700;color:#1a3a5c;margin-bottom:4px}
.footer{margin-top:30px;border-top:2px solid #1a3a5c;padding-top:12px;display:flex;justify-content:space-between;font-size:10px;color:#666}
.validity{margin-top:12px;padding:8px 12px;background:#fff8e1;border-left:4px solid #f9a825;font-size:11px}
.signature-area{margin-top:40px;display:flex;justify-content:space-between;gap:40px}
.signature-line{flex:1;text-align:center;padding-top:40px;border-top:1px solid #333;font-size:10px;color:#555}
@media print{
  body{padding:0}
  .page{padding:10mm 15mm}
  @page{size:A4 portrait;margin:0}
}
</style></head><body>
<div class="page">
  <div class="header">
    <div class="header-left">
      <img src="${logoUrl}" alt="Logo" />
      <span class="company">Executive Service</span>
    </div>
    <div class="header-right">
      <div class="cotacao-label">Cotação</div>
      <div class="cotacao-num">#${String(cotacao.numero_cotacao).padStart(4, "0")}</div>
    </div>
  </div>

  <div class="info-grid">
    <div><span class="label">Cliente / Nome:</span> <span class="value">${cotacao.nome}</span></div>
    <div><span class="label">Data:</span> <span class="value">${fd(cotacao.data)}</span></div>
    <div><span class="label">Forma de Pagamento:</span> <span class="value">${cotacao.forma_pagamento || "—"}</span></div>
    <div><span class="label">Status:</span> <span class="value">${statusLabel}</span></div>
  </div>

  <table>
    <thead><tr>
      <th class="c" style="width:40px">Nº</th>
      <th>Descritivo</th>
      <th class="r" style="width:110px">Valor</th>
      <th class="c" style="width:80px">Hora Extra</th>
      <th class="c" style="width:80px">KM Extra</th>
    </tr></thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="2" class="r">VALOR TOTAL</td>
        <td class="r">${fc(cotacao.valor_total)}</td>
        <td colspan="2"></td>
      </tr>
    </tbody>
  </table>

  ${cotacao.validade_proposta ? `<div class="validity">⏰ <strong>Validade da Proposta:</strong> ${fd(cotacao.validade_proposta)}</div>` : ""}

  ${cotacao.observacoes ? `<div class="obs-section"><div class="obs-title">Observações</div><div>${cotacao.observacoes}</div></div>` : ""}

  <div class="signature-area">
    <div class="signature-line">Executive Service</div>
    <div class="signature-line">${cotacao.nome}</div>
  </div>

  <div class="footer">
    <span>Documento gerado em ${new Date().toLocaleString("pt-BR")}</span>
    <span>Executive Service — Transporte Executivo</span>
  </div>
</div>
</body></html>`);
  w.document.close();
  w.onload = () => w.print();
};

export const printFatFornecedor = (items: any[], includeFinancials = true) => {
  const map = new Map<string, { fornecedor: string; viagens: number; receita: number; custo: number; pax: number }>();
  items.forEach(i => {
    const e = map.get(i.fornecedor) || { fornecedor: i.fornecedor, viagens: 0, receita: 0, custo: 0, pax: 0 };
    e.viagens += 1; e.receita += Number(i.valor); e.custo += Number(i.custo); e.pax += Number(i.pax);
    map.set(i.fornecedor, e);
  });
  const dados = Array.from(map.values()).sort((a, b) => b.custo - a.custo);

  const rows = dados.map(d => {
    let row = `<tr><td>${d.fornecedor}</td><td class="c">${d.viagens}</td><td class="c">${d.pax}</td>`;
    if (includeFinancials) {
      const margem = d.receita - d.custo;
      const pct = d.receita > 0 ? ((margem / d.receita) * 100).toFixed(1) : "0";
      row += `<td class="r">${formatCurrency(d.receita)}</td><td class="r">${formatCurrency(d.custo)}</td>
<td class="r b">${formatCurrency(margem)}</td><td class="r">${pct}%</td>`;
    }
    row += `</tr>`;
    return row;
  }).join("");

  const finHeaders = includeFinancials ? `<th class="r">Receita</th><th class="r">Custo</th><th class="r">Margem</th><th class="r">%</th>` : "";
  let totals = "";
  if (includeFinancials) {
    const totalR = dados.reduce((s, d) => s + d.receita, 0);
    const totalC = dados.reduce((s, d) => s + d.custo, 0);
    totals = `<div class="totals"><b>Receita:</b> ${formatCurrency(totalR)} | <b>Custo:</b> ${formatCurrency(totalC)} | <b>Margem:</b> ${formatCurrency(totalR - totalC)}</div>`;
  }

  openPrint("Faturamento por Fornecedor", `
<table><thead><tr><th>Fornecedor</th><th class="c">Viagens</th><th class="c">PAX</th>${finHeaders}
</tr></thead><tbody>${rows}</tbody></table>
${totals}`);
};
