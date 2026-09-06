// Cálculo da receita total de um serviço da agenda (cliente),
// incluindo os extras cobrados: estacionamento, outros, km extra e hora extra.

const parseMoneyValue = (v: any): number => {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const normalized = String(v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const horaExtraToHours = (he?: string | null): number => {
  if (!he || typeof he !== "string") return 0;
  const parts = he.split(":").map(Number);
  const h = isNaN(parts[0]) ? 0 : parts[0];
  const m = isNaN(parts[1]) ? 0 : parts[1];
  return h + m / 60;
};

export const calcReceitaServico = (item: any): number => {
  const base = Number(item?.valor) || 0;
  const estacionamento = parseMoneyValue(item?.estacionamento);
  const outros = parseMoneyValue(item?.outros);
  const despesas = item?.outros_despesas ?? item?.outrosDespesas;
  const outrosDespesas = Array.isArray(despesas)
    ? despesas.reduce((s: number, d: any) => s + parseMoneyValue(d?.valor), 0)
    : 0;
  const kmExtra = (Number(item?.km_extra ?? item?.kmExtra) || 0)
    * (Number(item?.valor_km_extra ?? item?.valorKmExtra) || 0);
  const horaExtra = horaExtraToHours(item?.hora_extra ?? item?.horaExtra)
    * (Number(item?.valor_hora_extra ?? item?.valorHoraExtra) || 0);
  return base + estacionamento + outros + outrosDespesas + kmExtra + horaExtra;
};
