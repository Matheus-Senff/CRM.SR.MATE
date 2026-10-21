"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

export type EstadoAcao = { erro?: string; ok?: string };
export type Acao = (estado: EstadoAcao, formData: FormData) => Promise<EstadoAcao>;

// Formulário que mostra o erro (ou a confirmação) devolvido pela server action.
export function AcaoForm({
  action,
  children,
  className,
}: {
  action: Acao;
  children: ReactNode;
  className?: string;
}) {
  const [estado, acao] = useActionState(action, {});
  return (
    <form action={acao} className={className}>
      {children}
      {estado.erro && <div className="alert alert-critical">{estado.erro}</div>}
      {estado.ok && <div className="alert alert-good">{estado.ok}</div>}
    </form>
  );
}

export function BotaoEnviar({
  children,
  className = "btn btn-primary",
  name,
  value,
}: {
  children: ReactNode;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} name={name} value={value}>
      {pending ? "Salvando…" : children}
    </button>
  );
}
