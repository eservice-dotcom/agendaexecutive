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

  const cards = items.map((ai, idx) => {
    const kmTotal = (Number(ai.km_fim) || 0) - (Number(ai.km_in) || 0);
    const outrosDespesas = ai.outros_despesas
      ? Array.isArray(ai.outros_despesas)
        ? ai.outros_despesas
        : JSON.parse(ai.outros_despesas)
      : [];
    const outrosTotal =
      outrosDespesas.reduce((s: number, d: any) => s + (Number(d.valor) || 0), 0) +
      (Number(ai.outros) || 0);

    const despesasDetail = outrosDespesas.length > 0
      ? outrosDespesas.map((d: any) => `${d.descricao || "Outros"}: ${formatCurrency(Number(d.valor) || 0)}`).join(" · ")
      : "";

    return `<div class="card">
      <div class="card-header">
        <span class="card-num">${idx + 1}</span>
        <span class="card-os">O.S. ${ai.cot || "—"}</span>
        <span class="card-date">${ai.data ? formatDate(ai.data) : ""}</span>
        <span class="card-type">${ai.tipo || ""}</span>
      </div>
      <div class="card-body">
        <div class="card-row">
          <div class="card-field"><span class="lbl">Trajeto</span><span class="val">${ai.origem || ""} → ${ai.destino || ""}</span></div>
          <div class="card-field"><span class="lbl">Motorista</span><span class="val">${ai.motorista || "—"}</span></div>
          <div class="card-field"><span class="lbl">Veículo</span><span class="val">${ai.veiculo || ""} ${ai.placa ? `(${ai.placa})` : ""}</span></div>
        </div>
        <div class="card-row">
          <div class="card-field"><span class="lbl">Horário</span><span class="val">${ai.hora_in || "—"} → ${ai.hora_fim || "—"}</span></div>
          <div class="card-field"><span class="lbl">H. Extra</span><span class="val">${ai.hora_extra || "—"}</span></div>
          <div class="card-field"><span class="lbl">KM</span><span class="val">${Number(ai.km_in) || 0} → ${Number(ai.km_fim) || 0} (${kmTotal})</span></div>
          <div class="card-field"><span class="lbl">KM Extra</span><span class="val">${Number(ai.km_extra) || 0}</span></div>
        </div>
        <div class="card-row">
          <div class="card-field"><span class="lbl">Estacionamento</span><span class="val">${formatCurrency(Number(ai.estacionamento) || 0)}</span></div>
          <div class="card-field"><span class="lbl">Outros</span><span class="val">${formatCurrency(outrosTotal)}${despesasDetail ? ` (${despesasDetail})` : ""}</span></div>
          <div class="card-field"><span class="lbl">Valor</span><span class="val money">${formatCurrency(Number(ai.valor) || 0)}</span></div>
        </div>
      </div>
    </div>`;
  }).join("");

  const totalValor = items.reduce((s, ai) => s + (Number(ai.valor) || 0), 0);
  const totalEstac = items.reduce((s, ai) => s + (Number(ai.estacionamento) || 0), 0);
  const totalKm = items.reduce((s, ai) => s + ((Number(ai.km_fim) || 0) - (Number(ai.km_in) || 0)), 0);
  const totalKmExtra = items.reduce((s, ai) => s + (Number(ai.km_extra) || 0), 0);

  let vendaInfoHTML = "";
  if (vendaInfo) {
    const extras = vendaInfo.extras || [];
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
        <h3>Detalhes</h3>
        ${vendaInfo.data_venda ? `<p><strong>Data da Venda:</strong> ${formatDate(vendaInfo.data_venda)}</p>` : ""}
        ${vendaInfo.valor_total != null ? `<p><strong>Valor Total:</strong> ${formatCurrency(vendaInfo.valor_total)}</p>` : ""}
        ${extrasHTML}
      </div>
    </div>`;
  }

  let obsHTML = "";
  if (vendaInfo?.observacoes) {
    obsHTML = `<div style="margin-top:16px;padding:10px;background:#fffbeb;border:1px solid #f0d68a;border-radius:4px"><strong>Observações:</strong> ${vendaInfo.observacoes}</div>`;
  }

  const html = `<!DOCTYPE html><html><head><title>${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;padding:20px;color:#1a1a1a;font-size:11px}
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
.card{border:1px solid #ddd;border-radius:6px;margin-bottom:10px;overflow:hidden;page-break-inside:avoid}
.card-header{background:#2d3748;color:#fff;padding:6px 10px;display:flex;align-items:center;gap:10px;font-size:11px}
.card-num{background:#b8860b;color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:10px;flex-shrink:0}
.card-os{font-weight:bold;font-family:monospace;font-size:11px}
.card-date{color:#cbd5e0}
.card-type{margin-left:auto;background:rgba(255,255,255,0.15);padding:2px 8px;border-radius:3px;font-size:10px}
.card-body{padding:8px 10px}
.card-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px}
.card-row:last-child{margin-bottom:0}
.card-field{flex:1;min-width:120px;display:flex;flex-direction:column}
.lbl{font-size:8px;text-transform:uppercase;color:#888;letter-spacing:0.3px}
.val{font-size:10px;font-weight:500}
.val.money{font-weight:bold;font-family:monospace}
.footer{margin-top:16px;padding-top:8px;border-top:2px solid #b8860b;text-align:center;font-size:9px;color:#888}
@media print{body{padding:10px}@page{size:portrait;margin:10mm}.card{break-inside:avoid}}
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
  <div class="summary-box"><div class="label">Valor Total</div><div class="value">${formatCurrency(totalValor)}</div></div>
</div>
${cards}
<div class="card" style="border-color:#b8860b;background:#fdf8ef">
  <div class="card-header" style="background:#b8860b">
    <span style="font-weight:bold;font-size:12px">TOTAIS</span>
  </div>
  <div class="card-body">
    <div class="card-row">
      <div class="card-field"><span class="lbl">KM Total</span><span class="val money">${totalKm}</span></div>
      <div class="card-field"><span class="lbl">KM Extra</span><span class="val money">${totalKmExtra}</span></div>
      <div class="card-field"><span class="lbl">Estacionamento</span><span class="val money">${formatCurrency(totalEstac)}</span></div>
      <div class="card-field"><span class="lbl">Custo Total</span><span class="val money">${formatCurrency(totalCusto)}</span></div>
      <div class="card-field"><span class="lbl">Valor Total</span><span class="val money">${formatCurrency(totalValor)}</span></div>
    </div>
  </div>
</div>
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
