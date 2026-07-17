import { RAFAEL_SIGNATURE_BASE64 } from "./signatureData";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const brandedStyles = () => `<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;font-size:11px;padding:0}
.page{max-width:297mm;margin:0 auto;padding:12mm 15mm}
h1{font-size:16px;margin-bottom:4px;color:#1a3a5c}
.sub{font-size:10px;color:#666;margin-bottom:12px}
table{width:100%;border-collapse:collapse;margin-top:8px}
th{background:#1a3a5c;color:#fff;padding:6px 8px;font-size:9px;text-transform:uppercase;letter-spacing:0.3px}
td{border-bottom:1px solid #ddd;padding:5px 8px;font-size:10px}
tr:nth-child(even){background:#f8f9fa}
.r{text-align:right}.c{text-align:center}.b{font-weight:700}
.totals{margin-top:14px;font-size:11px;padding:10px 12px;background:#f0f4f8;border-radius:6px;border-left:4px solid #1a3a5c}
.header-brand{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #c8a456;padding-bottom:12px;margin-bottom:16px}
.header-left{display:flex;align-items:center;gap:12px}
.header-left img{height:70px;width:70px;object-fit:contain}
.header-left .company{font-size:18px;font-weight:700;color:#1a3a5c}
.header-right{text-align:right}
.header-right .report-title{font-size:14px;font-weight:700;color:#1a3a5c}
.header-right .report-date{font-size:10px;color:#666;margin-top:2px}
.footer{margin-top:24px;border-top:2px solid #c8a456;padding-top:10px;display:flex;justify-content:space-between;font-size:9px;color:#888}
@media print{body{padding:0}.page{padding:8mm 12mm}@page{size:landscape;margin:0}}
</style>`;

const brandedHeader = (logoUrl: string, title: string) => `
<div class="header-brand">
  <div class="header-left">
    ${logoUrl ? `<img src="${logoUrl}" alt="Logo" />` : ""}
    <span class="company">Executive Service</span>
  </div>
  <div class="header-right">
    <div class="report-title">${title}</div>
    <div class="report-date">Emitido em: ${new Date().toLocaleString("pt-BR")}</div>
  </div>
</div>`;

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

const formatPassageiros = (passageiros: any): string => {
  if (!Array.isArray(passageiros) || passageiros.length === 0) return "";
  return passageiros
    .map((p: any) => p?.nome)
    .filter(Boolean)
    .join("<br/>");
};

export const printAgenda = (items: any[], includeFinancials = true) => {
  const showSht = items.length > 0 && items.every(i => (i.cliente || "").toLowerCase().includes("shift"));

  const rows = items.map(i => {
    let row = `<tr>
<td>${formatDate(i.data)}</td><td>${i.hora}</td><td>${i.cot}</td>
<td>${i.cliente}</td><td>${i.tipo}</td>`;
    if (showSht) row += `<td class="c">${i.pax}</td>`;
    row += `<td>${formatPassageiros(i.passageiros)}</td>
<td>${i.origem}</td><td>${i.destino}</td>
<td>${i.veiculo} (${i.placa})</td><td>${i.motorista}</td>
<td>${i.telefone || ""}</td>`;
    if (includeFinancials) {
      row += `<td class="r">${formatCurrency(i.valor)}</td><td class="r">${formatCurrency(i.custo)}</td>
<td class="r b">${formatCurrency(i.valor - i.custo)}</td>`;
    }
    row += `<td>${i.observacoes || ""}</td></tr>`;
    return row;
  }).join("");

  const finHeaders = includeFinancials ? `<th class="r">Valor</th><th class="r">Custo</th><th class="r">Margem</th>` : "";
  const shtHeader = showSht ? `<th class="c">SHT</th>` : "";

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
${shtHeader}<th>Passageiros</th><th>Origem</th><th>Destino</th><th>Veículo</th>
<th>Motorista</th><th>Telefone</th>${finHeaders}<th>Obs</th>
</tr></thead>
<tbody>${rows}</tbody>
</table>
${totals}`);
};

export const printFatVeiculo = (
  items: any[],
  includeFinancials = true,
  despesasVeiculo: any[] = []
) => {
  const despesasPorPlaca = new Map<string, { total: number; detalhes: any[] }>();
  despesasVeiculo.forEach(d => {
    if (d.placa) {
      const e = despesasPorPlaca.get(d.placa) || { total: 0, detalhes: [] };
      e.total += Number(d.valor) || 0;
      e.detalhes.push(d);
      despesasPorPlaca.set(d.placa, e);
    }
  });

  const map = new Map<string, { veiculo: string; placa: string; viagens: number; receita: number; custo: number; servicos: any[] }>();
  items.forEach(i => {
    const key = i.placa || `sem-placa-${i.veiculo || "v"}`;
    const e = map.get(key) || { veiculo: i.veiculo, placa: i.placa, viagens: 0, receita: 0, custo: 0, servicos: [] };
    e.viagens += 1;
    const od = Array.isArray(i.outros_despesas) ? i.outros_despesas : [];
    const valorTotal = (Number(i.valor) || 0) + (Number(i.estacionamento) || 0) + od.reduce((s: number, x: any) => s + (Number(x.valor) || 0), 0);
    e.receita += valorTotal;
    e.custo += Number(i.custo) || 0;
    e.servicos.push({ ...i, valorTotal });
    map.set(key, e);
  });
  const dados = Array.from(map.values()).sort((a, b) => b.receita - a.receita);

  let body = "";
  dados.forEach(d => {
    const despData = despesasPorPlaca.get(d.placa) || { total: 0, detalhes: [] };
    const liquido = d.receita - d.custo - despData.total;
    const pct = d.receita > 0 ? ((liquido / d.receita) * 100).toFixed(1) : "0";

    body += `<div class="vehicle-block">`;
    body += `<div class="vehicle-header">${d.veiculo} — ${d.placa}</div>`;

    if (includeFinancials) {
      body += `<div class="vehicle-summary">Viagens: <b>${d.viagens}</b> &nbsp;|&nbsp; Receita: <b>${formatCurrency(d.receita)}</b> &nbsp;|&nbsp; Custo Forn.: <b>${formatCurrency(d.custo)}</b> &nbsp;|&nbsp; Desp. Oper.: <b>${formatCurrency(despData.total)}</b> &nbsp;|&nbsp; Líquido: <b>${formatCurrency(liquido)}</b> (${pct}%)</div>`;
    } else {
      body += `<div class="vehicle-summary">Viagens: <b>${d.viagens}</b></div>`;
    }

    body += `<table><thead><tr><th>O.S.</th><th>Data</th><th>Cliente</th><th>Trajeto</th><th>Motorista</th><th>Fornecedor</th>`;
    if (includeFinancials) body += `<th class="r">Receita</th><th class="r">Custo Forn.</th>`;
    body += `</tr></thead><tbody>`;
    d.servicos.forEach((s: any) => {
      body += `<tr><td>${s.cot || "—"}</td><td>${s.data ? formatDate(s.data) : "—"}</td><td>${s.cliente || "—"}</td>`;
      body += `<td>${s.origem && s.destino ? `${s.origem} → ${s.destino}` : "—"}</td>`;
      body += `<td>${s.motorista || "—"}</td><td>${s.fornecedor || "—"}</td>`;
      if (includeFinancials) body += `<td class="r">${formatCurrency(s.valorTotal)}</td><td class="r">${formatCurrency(Number(s.custo) || 0)}</td>`;
      body += `</tr>`;
    });
    body += `</tbody></table>`;

    if (includeFinancials && despData.detalhes.length > 0) {
      body += `<p class="desp-title">Despesas Operacionais</p>`;
      body += `<table><thead><tr><th>Data</th><th>Descritivo</th><th>Status</th><th class="r">Valor</th></tr></thead><tbody>`;
      despData.detalhes.forEach((dp: any) => {
        body += `<tr><td>${dp.data ? formatDate(dp.data) : "—"}</td><td>${dp.descritivo || "—"}</td><td class="c">${dp.status}</td><td class="r">${formatCurrency(Number(dp.valor) || 0)}</td></tr>`;
      });
      body += `<tr class="b"><td colspan="3" class="r">Subtotal Despesas</td><td class="r">${formatCurrency(despData.total)}</td></tr>`;
      body += `</tbody></table>`;
    }

    body += `</div>`;
  });

  if (includeFinancials && dados.length > 0) {
    const totalR = dados.reduce((s, d) => s + d.receita, 0);
    const totalC = dados.reduce((s, d) => s + d.custo, 0);
    const totalD = Array.from(despesasPorPlaca.values()).reduce((s, v) => s + v.total, 0);
    const totalL = totalR - totalC - totalD;
    const totalPct = totalR > 0 ? ((totalL / totalR) * 100).toFixed(1) : "0";
    body += `<div class="totals">
<b>Receita Total:</b> ${formatCurrency(totalR)} &nbsp;|&nbsp;
<b>Custo Forn.:</b> ${formatCurrency(totalC)} &nbsp;|&nbsp;
<b>Desp. Oper.:</b> ${formatCurrency(totalD)}
</div>
<div class="resultado">
<span class="resultado-label">RESULTADO LÍQUIDO</span>
<span class="resultado-valor">${formatCurrency(totalL)}</span>
<span class="resultado-pct">(${totalPct}% de margem)</span>
</div>`;
  }

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>Faturamento por Veículo</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;padding:20px;color:#1a1a1a;font-size:11px}
h1{font-size:16px;margin-bottom:4px}
.sub{font-size:10px;color:#666;margin-bottom:12px}
table{width:100%;border-collapse:collapse;margin-top:4px;margin-bottom:8px}
th,td{border:1px solid #ccc;padding:3px 6px;text-align:left}
th{background:#f0f0f0;font-weight:600;font-size:9px}
td{font-size:9px}
.r{text-align:right}.c{text-align:center}.b{font-weight:700}
.totals{margin-top:16px;font-size:11px;padding:8px;background:#f0f0f0;border-radius:4px}
.resultado{margin-top:8px;padding:12px;background:#1a3a5c;color:#fff;border-radius:4px;display:flex;align-items:center;gap:12px}
.resultado-label{font-size:12px;font-weight:700;letter-spacing:0.5px}
.resultado-valor{font-size:18px;font-weight:700}
.resultado-pct{font-size:11px;opacity:0.8}
.vehicle-block{margin-bottom:14px}
.vehicle-header{font-size:13px;font-weight:700;color:#1a3a5c;border-bottom:2px solid #1a3a5c;padding-bottom:2px;margin-bottom:4px}
.vehicle-summary{font-size:10px;margin-bottom:4px;color:#444}
.desp-title{font-size:10px;font-weight:700;margin-top:6px;margin-bottom:2px;color:#555}
@media print{body{padding:10px}@page{size:landscape;margin:8mm}}
</style></head><body>
<h1>Faturamento por Veículo</h1>
<p class="sub">Emitido em: ${new Date().toLocaleString("pt-BR")} — ${dados.length} veículo(s)</p>
${body}
</body></html>`);
  w.document.close();
  w.onload = () => w.print();
};

export const printContasPagar = (items: any[], vendaOsMap: Record<string, any> = {}, logoUrl = "") => {
  const rows = items.map(cp => {
    const venda = vendaOsMap[cp.venda_id];
    return `<tr>
<td class="c">${venda?.numero_venda || "—"}</td>
<td>${formatDate(cp.data)}</td>
<td>${cp.fornecedor}</td>
<td>${venda?.cliente || "—"}</td>
<td>${(venda?.cotsByFornecedor?.[(cp.fornecedor || "").trim().toLowerCase()] || venda?.cots || []).join(", ") || "—"}</td>
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

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>Relatório de Contas a Pagar</title>
${brandedStyles()}
</head><body>
<div class="page">
  ${brandedHeader(logoUrl, "Relatório de Contas a Pagar")}
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

export const printContasReceber = (items: any[], vendaOsMap: Record<string, any> = {}, logoUrl = "") => {
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

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>Relatório de Contas a Receber</title>
${brandedStyles()}
</head><body>
<div class="page">
  ${brandedHeader(logoUrl, "Relatório de Contas a Receber")}
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

export const printCotacao = (cotacao: {
  numero_cotacao: number;
  nome: string;
  empresa?: string;
  destinatario?: string;
  data: string;
  forma_pagamento: string;
  validade_proposta: string;
  observacoes: string;
  valor_total: number;
  status: string;
  items: { descritivo: string; valor: number; hora_extra: string; km_extra: number }[];
}, logoUrl: string, showTotal: boolean = true) => {
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
.header-left img{height:100px;width:100px;object-fit:contain}
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
    <div><span class="label">Empresa:</span> <span class="value">${cotacao.empresa || cotacao.nome}</span></div>
    <div><span class="label">Data:</span> <span class="value">${fd(cotacao.data)}</span></div>
    ${cotacao.destinatario ? `<div><span class="label">Destinatário:</span> <span class="value">${cotacao.destinatario}</span></div>` : ""}
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
      ${showTotal ? `<tr class="total-row">
        <td colspan="2" class="r">VALOR TOTAL</td>
        <td class="r">${fc(cotacao.valor_total)}</td>
        <td colspan="2"></td>
      </tr>` : ''}
    </tbody>
  </table>

  ${cotacao.validade_proposta ? `<div class="validity">⏰ <strong>Validade da Proposta:</strong> ${fd(cotacao.validade_proposta)}</div>` : ""}

  ${cotacao.observacoes ? `<div class="obs-section"><div class="obs-title">Observações</div><div>${cotacao.observacoes.replace(/\n/g, "<br/>")}</div></div>` : ""}

  <div class="signature-area">
    <div style="flex:1;text-align:center">
      <img src="${RAFAEL_SIGNATURE_BASE64}" alt="Assinatura" style="height:60px;margin:0 auto 8px;display:block" />
      <div class="signature-line" style="padding-top:4px">
        Executive Service Transporte e Turismo Ltda<br/>CNPJ: 03.143.672/0001-44<br/>Rafael Silva da Cunha — CPF: 899.744.500-63
      </div>
    </div>
    <div style="flex:1;text-align:center">
      <div class="signature-line">${cotacao.empresa || cotacao.nome}</div>
    </div>
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

export const printFatFornecedorDetalhado = (items: any[]) => {
  // Group items by fornecedor
  const map = new Map<string, any[]>();
  items.forEach(i => {
    const key = i.fornecedor || "Sem fornecedor";
    const arr = map.get(key) || [];
    arr.push(i);
    map.set(key, arr);
  });

  // Sort fornecedores by total custo desc
  const grupos = Array.from(map.entries())
    .map(([fornecedor, arr]) => ({
      fornecedor,
      arr: arr.slice().sort((a, b) => {
        const da = (a.data || "").localeCompare(b.data || "");
        if (da !== 0) return da;
        return (a.hora || "").localeCompare(b.hora || "");
      }),
      totalCusto: arr.reduce((s, x) => s + (Number(x.custo) || 0), 0),
      totalPax: arr.reduce((s, x) => s + (Number(x.pax) || 0), 0),
    }))
    .sort((a, b) => b.totalCusto - a.totalCusto);

  const grupoHtml = grupos.map(g => {
    const linhas = g.arr.map(i => {
      const st = (i.status_faturamento || "").toString().trim();
      const stLabel = st ? st.charAt(0).toUpperCase() + st.slice(1) : "Pendente";
      return `
      <tr>
        <td>${i.data ? formatDate(i.data) : "—"}</td>
        <td class="c">${i.hora || "—"}</td>
        <td>${i.cliente || "—"}</td>
        <td class="c">${i.pax || 0}</td>
        <td class="c">${i.tipo || "—"}</td>
        <td>${i.origem || "—"}</td>
        <td>${i.destino || "—"}</td>
        <td class="c">${i.placa || "—"}</td>
        <td>${i.motorista || "—"}</td>
        <td class="c">${stLabel}</td>
        <td class="r b">${formatCurrency(Number(i.custo) || 0)}</td>
      </tr>`;
    }).join("");

    return `
      <div class="grupo">
        <div class="grupo-title">${g.fornecedor} <span class="grupo-meta">— ${g.arr.length} viagem(ns) · ${g.totalPax} PAX</span></div>
        <table>
          <thead><tr>
            <th>Data</th><th class="c">Hora</th><th>Cliente</th><th class="c">PAX</th>
            <th class="c">Tipo</th><th>Origem</th><th>Destino</th>
            <th class="c">Placa</th><th>Motorista</th><th class="c">Status</th><th class="r">Custo</th>
          </tr></thead>
          <tbody>${linhas}</tbody>
          <tfoot><tr>
            <td colspan="10" class="r b">Subtotal ${g.fornecedor}</td>
            <td class="r b">${formatCurrency(g.totalCusto)}</td>
          </tr></tfoot>
        </table>
      </div>`;
  }).join("");

  const totalGeral = grupos.reduce((s, g) => s + g.totalCusto, 0);
  const totalViagens = grupos.reduce((s, g) => s + g.arr.length, 0);
  const totalPax = grupos.reduce((s, g) => s + g.totalPax, 0);

  const extraStyles = `
    .grupo{margin-bottom:18px;page-break-inside:avoid}
    .grupo-title{font-size:12px;font-weight:700;color:#1a3a5c;background:#f0f4f8;padding:6px 10px;border-left:4px solid #c8a456;margin-bottom:4px}
    .grupo-meta{font-weight:400;color:#666;font-size:10px}
    tfoot td{background:#f8f9fa}
  `;
  openPrint("Atendimentos por Fornecedor", `<style>${extraStyles}</style>
${grupoHtml}
<div class="totals"><b>Fornecedores:</b> ${grupos.length} | <b>Viagens:</b> ${totalViagens} | <b>PAX:</b> ${totalPax} | <b>Custo Total:</b> ${formatCurrency(totalGeral)}</div>`);
};

export const printDashboardFinanceiro = (
  data: {
    year: string;
    dre: { totalReceitas: number; totalDespesas: number; resultado: number; margem: number; centros: { nome: string; valor: number }[]; centrosRec: { nome: string; valor: number }[] };
    receitasDespesas: { mes: string; Receitas: number; Despesas: number }[];
    projetado: { recPago: number; recPendente: number; despPago: number; despPendente: number; resultadoEfetivado: number; resultadoProjetado: number; monthly: { mes: string; Efetivado: number; Projetado: number }[] };
    faturamentoClientes: { cliente: string; valor: number }[];
    sections?: { receitasDespesas: boolean; dre: boolean; faturamentoClientes: boolean; projetadoEfetivado: boolean };
    filterDescription?: string;
  },
  logoUrl = ""
) => {
  const fc = (v: number) => formatCurrency(v);
  const sec = data.sections || { receitasDespesas: true, dre: true, faturamentoClientes: true, projetadoEfetivado: true };

  const filterLine = data.filterDescription ? `<p style="font-size:10px;color:#444;margin-bottom:12px;padding:6px 10px;background:#f0f4f8;border-radius:4px;border-left:3px solid #c8a456"><b>Filtros:</b> ${data.filterDescription}</p>` : "";

  // Receitas vs Despesas table
  let receitasDespesasHtml = "";
  if (sec.receitasDespesas) {
    const rdRows = data.receitasDespesas
      .filter(m => m.Receitas > 0 || m.Despesas > 0)
      .map(m => `<tr><td>${m.mes}</td><td class="r">${fc(m.Receitas)}</td><td class="r">${fc(m.Despesas)}</td><td class="r b">${fc(m.Receitas - m.Despesas)}</td></tr>`)
      .join("");
    receitasDespesasHtml = `<div class="section">
      <div class="section-title">Receitas vs Despesas Mensal</div>
      <table><thead><tr><th>Mês</th><th class="r">Receitas</th><th class="r">Despesas</th><th class="r">Resultado</th></tr></thead>
      <tbody>${rdRows}</tbody></table>
    </div>`;
  }

  // DRE
  let dreHtml = "";
  if (sec.dre) {
    const dreRecRows = data.dre.centrosRec.map(c => `<tr><td style="padding-left:24px" class="text-sm">${c.nome}</td><td class="r">${fc(c.valor)}</td></tr>`).join("");
    const dreDespRows = data.dre.centros.map(c => `<tr><td style="padding-left:24px" class="text-sm">${c.nome}</td><td class="r">${fc(c.valor)}</td></tr>`).join("");
    dreHtml = `<div class="section">
      <div class="section-title">DRE Simplificado</div>
      <table><tbody>
        <tr style="background:#e8f5e9"><td class="b">RECEITA BRUTA</td><td class="r b" style="color:#16a34a">${fc(data.dre.totalReceitas)}</td></tr>
        ${dreRecRows}
        <tr style="background:#fce4ec"><td class="b">(-) DESPESAS</td><td class="r b" style="color:#dc2626">${fc(data.dre.totalDespesas)}</td></tr>
        ${dreDespRows}
        <tr style="background:#1a3a5c;color:#fff"><td class="b">(=) RESULTADO</td><td class="r b">${fc(data.dre.resultado)}</td></tr>
        <tr><td class="b">Margem Líquida</td><td class="r b" style="color:${data.dre.margem >= 0 ? '#16a34a' : '#dc2626'}">${data.dre.margem.toFixed(1)}%</td></tr>
      </tbody></table>
    </div>`;
  }

  // Faturamento por Cliente
  let clientesHtml = "";
  if (sec.faturamentoClientes) {
    const totalFat = data.faturamentoClientes.reduce((s, c) => s + c.valor, 0);
    const clienteRows = data.faturamentoClientes.map(c => {
      const pct = totalFat > 0 ? ((c.valor / totalFat) * 100).toFixed(1) : "0";
      return `<tr><td>${c.cliente}</td><td class="r">${fc(c.valor)}</td><td class="r">${pct}%</td></tr>`;
    }).join("");
    clientesHtml = `<div class="section">
      <div class="section-title">Faturamento por Cliente</div>
      <table><thead><tr><th>Cliente</th><th class="r">Valor</th><th class="r">%</th></tr></thead>
      <tbody>${clienteRows}</tbody></table>
    </div>`;
  }

  // Projetado vs Efetivado
  let projetadoHtml = "";
  if (sec.projetadoEfetivado) {
    const peRows = data.projetado.monthly
      .filter(m => m.Efetivado !== 0 || m.Projetado !== 0)
      .map(m => `<tr><td>${m.mes}</td><td class="r">${fc(m.Efetivado)}</td><td class="r">${fc(m.Projetado)}</td></tr>`)
      .join("");
    projetadoHtml = `<div class="section">
      <div class="section-title">Resultado: Projetado vs Efetivado</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
        <div style="border:1px solid #ddd;border-radius:4px;padding:6px;text-align:center">
          <div style="font-size:9px;color:#666">Efetivado</div>
          <div style="font-size:14px;font-weight:700;color:${data.projetado.resultadoEfetivado >= 0 ? '#16a34a' : '#dc2626'}">${fc(data.projetado.resultadoEfetivado)}</div>
        </div>
        <div style="border:1px solid #ddd;border-radius:4px;padding:6px;text-align:center">
          <div style="font-size:9px;color:#666">Projetado</div>
          <div style="font-size:14px;font-weight:700;color:${data.projetado.resultadoProjetado >= 0 ? '#2563eb' : '#dc2626'}">${fc(data.projetado.resultadoProjetado)}</div>
        </div>
      </div>
      <table><thead><tr><th>Mês</th><th class="r">Efetivado</th><th class="r">Projetado</th></tr></thead>
      <tbody>${peRows}</tbody></table>
    </div>`;
  }

  // Layout: pair sections in two-col grids
  const topPair = (receitasDespesasHtml || dreHtml) ? `<div class="two-col">${receitasDespesasHtml}${dreHtml}</div>` : "";
  const bottomPair = (clientesHtml || projetadoHtml) ? `<div class="two-col">${clientesHtml}${projetadoHtml}</div>` : "";

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>Dashboard Financeiro — ${data.year}</title>
${brandedStyles()}
<style>
.section{margin-bottom:20px}
.section-title{font-size:13px;font-weight:700;color:#1a3a5c;border-bottom:2px solid #1a3a5c;padding-bottom:4px;margin-bottom:8px}
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px}
.kpi{border:1px solid #ddd;border-radius:6px;padding:8px 12px;text-align:center}
.kpi .label{font-size:9px;color:#666;text-transform:uppercase}
.kpi .value{font-size:16px;font-weight:700;margin-top:2px}
.kpi .green{color:#16a34a}
.kpi .red{color:#dc2626}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
</style>
</head><body>
<div class="page">
  ${brandedHeader(logoUrl, `Dashboard Financeiro — ${data.year}`)}
  ${filterLine}

  <div class="kpi-grid">
    <div class="kpi"><div class="label">Receitas</div><div class="value green">${fc(data.dre.totalReceitas)}</div></div>
    <div class="kpi"><div class="label">Despesas</div><div class="value red">${fc(data.dre.totalDespesas)}</div></div>
    <div class="kpi"><div class="label">Resultado</div><div class="value ${data.dre.resultado >= 0 ? 'green' : 'red'}">${fc(data.dre.resultado)}</div></div>
    <div class="kpi"><div class="label">Margem</div><div class="value ${data.dre.margem >= 0 ? 'green' : 'red'}">${data.dre.margem.toFixed(1)}%</div></div>
  </div>

  ${topPair}
  ${bottomPair}

  <div class="footer">
    <span>Documento gerado em ${new Date().toLocaleString("pt-BR")}</span>
    <span>Executive Service — Transporte Executivo</span>
  </div>
</div>
</body></html>`);
  w.document.close();
  w.onload = () => w.print();
};

export const printContrato = (contrato: any, logoUrl?: string) => {
  const fd = (d: string) => {
    if (!d) return "___/___/______";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };
  const fc = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  const c = contrato;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>Contrato Nº ${c.numero_contrato}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;font-size:11px;padding:0}
.page{max-width:210mm;margin:0 auto;padding:15mm 20mm}
.header-brand{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #c8a456;padding-bottom:12px;margin-bottom:20px}
.header-left{display:flex;align-items:center;gap:12px}
.header-left img{height:60px;width:60px;object-fit:contain}
.header-left .company{font-size:18px;font-weight:700;color:#1a3a5c}
.header-right{text-align:right}
.header-right .doc-title{font-size:14px;font-weight:700;color:#1a3a5c}
.header-right .doc-info{font-size:10px;color:#666;margin-top:2px}
.clause{margin-bottom:14px}
.clause-title{font-size:11px;font-weight:700;color:#1a3a5c;margin-bottom:6px;border-bottom:1px solid #ddd;padding-bottom:3px}
.clause-body{font-size:10px;line-height:1.6;text-align:justify}
.clause-body p{margin-bottom:4px}
.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;margin:6px 0}
.field-grid.three{grid-template-columns:1fr 1fr 1fr}
.field{font-size:10px}
.field .label{color:#666;font-size:9px}
.field .value{font-weight:600;border-bottom:1px solid #ccc;min-height:14px;padding-bottom:1px}
.signatures{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px;text-align:center}
.sig-line{border-top:1px solid #333;padding-top:4px;font-size:10px;margin-top:30px}
.footer{margin-top:30px;border-top:2px solid #c8a456;padding-top:8px;display:flex;justify-content:space-between;font-size:9px;color:#888}
@media print{body{padding:0}.page{padding:10mm 15mm}@page{size:A4 portrait;margin:0}}
</style>
</head><body>
<div class="page">
  <div class="header-brand">
    <div class="header-left">
      ${logoUrl ? `<img src="${logoUrl}" alt="Logo" />` : ""}
      <span class="company">Executive Service</span>
    </div>
    <div class="header-right">
      <div class="doc-title">CONTRATO DE LOCAÇÃO Nº ${c.numero_contrato}</div>
      <div class="doc-info">Data de Emissão: ${fd(c.data_emissao)}</div>
    </div>
  </div>

  <div class="clause">
    <div class="clause-title">CLÁUSULA 1 — DAS PARTES</div>
    <div class="clause-body">
      <p><b>CONTRATANTE:</b></p>
      <div class="field-grid">
        <div class="field"><div class="label">Nome / Razão Social</div><div class="value">${c.contratante_nome || ""}</div></div>
        <div class="field"><div class="label">CNPJ / CPF</div><div class="value">${c.contratante_cnpj_cpf || ""}</div></div>
        <div class="field"><div class="label">Inscrição Estadual</div><div class="value">${c.contratante_inscricao || ""}</div></div>
        <div class="field"><div class="label">Endereço</div><div class="value">${c.contratante_endereco || ""}</div></div>
        <div class="field"><div class="label">Cidade</div><div class="value">${c.contratante_cidade || ""}</div></div>
        <div class="field"><div class="label">UF</div><div class="value">${c.contratante_uf || ""}</div></div>
        <div class="field"><div class="label">CEP</div><div class="value">${c.contratante_cep || ""}</div></div>
        <div class="field"><div class="label">Telefone</div><div class="value">${c.contratante_telefone || ""}</div></div>
        <div class="field"><div class="label">E-mail</div><div class="value">${c.contratante_email || ""}</div></div>
        <div class="field"><div class="label">Contato</div><div class="value">${c.contratante_contato || ""}</div></div>
      </div>
      <p style="margin-top:10px"><b>CONTRATADA:</b></p>
      <div class="field-grid">
        <div class="field"><div class="label">Razão Social</div><div class="value">Executive Service Transporte e Turismo Ltda</div></div>
        <div class="field"><div class="label">CNPJ</div><div class="value">03.143.672/0001-44</div></div>
        <div class="field"><div class="label">Endereço</div><div class="value">QE 26 Cj. O Casa 33 — CEP 71060-151 — Brasília-DF</div></div>
        <div class="field"><div class="label">Representante Legal</div><div class="value">Rafael Silva da Cunha — CPF: 899.744.500-63</div></div>
      </div>
    </div>
  </div>

  <div class="clause">
    <div class="clause-title">CLÁUSULA 2 — DO OBJETO</div>
    <div class="clause-body">
      <p>O presente contrato tem por objeto a ${c.com_motorista === false ? "<b>locação de veículo sem motorista</b>, na modalidade de autolocação" : "locação de veículo <b>com motorista</b> para prestação de serviço de transporte"}, conforme especificações abaixo:</p>
      ${(() => {
        const veics = Array.isArray(c.contrato_veiculos) && c.contrato_veiculos.length > 0
          ? c.contrato_veiculos
          : [{ tipo: c.veiculo_tipo, modelo: c.veiculo_modelo, placa: c.veiculo_placa, ano: c.veiculo_ano, cor: c.veiculo_cor, capacidade: c.veiculo_capacidade, acessorios: c.veiculo_acessorios }];
        return veics.map((v: any, i: number) => `
          ${veics.length > 1 ? `<p style="margin-top:8px;font-weight:600;font-size:10px">Veículo ${i + 1}</p>` : ""}
          <div class="field-grid three">
            <div class="field"><div class="label">Tipo de Veículo</div><div class="value">${v.tipo || ""}</div></div>
            <div class="field"><div class="label">Modelo</div><div class="value">${v.modelo || ""}</div></div>
            <div class="field"><div class="label">Placa</div><div class="value">${v.placa || ""}</div></div>
            <div class="field"><div class="label">Ano</div><div class="value">${v.ano || ""}</div></div>
            <div class="field"><div class="label">Cor</div><div class="value">${v.cor || ""}</div></div>
            <div class="field"><div class="label">Capacidade</div><div class="value">${v.capacidade || ""}</div></div>
          </div>
          ${v.acessorios ? `<div class="field"><div class="label">Acessórios / Itens Inclusos</div><div class="value">${v.acessorios}</div></div>` : ""}
        `).join("");
      })()}
    </div>
  </div>

  <div class="clause">
    <div class="clause-title">CLÁUSULA 3 — DO SERVIÇO</div>
    <div class="clause-body">
      ${(() => {
        const items = Array.isArray(c.contrato_items) && c.contrato_items.length > 0
          ? c.contrato_items.filter((i: any) => i.descritivo || i.valor || i.tipo_servico || i.origem)
          : [];
        if (items.length > 0) {
          return items.map((item: any, idx: number) => `
            ${items.length > 1 ? `<p style="margin-top:8px;font-weight:700;font-size:10px">Item ${idx + 1}${item.descritivo ? ' — ' + item.descritivo : ''}</p>` : (item.descritivo ? `<p style="margin-bottom:4px"><b>${item.descritivo}</b></p>` : '')}
            <div class="field-grid three">
              <div class="field"><div class="label">Tipo de Serviço</div><div class="value">${item.tipo_servico || c.tipo_servico || ""}</div></div>
              <div class="field"><div class="label">Forma de Contratação</div><div class="value">${item.forma_contratacao || c.forma_contratacao || ""}</div></div>
              <div class="field"><div class="label">Duração Estimada</div><div class="value">${item.duracao_estimada || c.duracao_estimada || ""}</div></div>
              <div class="field"><div class="label">Origem</div><div class="value">${item.origem || c.origem || ""}</div></div>
              <div class="field"><div class="label">Destino</div><div class="value">${item.destino || c.destino || ""}</div></div>
              <div class="field"><div class="label">Paradas</div><div class="value">${item.paradas || c.paradas || ""}</div></div>
              <div class="field"><div class="label">Data Início</div><div class="value">${fd(item.data_inicio || c.data_inicio)}</div></div>
              <div class="field"><div class="label">Hora Início</div><div class="value">${item.hora_inicio || c.hora_inicio || ""}</div></div>
              <div class="field"><div class="label">Data Fim</div><div class="value">${fd(item.data_fim || c.data_fim)}</div></div>
              <div class="field"><div class="label">Hora Fim</div><div class="value">${item.hora_fim || c.hora_fim || ""}</div></div>
              <div class="field"><div class="label">Valor</div><div class="value">${fc(item.valor || 0)}</div></div>
            </div>
          `).join('');
        }
        // Fallback for old contracts without items
        return `<div class="field-grid three">
          <div class="field"><div class="label">Tipo de Serviço</div><div class="value">${c.tipo_servico || ""}</div></div>
          <div class="field"><div class="label">Forma de Contratação</div><div class="value">${c.forma_contratacao || ""}</div></div>
          <div class="field"><div class="label">Duração Estimada</div><div class="value">${c.duracao_estimada || ""}</div></div>
          <div class="field"><div class="label">Origem</div><div class="value">${c.origem || ""}</div></div>
          <div class="field"><div class="label">Destino</div><div class="value">${c.destino || ""}</div></div>
          <div class="field"><div class="label">Paradas</div><div class="value">${c.paradas || ""}</div></div>
          <div class="field"><div class="label">Data Início</div><div class="value">${fd(c.data_inicio)}</div></div>
          <div class="field"><div class="label">Hora Início</div><div class="value">${c.hora_inicio || ""}</div></div>
          <div class="field"><div class="label">Data Fim</div><div class="value">${fd(c.data_fim)}</div></div>
          <div class="field"><div class="label">Hora Fim</div><div class="value">${c.hora_fim || ""}</div></div>
        </div>`;
      })()}
    </div>
  </div>

  <div class="clause">
    <div class="clause-title">CLÁUSULA 4 — DO VALOR E FORMA DE PAGAMENTO</div>
    <div class="clause-body">
      ${(() => {
        const items = Array.isArray(c.contrato_items) && c.contrato_items.length > 0
          ? c.contrato_items.filter((i: any) => i.descritivo || i.valor)
          : [];
        if (items.length > 0) {
          return `
            <table style="margin-bottom:8px">
              <thead><tr><th style="text-align:left">Descritivo</th><th style="text-align:right;width:120px">Valor</th></tr></thead>
              <tbody>
                ${items.map((i: any) => `<tr><td>${i.descritivo || ""}</td><td style="text-align:right">${fc(i.valor || 0)}</td></tr>`).join("")}
                <tr style="font-weight:700;border-top:2px solid #1a3a5c"><td>VALOR TOTAL</td><td style="text-align:right">${fc(c.valor_total)}</td></tr>
              </tbody>
            </table>`;
        }
        return `<div class="field-grid three">
          <div class="field"><div class="label">Valor Total</div><div class="value">${fc(c.valor_total)}</div></div>
        </div>`;
      })()}
      <div class="field-grid three">
        <div class="field"><div class="label">Forma de Faturamento</div><div class="value">${c.forma_faturamento || ""}</div></div>
        <div class="field"><div class="label">KM Excedente</div><div class="value">${c.km_excedente || ""}</div></div>
        <div class="field"><div class="label">Hora Extra</div><div class="value">${c.hora_extra || ""}</div></div>
        <div class="field"><div class="label">Estacionamento / Pedágio</div><div class="value">${c.estacionamento_pedagio || ""}</div></div>
        <div class="field"><div class="label">Alimentação Motorista</div><div class="value">${c.alimentacao_motorista || ""}</div></div>
        <div class="field"><div class="label">Condição de Pagamento</div><div class="value">${c.condicao_pagamento || ""}</div></div>
        <div class="field"><div class="label">Data Vencimento</div><div class="value">${fd(c.data_vencimento)}</div></div>
      </div>
      ${c.outros_extras ? `<div class="field"><div class="label">Outros Extras</div><div class="value">${c.outros_extras}</div></div>` : ""}
      ${c.dados_faturamento ? `<div class="field"><div class="label">Dados para Faturamento</div><div class="value">${c.dados_faturamento}</div></div>` : ""}
      ${c.dados_bancarios ? `<div class="field"><div class="label">Dados Bancários</div><div class="value">${c.dados_bancarios.replace(/\n/g, "<br/>")}</div></div>` : ""}
    </div>
  </div>

  <div class="clause">
    <div class="clause-title">CLÁUSULA 5 — DAS OBRIGAÇÕES DA CONTRATADA</div>
    <div class="clause-body">
      ${c.com_motorista === false ? `
      <p>a) Disponibilizar o veículo nas condições acordadas, em perfeito estado de conservação, limpeza e com toda a documentação em dia;</p>
      <p>b) Entregar o veículo com o tanque cheio de combustível ao início da locação;</p>
      <p>c) Manter o seguro do veículo vigente durante o período de locação, observada a coparticipação prevista neste contrato;</p>
      <p>d) Prestar suporte ao CONTRATANTE em caso de pane mecânica não decorrente de mau uso.</p>
      ` : `
      <p>a) Disponibilizar o veículo nas condições acordadas, em perfeito estado de conservação e limpeza;</p>
      <p>b) Fornecer motorista habilitado, uniformizado e com experiência compatível;</p>
      <p>c) Arcar com todas as despesas de manutenção, seguro do veículo e encargos trabalhistas do motorista;</p>
      <p>d) Garantir pontualidade no atendimento conforme horários pactuados;</p>
      <p>e) Manter documentação do veículo e do motorista em dia;</p>
      <p>f) Substituir o veículo em caso de pane mecânica, sem custo adicional ao contratante.</p>
      `}
    </div>
  </div>

  <div class="clause">
    <div class="clause-title">CLÁUSULA 6 — DAS OBRIGAÇÕES DO CONTRATANTE</div>
    <div class="clause-body">
      <p>a) Efetuar o pagamento nas condições e prazos pactuados;</p>
      <p>b) Utilizar o veículo dentro das finalidades previstas neste contrato;</p>
      <p>c) Respeitar a capacidade máxima de passageiros do veículo;</p>
      <p>d) Zelar pela conservação do veículo durante o período de utilização.</p>
    </div>
  </div>

  <div class="clause">
    <div class="clause-title">CLÁUSULA 7 — DO CANCELAMENTO E MULTAS</div>
    <div class="clause-body">
      ${c.antecedencia_cancelamento ? `<p>${c.antecedencia_cancelamento.replace(/\n/g, "<br/>")}</p>` : `
      <p>a) O cancelamento deverá ser comunicado com antecedência mínima de 24 horas;</p>
      <p>b) Cancelamento sem antecedência mínima: multa de 50% sobre o valor total;</p>
      <p>c) No-show (não comparecimento): cobrança integral do serviço;</p>
      <p>d) Atraso superior a 30 minutos do contratante: cobrança de hora extra.</p>`}
    </div>
  </div>

  <div class="clause">
    <div class="clause-title">CLÁUSULA 8 — DAS RESPONSABILIDADES</div>
    <div class="clause-body">
      ${c.com_motorista === false ? `
      <p>a) A CONTRATADA responde pelas condições mecânicas do veículo entregue, ressalvados os danos, avarias e desgastes decorrentes do uso pelo CONTRATANTE;</p>
      <p>b) O CONTRATANTE responde integralmente pela guarda, conservação e utilização adequada do veículo durante todo o período da locação;</p>
      <p>c) A CONTRATADA não se responsabiliza por objetos deixados no veículo, nem por atrasos, prejuízos ou danos decorrentes de eventos de força maior.</p>
      ` : `
      <p>a) A CONTRATADA é responsável por danos causados a terceiros durante a prestação do serviço;</p>
      <p>b) A CONTRATADA manterá seguro do veículo com cobertura para passageiros;</p>
      <p>c) A CONTRATADA não se responsabiliza por atrasos causados por condições climáticas, trânsito ou eventos de força maior.</p>
      `}
    </div>
  </div>

  ${c.com_motorista === false ? `
  <div class="clause">
    <div class="clause-title">CLÁUSULA 9 — DA LOCAÇÃO DE VEÍCULO SEM MOTORISTA</div>
    <div class="clause-body">
      <p>Considerando que a presente contratação se dá na modalidade <b>sem motorista</b>, ficam estabelecidas as seguintes disposições:</p>
      <p>a) O CONTRATANTE é integralmente responsável por multas de trânsito, infrações administrativas e quaisquer atos decorrentes do mau uso do veículo durante o período da locação, comprometendo-se a arcar com todos os valores, taxas e encargos correspondentes;</p>
      <p>b) Em caso de furto, roubo ou colisão, fica estabelecida a <b>coparticipação obrigatória do CONTRATANTE no valor de R$ 15.000,00 (quinze mil reais)</b>;</p>
      <p>c) O veículo será entregue ao CONTRATANTE com o <b>tanque cheio de combustível</b> e deverá ser devolvido, ao término da locação, também com o <b>tanque cheio</b>, sob pena de cobrança do combustível faltante acrescido de taxa de reabastecimento;</p>
      <p>d) O CONTRATANTE deverá indicar formalmente, no ato da contratação, os Condutores autorizados a conduzir o veículo, informando nome completo, número da CNH e CPF. O CONTRATANTE reconhece que, em caso de autuação por infração de trânsito, a pontuação correspondente será imputada ao prontuário do condutor infrator, conforme determina a legislação de trânsito vigente, cabendo ao CONTRATANTE o pronto pagamento das multas e a regularização de qualquer pendência junto aos órgãos competentes.</p>
    </div>
  </div>` : ""}

  <div class="clause">
    <div class="clause-title">CLÁUSULA ${c.com_motorista === false ? "10" : "9"} — DA VIGÊNCIA</div>
    <div class="clause-body">
      <p>O presente contrato vigorará pelo período estipulado na Cláusula 3, podendo ser renovado mediante acordo entre as partes.</p>
    </div>
  </div>

  ${c.foro_comarca ? `
  <div class="clause">
    <div class="clause-title">CLÁUSULA ${c.com_motorista === false ? "11" : "10"} — DO FORO</div>
    <div class="clause-body">
      <p>Fica eleito o foro da Comarca de <b>${c.foro_comarca}</b> para dirimir quaisquer dúvidas oriundas do presente contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>
    </div>
  </div>` : ""}

  ${c.observacoes ? `
  <div class="clause">
    <div class="clause-title">OBSERVAÇÕES ADICIONAIS</div>
    <div class="clause-body"><p>${c.observacoes.replace(/\n/g, "<br/>")}</p></div>
  </div>` : ""}

  <div class="signatures">
    <div>
      <div class="sig-line">CONTRATANTE<br/>${c.contratante_nome || ""}<br/>CPF/CNPJ: ${c.contratante_cnpj_cpf || ""}</div>
    </div>
    <div>
      <img src="${RAFAEL_SIGNATURE_BASE64}" alt="Assinatura" style="height:60px;margin:0 auto 8px;display:block" />
      <div class="sig-line">CONTRATADA<br/>Executive Service Transporte e Turismo Ltda<br/>CNPJ: 03.143.672/0001-44<br/>Rafael Silva da Cunha — CPF: 899.744.500-63</div>
    </div>
  </div>

  <div class="footer">
    <span>Contrato Nº ${c.numero_contrato} — Emitido em ${new Date().toLocaleString("pt-BR")}</span>
    <span>Executive Service Transporte e Turismo Ltda — CNPJ: 03.143.672/0001-44</span>
  </div>
</div>
</body></html>`);
  w.document.close();
  w.onload = () => w.print();
};
