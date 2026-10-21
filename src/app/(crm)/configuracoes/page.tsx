import { AcaoForm, BotaoEnviar } from "@/components/acao-form";
import { statusConexao } from "@/lib/bling";
import { CANAIS, ROTULO_CANAL, type Canal, type RegrasDesconto } from "@/lib/dominio";
import { fmtDataHora } from "@/lib/formato";
import { exigirAdmin } from "@/lib/sessao";
import { salvarProduto, salvarRegrasDesconto, sincronizarBling } from "../actions";

type Produto = {
  id: string;
  sku: string | null;
  nome: string;
  estoque: number;
  quantidade_minima: number;
  ativo: boolean;
  bling_id: number | null;
  sincronizado_em: string | null;
  precos: { canal: Canal; preco: number }[];
};

export default async function Configuracoes(props: PageProps<"/configuracoes">) {
  const { supabase } = await exigirAdmin();
  const params = await props.searchParams;

  const [{ data: regras }, { data: produtos }, conexao] = await Promise.all([
    supabase.from("regras_desconto").select("limite_automatico, limite_gestor").eq("id", 1).single<RegrasDesconto>(),
    supabase
      .from("produtos")
      .select("id, sku, nome, estoque, quantidade_minima, ativo, bling_id, sincronizado_em, precos(canal, preco)")
      .order("ativo", { ascending: false })
      .order("nome")
      .returns<Produto[]>(),
    statusConexao().catch(() => null),
  ]);

  return (
    <>
      <h1 className="view-title">Configurações</h1>
      <p className="view-desc">Faixas de desconto, preços por canal, pedido mínimo e integração com o Bling.</p>

      {params.bling === "ok" && <div className="alert alert-good">Bling conectado.</div>}
      {typeof params.bling_erro === "string" && (
        <div className="alert alert-critical">Falha ao conectar o Bling: {params.bling_erro}</div>
      )}

      <div className="grid-2b">
        <div className="card">
          <h2>Faixas de desconto</h2>
          <div className="card-sub">Valem para as próximas propostas.</div>
          <AcaoForm action={salvarRegrasDesconto}>
            <div className="form-grid">
              <label className="field">
                Aprovação automática até (%)
                <input type="number" name="limite_automatico" min={0} max={100} step={0.5} defaultValue={Number(regras?.limite_automatico ?? 5)} />
              </label>
              <label className="field">
                Diretoria aprova até (%)
                <input type="number" name="limite_gestor" min={0} max={100} step={0.5} defaultValue={Number(regras?.limite_gestor ?? 15)} />
              </label>
            </div>
            <BotaoEnviar className="btn btn-sm btn-primary">Salvar faixas</BotaoEnviar>
          </AcaoForm>
        </div>

        <div className="card">
          <h2>Bling</h2>
          <div className="card-sub">
            Produtos e estoque vêm do Bling; propostas aceitas viram pedidos de venda lá, onde são calculados os impostos
            e emitida a NF-e.
          </div>
          <p className="pequeno">
            {conexao ? `Conectado · token renovado em ${fmtDataHora(conexao.atualizado_em)}` : "Não conectado."}
          </p>
          <div className="pc-actions">
            <a className="btn btn-sm" href="/api/bling/conectar">
              {conexao ? "Reconectar" : "Conectar ao Bling"}
            </a>
            {conexao && (
              <AcaoForm action={sincronizarBling}>
                <BotaoEnviar className="btn btn-sm btn-primary">Sincronizar produtos e estoque</BotaoEnviar>
              </AcaoForm>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Produtos, preços por canal e pedido mínimo</h2>
        <div className="card-sub">Preço vazio = produto não pode ser vendido naquele canal.</div>
        {produtos?.length ? (
          produtos.map((p) => {
            const preco = (c: Canal) => p.precos.find((x) => x.canal === c)?.preco;
            return (
              <AcaoForm key={p.id} action={salvarProduto} className="propcard">
                <input type="hidden" name="produto_id" value={p.id} />
                <div className="pc-title">
                  {p.nome} {!p.ativo && <span className="muted pequeno">(inativo)</span>}
                </div>
                <div className="pc-sub">
                  {p.sku ?? "sem código"} · estoque {p.estoque}
                  {p.bling_id ? ` · Bling ${p.bling_id} · sincronizado ${fmtDataHora(p.sincronizado_em)}` : " · não vinculado ao Bling"}
                </div>
                <div className="form-inline" style={{ marginTop: 10 }}>
                  {CANAIS.map((c) => (
                    <label className="field" key={c}>
                      {ROTULO_CANAL[c]} (R$)
                      <input type="number" name={`preco_${c}`} min={0} step={0.01} defaultValue={preco(c) ?? ""} style={{ width: 120 }} />
                    </label>
                  ))}
                  <label className="field">
                    Pedido mínimo (un.)
                    <input type="number" name="quantidade_minima" min={1} step={1} defaultValue={p.quantidade_minima} style={{ width: 120 }} />
                  </label>
                  <BotaoEnviar className="btn btn-sm">Salvar</BotaoEnviar>
                </div>
              </AcaoForm>
            );
          })
        ) : (
          <div className="empty-state">Nenhum produto. Conecte o Bling e sincronize.</div>
        )}
      </div>
    </>
  );
}
