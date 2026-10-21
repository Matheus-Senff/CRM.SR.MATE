import type { CSSProperties } from "react";
import {
  ESTAGIOS_ABERTOS,
  ROTULO_CANAL,
  ROTULO_ESTAGIO,
  ROTULO_STATUS,
  type Canal,
  type Estagio,
  type StatusProposta,
} from "@/lib/dominio";

function Badge({ cor, children }: { cor: string; children: React.ReactNode }) {
  return (
    <span className="badge" style={{ "--badge": cor } as CSSProperties}>
      {children}
    </span>
  );
}

export function corEstagio(estagio: Estagio) {
  if (estagio === "perdido") return "var(--status-critical)";
  if (estagio === "ganho") return "var(--status-good)";
  return `var(--funil-${ESTAGIOS_ABERTOS.indexOf(estagio) + 2})`;
}

export function CanalBadge({ canal }: { canal: Canal }) {
  return <Badge cor={`var(--canal-${canal})`}>{ROTULO_CANAL[canal]}</Badge>;
}

export function EstagioBadge({ estagio }: { estagio: Estagio }) {
  return <Badge cor={corEstagio(estagio)}>{ROTULO_ESTAGIO[estagio]}</Badge>;
}

const COR_STATUS: Record<StatusProposta, string> = {
  rascunho: "var(--text-muted)",
  aguardando_aprovacao: "var(--status-warning-text)",
  aprovada: "var(--status-good)",
  recusada: "var(--status-critical)",
  bloqueada: "var(--status-critical)",
  enviada: "var(--series-1)",
  aceita: "var(--status-good)",
  perdida: "var(--status-critical)",
};

export function StatusBadge({ status }: { status: StatusProposta }) {
  return <Badge cor={COR_STATUS[status]}>{ROTULO_STATUS[status]}</Badge>;
}
