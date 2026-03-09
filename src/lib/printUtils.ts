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

export const printAgenda = (items: any[]) => {
  const rows = items.map(i => `<tr>
<td>${formatDate(i.data)}</td><td>${i.hora}</td><td>${i.cot}</td>
<td>${i.cliente}</td><td>${i.tipo}</td><td class="c">${i.pax}</td>
<td>${i.origem}</td><td>${i.destino}</td>
<td>${i.veiculo} (${i.placa})</td><td>${i.motorista}</td>
<td>${i.fornecedor}</td>
<td class="r">${formatCurrency(i.valor)}</td><td class="r">${formatCurrency(i.custo)}</td>
<td class="r b">${formatCurrency(i.valor - i.custo)}</td>
<td>${i.observacoes || ""}</td>
</tr>`).join("");

  const totalValor = items.reduce((s, i) => s + Number(i.valor), 0);
  const totalCusto = items.reduce((s, i) => s + Number(i.custo), 0);

  openPrint("Agenda de Serviços", `
<p class="sub">${items.length} registro(s)</p>
<table>
<thead><tr>
<th>Data</th><th>Hora</th><th>COT</th><th>Cliente</th><th>Tipo</th>
<th class="c">PAX</th><th>Origem</th><th>Destino</th><th>Veículo</th>
<th>Motorista</th><th>Fornecedor</th><th class="r">Valor</th><th class="r">Custo</th>
<th class="r">Margem</th><th>Obs</th>
</tr></thead>
<tbody>${rows}</tbody>
</table>
<div class="totals">
<b>Total Valor:</b> ${formatCurrency(totalValor)} &nbsp;|&nbsp;
<b>Total Custo:</b> ${formatCurrency(totalCusto)} &nbsp;|&nbsp;
<b>Margem:</b> ${formatCurrency(totalValor - totalCusto)}
</div>`);
};

export const printFatVeiculo = (items: any[]) => {
  const map = new Map<string, { veiculo: string; placa: string; viagens: number; receita: number; custo: number }>();
  items.forEach(i => {
    const e = map.get(i.placa) || { veiculo: i.veiculo, placa: i.placa, viagens: 0, receita: 0, custo: 0 };
    e.viagens += 1; e.receita += Number(i.valor); e.custo += Number(i.custo);
    map.set(i.placa, e);
  });
  const dados = Array.from(map.values()).sort((a, b) => b.receita - a.receita);
  const totalR = dados.reduce((s, d) => s + d.receita, 0);
  const totalC = dados.reduce((s, d) => s + d.custo, 0);

  const rows = dados.map(d => {
    const margem = d.receita - d.custo;
    const pct = d.receita > 0 ? ((margem / d.receita) * 100).toFixed(1) : "0";
    return `<tr><td>${d.veiculo}</td><td>${d.placa}</td><td class="c">${d.viagens}</td>
<td class="r">${formatCurrency(d.receita)}</td><td class="r">${formatCurrency(d.custo)}</td>
<td class="r b">${formatCurrency(margem)}</td><td class="r">${pct}%</td></tr>`;
  }).join("");

  openPrint("Faturamento por Veículo", `
<table><thead><tr><th>Veículo</th><th>Placa</th><th class="c">Viagens</th>
<th class="r">Receita</th><th class="r">Custo</th><th class="r">Margem</th><th class="r">%</th>
</tr></thead><tbody>${rows}</tbody></table>
<div class="totals"><b>Receita:</b> ${formatCurrency(totalR)} | <b>Custo:</b> ${formatCurrency(totalC)} | <b>Margem:</b> ${formatCurrency(totalR - totalC)}</div>`);
};

export const printFatFornecedor = (items: any[]) => {
  const map = new Map<string, { fornecedor: string; viagens: number; receita: number; custo: number; pax: number }>();
  items.forEach(i => {
    const e = map.get(i.fornecedor) || { fornecedor: i.fornecedor, viagens: 0, receita: 0, custo: 0, pax: 0 };
    e.viagens += 1; e.receita += Number(i.valor); e.custo += Number(i.custo); e.pax += Number(i.pax);
    map.set(i.fornecedor, e);
  });
  const dados = Array.from(map.values()).sort((a, b) => b.custo - a.custo);
  const totalR = dados.reduce((s, d) => s + d.receita, 0);
  const totalC = dados.reduce((s, d) => s + d.custo, 0);

  const rows = dados.map(d => {
    const margem = d.receita - d.custo;
    const pct = d.receita > 0 ? ((margem / d.receita) * 100).toFixed(1) : "0";
    return `<tr><td>${d.fornecedor}</td><td class="c">${d.viagens}</td><td class="c">${d.pax}</td>
<td class="r">${formatCurrency(d.receita)}</td><td class="r">${formatCurrency(d.custo)}</td>
<td class="r b">${formatCurrency(margem)}</td><td class="r">${pct}%</td></tr>`;
  }).join("");

  openPrint("Faturamento por Fornecedor", `
<table><thead><tr><th>Fornecedor</th><th class="c">Viagens</th><th class="c">PAX</th>
<th class="r">Receita</th><th class="r">Custo</th><th class="r">Margem</th><th class="r">%</th>
</tr></thead><tbody>${rows}</tbody></table>
<div class="totals"><b>Receita:</b> ${formatCurrency(totalR)} | <b>Custo:</b> ${formatCurrency(totalC)} | <b>Margem:</b> ${formatCurrency(totalR - totalC)}</div>`);
};
