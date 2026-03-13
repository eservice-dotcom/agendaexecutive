import logo from "@/assets/logo-executive-service.png";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

export interface ClosingReportItem {
  cot?: string;
  data?: string;
  hora?: string;
  tipo?: string;
  origem?: string;
  destino?: string;
  pax?: number;
  motorista?: string;
  veiculo?: string;
  placa?: string;
  fornecedor?: string;
  valor?: number;
  custo?: number;
  km_in?: number;
  km_fim?: number;
  km_extra?: number;
  hora_in?: string;
  hora_fim?: string;
  hora_extra?: string;
  estacionamento?: number;
  outros?: number;
  outros_despesas?: any;
  cliente?: string;
}

export interface ClosingReportVendaInfo {
  numero_venda?: number;
  cliente?: string;
  data_venda?: string;
  data_vencimento?: string | null;
  forma_pagamento?: string;
  status?: string;
  observacoes?: string | null;
  valor_total?: number;
  extras?: { descricao: string; valor: number }[];
}

export const generateClosingReport = (
  items: ClosingReportItem[],
  title: string,
  subtitle: string,
  vendaInfo?: ClosingReportVendaInfo
) => {
  const logoUrl = new URL(logo, window.location.origin).href;

  const rows = items.map((ai, idx) => {
    const kmTotal = (Number(ai.km_fim) || 0) - (Number(ai.km_in) || 0);
    const outrosDespesas = ai.outros_despesas
      ? Array.isArray(ai.outros_despesas)
        ? ai.outros_despesas
        : JSON.parse(ai.outros_despesas)
      : [];
    const outrosTotal =
      outrosDespesas.reduce((s: number, d: any) => s + (Number(d.valor) || 0), 0) +
      (Number(ai.outros) || 0);

    return `<tr>
      <td class="c">${idx + 1}</td>
      <td>${ai.cot || ""}</td>
      <td>${ai.data ? formatDate(ai.data) : ""}</td>
      <td>${ai.tipo || ""}</td>
      <td>${ai.origem || ""} → ${ai.destino || ""}</td>
      <td>${ai.motorista || ""}</td>
      <td>${ai.veiculo || ""} (${ai.placa || ""})</td>
      <td class="c">${ai.hora_in || "—"}</td>
      <td class="c">${ai.hora_fim || "—"}</td>
      <td class="c">${ai.hora_extra || "—"}</td>
      <td class="r">${Number(ai.km_in) || 0}</td>
      <td class="r">${Number(ai.km_fim) || 0}</td>
      <td class="r">${kmTotal}</td>
      <td class="r">${Number(ai.km_extra) || 0}</td>
      <td class="r">${formatCurrency(Number(ai.estacionamento) || 0)}</td>
      <td class="r">${formatCurrency(outrosTotal)}</td>
      <td class="r">${formatCurrency(Number(ai.custo) || 0)}</td>
      <td class="r">${formatCurrency(Number(ai.valor) || 0)}</td>
    </tr>`;
  }).join("");

  const totalCusto = items.reduce((s, ai) => s + (Number(ai.custo) || 0), 0);
  const totalValor = items.reduce((s, ai) => s + (Number(ai.valor) || 0), 0);
  const totalEstac = items.reduce((s, ai) => s + (Number(ai.estacionamento) || 0), 0);
  const totalKm = items.reduce((s, ai) => s + ((Number(ai.km_fim) || 0) - (Number(ai.km_in) || 0)), 0);
  const totalKmExtra = items.reduce((s, ai) => s + (Number(ai.km_extra) || 0), 0);

  // Venda info section
  let vendaInfoHTML = "";
  if (vendaInfo) {
    const extras = vendaInfo.extras || [];
    const extrasTotal = extras.reduce((s, e) => s + (Number(e.valor) || 0), 0);
    const extrasHTML = extras.length > 0
      ? `<p><strong>Extras:</strong> ${extras.map(e => `${e.descricao} (${formatCurrency(Number(e.valor))})`).join(", ")}</p>`
      : "";

    vendaInfoHTML = `
    <div class="info-grid">
      <div class="info-box">
        <h3>Cliente</h3>
        <p><strong>${vendaInfo.cliente || ""}</strong></p>
      </div>
      <div class="info-box">
        <h3>Detalhes da Venda</h3>
        ${vendaInfo.numero_venda ? `<p><strong>Venda Nº:</strong> ${vendaInfo.numero_venda}</p>` : ""}
        ${vendaInfo.data_venda ? `<p><strong>Data da Venda:</strong> ${formatDate(vendaInfo.data_venda)}</p>` : ""}
        ${vendaInfo.data_vencimento ? `<p><strong>Vencimento:</strong> ${formatDate(vendaInfo.data_vencimento)}</p>` : ""}
        ${vendaInfo.forma_pagamento ? `<p><strong>Forma de Pagamento:</strong> ${vendaInfo.forma_pagamento}</p>` : ""}
        ${vendaInfo.status ? `<p><strong>Status:</strong> ${vendaInfo.status.toUpperCase()}</p>` : ""}
        ${vendaInfo.valor_total != null ? `<p><strong>Valor Total:</strong> ${formatCurrency(vendaInfo.valor_total)}</p>` : ""}
        ${extrasHTML}
      </div>
    </div>`;
  }

  // Observações
  let obsHTML = "";
  if (vendaInfo?.observacoes) {
    obsHTML = `<div style="margin-top:16px;padding:10px;background:#fffbeb;border:1px solid #f0d68a;border-radius:4px"><strong>Observações:</strong> ${vendaInfo.observacoes}</div>`;
  }

  const html = `<!DOCTYPE html><html><head><title>${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;padding:20px;color:#1a1a1a;font-size:10px}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;border-bottom:3px solid #b8860b;padding-bottom:12px}
.header img{height:50px}
.header-info{text-align:right}
.header-info h1{font-size:18px;color:#b8860b;margin-bottom:4px}
.header-info p{font-size:10px;color:#666}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
.info-box{background:#f9f9f9;border:1px solid #e0e0e0;border-radius:6px;padding:10px}
.info-box h3{font-size:9px;text-transform:uppercase;color:#888;margin-bottom:4px;letter-spacing:0.5px}
.info-box p{font-size:10px;margin-bottom:2px}
.summary{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:16px}
.summary-box{background:#f9f9f9;border:1px solid #e0e0e0;border-radius:4px;padding:8px;text-align:center}
.summary-box .label{font-size:9px;text-transform:uppercase;color:#888;margin-bottom:2px}
.summary-box .value{font-size:13px;font-weight:bold;color:#1a1a1a}
table{width:100%;border-collapse:collapse;margin-top:8px}
th,td{border:1px solid #ddd;padding:3px 5px;text-align:left;font-size:9px}
th{background:#2d3748;color:#fff;font-weight:600;font-size:8px;text-transform:uppercase}
.r{text-align:right}.c{text-align:center}.b{font-weight:700}
.total-row{background:#f7f7f7;font-weight:bold;font-size:10px}
.footer{margin-top:16px;padding-top:8px;border-top:2px solid #b8860b;text-align:center;font-size:9px;color:#888}
@media print{body{padding:10px}@page{size:landscape;margin:8mm}}
</style></head><body>
<div class="header">
  <img src="${logoUrl}" alt="Executive Service" />
  <div class="header-info">
    <h1>RELATÓRIO DE FECHAMENTO</h1>
    <p>${subtitle}</p>
    <p>Emitido em: ${new Date().toLocaleString("pt-BR")}</p>
  </div>
</div>
${vendaInfoHTML}
<div class="summary">
  <div class="summary-box"><div class="label">Serviços</div><div class="value">${items.length}</div></div>
  <div class="summary-box"><div class="label">KM Total</div><div class="value">${totalKm}</div></div>
  <div class="summary-box"><div class="label">KM Extra</div><div class="value">${totalKmExtra}</div></div>
  <div class="summary-box"><div class="label">Estacionamento</div><div class="value">${formatCurrency(totalEstac)}</div></div>
  <div class="summary-box"><div class="label">Margem</div><div class="value">${formatCurrency(totalValor - totalCusto)}</div></div>
</div>
<table>
  <thead><tr>
    <th class="c">#</th><th>O.S.</th><th>Data</th><th>Tipo</th><th>Trajeto</th>
    <th>Motorista</th><th>Veículo</th>
    <th class="c">H.In</th><th class="c">H.Fim</th><th class="c">H.Extra</th>
    <th class="r">KM In</th><th class="r">KM Fim</th><th class="r">KM</th><th class="r">KM Extra</th>
    <th class="r">Estac.</th><th class="r">Outros</th>
    <th class="r">Custo</th><th class="r">Valor</th>
  </tr></thead>
  <tbody>
    ${rows}
    <tr class="total-row">
      <td colspan="12" class="r">TOTAIS</td>
      <td class="r">${totalKm}</td>
      <td class="r">${totalKmExtra}</td>
      <td class="r">${formatCurrency(totalEstac)}</td>
      <td class="r">—</td>
      <td class="r">${formatCurrency(totalCusto)}</td>
      <td class="r">${formatCurrency(totalValor)}</td>
    </tr>
  </tbody>
</table>
${obsHTML}
<div class="footer">
  <p>Executive Service — Relatório de Fechamento gerado automaticamente</p>
</div>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.onload = () => w.print();
};
