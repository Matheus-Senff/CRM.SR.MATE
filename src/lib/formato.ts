const FUSO = "America/Sao_Paulo";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const data = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric" });
const dataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function fmtMoeda(valor: number | string | null | undefined) {
  return moeda.format(Number(valor ?? 0));
}

export function fmtData(iso: string | null | undefined) {
  return iso ? data.format(new Date(iso)) : "—";
}

export function fmtDataHora(iso: string | null | undefined) {
  return iso ? dataHora.format(new Date(iso)) : "—";
}

// Data de hoje no fuso de Brasília, no formato AAAA-MM-DD.
export function hojeISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date());
}
