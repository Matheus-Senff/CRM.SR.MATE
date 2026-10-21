import Link from "next/link";
import type { ReactNode } from "react";
import { CanalBadge, StatusBadge } from "@/components/badges";
import type { Canal, StatusProposta } from "@/lib/dominio";
import { fmtData, fmtMoeda } from "@/lib/formato";

export type PropostaCompleta = {
  id: string;
  numero: number;
  canal: Canal;
  desconto_pct: number;
  status: StatusProposta;
  subtotal: number;
  desconto_valor: number;
  total: number;
  observacao: string | null;
  bling_pedido_id: number | null;
  bling_erro: string | null;
  created_at: string;
  negociacoes: { id: string; titulo: string; empresas: { id: string; nome: string } };
  proposta_itens: { quantidade: number; preco_unitario: number; total: number; produtos: { nome: string } }[];
};

export const SELECT_PROPOSTA = `id, numero, canal, desconto_pct, status, subtotal, desconto_valor, total, observacao,
  bling_pedido_id, bling_erro, created_at,
  negociacoes!inner(id, titulo, empresas!inner(id, nome)),
  proposta_itens(quantidade, preco_unitario, total, produtos!inner(nome))`;

export function CartaoProposta({ proposta: p, children }: { proposta: PropostaCompleta; children?: ReactNode }) {
  return (
    <div className="propcard">
      <div className="pc-top">
        <div>
          <div className="pc-title">
            <Link href={`/clientes/${p.negociacoes.empresas.id}`}>{p.negociacoes.empresas.nome}</Link>
            <CanalBadge canal={p.canal} />
          </div>
          <div className="pc-sub">
            Proposta #{p.numero} · {p.negociacoes.titulo} · {fmtData(p.created_at)} · desconto de{" "}
            {Number(p.desconto_pct)}%
          </div>
        </div>
        <div>
          <div className="pc-total">{fmtMoeda(p.total)}</div>
          <div style={{ textAlign: "right", marginTop: 4 }}>
            <StatusBadge status={p.status} />
          </div>
        </div>
      </div>
      <div className="pc-items">
        {p.proposta_itens.map((i, idx) => (
          <div key={idx}>
            {i.produtos.nome} × {i.quantidade} — {fmtMoeda(i.preco_unitario)} un. = {fmtMoeda(i.total)}
          </div>
        ))}
        <div>
          Subtotal {fmtMoeda(p.subtotal)} − desconto {fmtMoeda(p.desconto_valor)} = <b>{fmtMoeda(p.total)}</b>
        </div>
        {p.observacao && <div>Obs.: {p.observacao}</div>}
      </div>
      {children}
    </div>
  );
}
