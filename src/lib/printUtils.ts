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
