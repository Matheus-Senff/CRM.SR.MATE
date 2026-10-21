"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { CanalBadge, corEstagio } from "@/components/badges";
import { ESTAGIOS, ROTULO_ESTAGIO, type Canal, type Estagio } from "@/lib/dominio";
import { fmtMoeda } from "@/lib/formato";
import { moverEstagio } from "../actions";

export type CartaoNegociacao = {
  id: string;
  titulo: string;
  estagio: Estagio;
  valor_estimado: number;
  empresas: { id: string; nome: string; canal: Canal };
};

export function Kanban({ negociacoes }: { negociacoes: CartaoNegociacao[] }) {
  const [itens, moverOtimista] = useOptimistic(negociacoes, (atual, { id, estagio }: { id: string; estagio: Estagio }) =>
    atual.map((n) => (n.id === id ? { ...n, estagio } : n)),
  );
  const [, iniciar] = useTransition();
  const [alvo, setAlvo] = useState<Estagio | null>(null);
  const [erro, setErro] = useState<string>();

  function mover(id: string, estagio: Estagio) {
    const atual = itens.find((n) => n.id === id);
    if (!atual || atual.estagio === estagio) return;
    setErro(undefined);
    iniciar(async () => {
      moverOtimista({ id, estagio });
      const resultado = await moverEstagio(id, estagio);
      if (resultado.erro) setErro(resultado.erro);
    });
  }

  return (
    <>
      {erro && <div className="alert alert-critical">{erro}</div>}
      <div className="kanban">
        {ESTAGIOS.map((estagio) => {
          const coluna = itens.filter((n) => n.estagio === estagio);
          const total = coluna.reduce((s, n) => s + Number(n.valor_estimado), 0);
          return (
            <div
              key={estagio}
              className={`kanban-col${alvo === estagio ? " dragover" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setAlvo(estagio);
              }}
              onDragLeave={() => setAlvo(null)}
              onDrop={(e) => {
                e.preventDefault();
                setAlvo(null);
                mover(e.dataTransfer.getData("text/plain"), estagio);
              }}
            >
              <div className="kc-head">
                <span style={{ color: corEstagio(estagio) }}>{ROTULO_ESTAGIO[estagio]}</span>
                <span className="kc-count">{coluna.length}</span>
              </div>
              <div className="kpi-note" style={{ padding: "0 6px 8px", marginTop: 0 }}>
                {fmtMoeda(total)}
              </div>
              {coluna.length ? (
                coluna.map((n) => (
                  <div
                    key={n.id}
                    className="kcard"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", n.id)}
                  >
                    <div className="kc-nome">
                      <Link href={`/clientes/${n.empresas.id}`}>{n.empresas.nome}</Link>
                    </div>
                    <div className="muted">{n.titulo}</div>
                    <div className="kc-meta">
                      <CanalBadge canal={n.empresas.canal} />
                      <b>{fmtMoeda(n.valor_estimado)}</b>
                    </div>
                    <select
                      aria-label="Mover para"
                      value={n.estagio}
                      onChange={(e) => mover(n.id, e.target.value as Estagio)}
                    >
                      {ESTAGIOS.map((e) => (
                        <option key={e} value={e}>
                          {ROTULO_ESTAGIO[e]}
                        </option>
                      ))}
                    </select>
                  </div>
                ))
              ) : (
                <div className="empty-state" style={{ padding: "20px 6px" }}>
                  Vazio
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
