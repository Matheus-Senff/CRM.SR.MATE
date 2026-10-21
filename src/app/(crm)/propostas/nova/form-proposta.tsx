"use client";

import { useState } from "react";
import { AcaoForm, BotaoEnviar } from "@/components/acao-form";
import { faixaDesconto, ROTULO_CANAL, type Canal, type RegrasDesconto } from "@/lib/dominio";
import { fmtMoeda } from "@/lib/formato";
import { criarProposta } from "../../actions";

export type NegociacaoOpcao = { id: string; titulo: string; empresas: { nome: string; canal: Canal } };
export type ProdutoOpcao = {
  id: string;
  nome: string;
  quantidade_minima: number;
  disponivel: number;
  precos: Partial<Record<Canal, number>>;
};

type Linha = { chave: number; produtoId: string; quantidade: number };

export function FormProposta({
  negociacoes,
  produtos,
  regras,
  negociacaoInicial,
}: {
  negociacoes: NegociacaoOpcao[];
  produtos: ProdutoOpcao[];
  regras: RegrasDesconto;
  negociacaoInicial: string;
}) {
  const [negociacaoId, setNegociacaoId] = useState(
    negociacoes.some((n) => n.id === negociacaoInicial) ? negociacaoInicial : negociacoes[0].id,
  );
  const [linhas, setLinhas] = useState<Linha[]>([
    { chave: 0, produtoId: produtos[0]?.id ?? "", quantidade: produtos[0]?.quantidade_minima ?? 1 },
  ]);
  const [desconto, setDesconto] = useState(0);

  const canal = negociacoes.find((n) => n.id === negociacaoId)!.empresas.canal;
  const produto = (id: string) => produtos.find((p) => p.id === id);

  // Soma as linhas repetidas do mesmo produto, como o banco faz.
  const totais = new Map<string, number>();
  linhas.forEach((l) => l.produtoId && totais.set(l.produtoId, (totais.get(l.produtoId) ?? 0) + (l.quantidade || 0)));

  const subtotal = [...totais].reduce((s, [id, q]) => s + (produto(id)?.precos[canal] ?? 0) * q, 0);
  const descontoValor = Math.round(subtotal * desconto) / 100;
  const semPreco = [...totais.keys()].filter((id) => produto(id)?.precos[canal] === undefined);
  const semEstoque = [...totais].filter(([id, q]) => q > (produto(id)?.disponivel ?? 0));
  const abaixoMinimo = [...totais].filter(([id, q]) => q < (produto(id)?.quantidade_minima ?? 1));
  const faixa = faixaDesconto(desconto, regras);
  const descontoInvalido = !(desconto >= 0 && desconto <= 100);

  function atualizar(chave: number, campo: Partial<Linha>) {
    setLinhas((ls) => ls.map((l) => (l.chave === chave ? { ...l, ...campo } : l)));
  }

  return (
    <AcaoForm action={criarProposta} className="card">
      <label className="field">
        Negociação
        <select name="negociacao_id" value={negociacaoId} onChange={(e) => setNegociacaoId(e.target.value)}>
          {negociacoes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.empresas.nome} — {n.titulo} ({ROTULO_CANAL[n.empresas.canal]})
            </option>
          ))}
        </select>
      </label>

      <div className="field" style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
        Produtos
      </div>
      {linhas.map((l) => {
        const p = produto(l.produtoId);
        return (
          <div key={l.chave}>
            <div className="line-item-row">
              <select
                name="produto_id"
                value={l.produtoId}
                aria-label="Produto"
                onChange={(e) =>
                  atualizar(l.chave, {
                    produtoId: e.target.value,
                    quantidade: Math.max(l.quantidade, produto(e.target.value)?.quantidade_minima ?? 1),
                  })
                }
              >
                {produtos.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.nome}
                  </option>
                ))}
              </select>
              <input
                type="number"
                name="quantidade"
                min={1}
                step={1}
                value={l.quantidade || ""}
                aria-label="Quantidade"
                onChange={(e) => atualizar(l.chave, { quantidade: Math.floor(Number(e.target.value)) })}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                aria-label="Remover"
                onClick={() => setLinhas((ls) => ls.filter((x) => x.chave !== l.chave))}
              >
                ✕
              </button>
            </div>
            {p && (
              <div className="muted pequeno" style={{ margin: "-4px 0 8px" }}>
                {p.precos[canal] !== undefined ? `${fmtMoeda(p.precos[canal])} / un.` : "Sem preço para este canal"} ·
                disponível: {p.disponivel} · mínimo: {p.quantidade_minima}
              </div>
            )}
          </div>
        );
      })}
      <button
        type="button"
        className="btn btn-sm"
        disabled={!produtos.length}
        onClick={() =>
          setLinhas((ls) => [
            ...ls,
            { chave: Date.now(), produtoId: produtos[0].id, quantidade: produtos[0].quantidade_minima },
          ])
        }
      >
        + Adicionar produto
      </button>

      <div className="form-grid" style={{ marginTop: 14 }}>
        <label className="field">
          Desconto solicitado (%)
          <input
            type="number"
            name="desconto_pct"
            min={0}
            max={100}
            step={0.5}
            value={Number.isNaN(desconto) ? "" : desconto}
            onChange={(e) => setDesconto(Number(e.target.value))}
          />
        </label>
        <label className="field">
          Observação
          <input type="text" name="observacao" placeholder="Prazo, frete, condição de pagamento…" />
        </label>
      </div>

      <hr className="sep" />
      <div className="stat-inline">
        <div>
          Tabela de preço<b>{ROTULO_CANAL[canal]}</b>
        </div>
        <div>
          Subtotal<b>{fmtMoeda(subtotal)}</b>
        </div>
        <div>
          Desconto<b>{fmtMoeda(descontoValor)}</b>
        </div>
        <div>
          Total<b>{fmtMoeda(subtotal - descontoValor)}</b>
        </div>
      </div>
      {semPreco.length > 0 && (
        <div className="alert alert-critical">
          Sem preço cadastrado para {ROTULO_CANAL[canal]}: {semPreco.map((id) => produto(id)?.nome).join(", ")}.
        </div>
      )}
      {abaixoMinimo.length > 0 && (
        <div className="alert alert-critical">
          Abaixo do pedido mínimo:{" "}
          {abaixoMinimo.map(([id]) => `${produto(id)?.nome} (mín. ${produto(id)?.quantidade_minima})`).join(", ")}.
        </div>
      )}
      {semEstoque.length > 0 ? (
        <div className="alert alert-critical">
          Estoque insuficiente:{" "}
          {semEstoque.map(([id, q]) => `${produto(id)?.nome} (faltam ${q - (produto(id)?.disponivel ?? 0)})`).join(", ")}
          . A proposta fica em rascunho até haver estoque.
        </div>
      ) : (
        totais.size > 0 && <div className="alert alert-good">Estoque disponível para todos os itens.</div>
      )}
      {descontoInvalido ? (
        <div className="alert alert-critical">O desconto precisa estar entre 0% e 100%.</div>
      ) : faixa === "automatico" ? (
        <div className="alert alert-good">Desconto até {regras.limite_automatico}%: aprovação automática.</div>
      ) : faixa === "gestor" ? (
        <div className="alert alert-warning">
          Desconto entre {regras.limite_automatico}% e {regras.limite_gestor}%: vai para aprovação da diretoria.
        </div>
      ) : (
        <div className="alert alert-critical">
          Desconto acima de {regras.limite_gestor}%: a proposta fica bloqueada.
        </div>
      )}

      <BotaoEnviar>Salvar proposta</BotaoEnviar>
    </AcaoForm>
  );
}
