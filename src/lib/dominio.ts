export type Canal = "distribuidor" | "atacado" | "varejo";
export type Estagio = "novo_lead" | "contato_feito" | "proposta_enviada" | "negociacao" | "ganho" | "perdido";
export type Papel = "vendedor" | "gestor" | "admin";
export type StatusProposta =
  | "rascunho"
  | "aguardando_aprovacao"
  | "aprovada"
  | "recusada"
  | "bloqueada"
  | "enviada"
  | "aceita"
  | "perdida";
export type TipoInteracao = "whatsapp" | "ligacao" | "email" | "visita" | "sistema";

export const CANAIS: Canal[] = ["distribuidor", "atacado", "varejo"];
export const ESTAGIOS: Estagio[] = ["novo_lead", "contato_feito", "proposta_enviada", "negociacao", "ganho", "perdido"];
export const ESTAGIOS_ABERTOS: Estagio[] = ["novo_lead", "contato_feito", "proposta_enviada", "negociacao"];
export const STATUS_PROPOSTA: StatusProposta[] = [
  "rascunho",
  "aguardando_aprovacao",
  "aprovada",
  "recusada",
  "bloqueada",
  "enviada",
  "aceita",
  "perdida",
];
export const TIPOS_INTERACAO_MANUAL: TipoInteracao[] = ["whatsapp", "ligacao", "email", "visita"];

export const ROTULO_CANAL: Record<Canal, string> = {
  distribuidor: "Distribuidor",
  atacado: "Atacado",
  varejo: "Varejo",
};

export const ROTULO_ESTAGIO: Record<Estagio, string> = {
  novo_lead: "Novo lead",
  contato_feito: "Contato feito",
  proposta_enviada: "Proposta enviada",
  negociacao: "Negociação",
  ganho: "Fechado – ganho",
  perdido: "Fechado – perdido",
};

export const ROTULO_STATUS: Record<StatusProposta, string> = {
  rascunho: "Rascunho (sem estoque)",
  aguardando_aprovacao: "Aguardando aprovação",
  aprovada: "Aprovada",
  recusada: "Desconto recusado",
  bloqueada: "Bloqueada",
  enviada: "Enviada",
  aceita: "Aceita",
  perdida: "Perdida",
};

export const ROTULO_INTERACAO: Record<TipoInteracao, string> = {
  whatsapp: "WhatsApp",
  ligacao: "Ligação",
  email: "E-mail",
  visita: "Visita",
  sistema: "Sistema",
};

export const ROTULO_PAPEL: Record<Papel, string> = {
  vendedor: "Vendedor",
  gestor: "Gestor",
  admin: "Diretoria (admin)",
};

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export type RegrasDesconto = { limite_automatico: number; limite_gestor: number };
export type FaixaDesconto = "automatico" | "gestor" | "bloqueado";

// Espelha public.faixa_desconto, só para a prévia na tela; quem decide é o banco.
export function faixaDesconto(pct: number, regras: RegrasDesconto): FaixaDesconto {
  if (pct <= regras.limite_automatico) return "automatico";
  if (pct <= regras.limite_gestor) return "gestor";
  return "bloqueado";
}

export function isCanal(v: unknown): v is Canal {
  return typeof v === "string" && (CANAIS as string[]).includes(v);
}
export function isEstagio(v: unknown): v is Estagio {
  return typeof v === "string" && (ESTAGIOS as string[]).includes(v);
}
export function isStatusProposta(v: unknown): v is StatusProposta {
  return typeof v === "string" && (STATUS_PROPOSTA as string[]).includes(v);
}
export function isTipoInteracaoManual(v: unknown): v is TipoInteracao {
  return typeof v === "string" && (TIPOS_INTERACAO_MANUAL as string[]).includes(v);
}
