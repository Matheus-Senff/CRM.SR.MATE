import Link from "next/link";
import { ESTAGIOS_ABERTOS, type Canal, type RegrasDesconto } from "@/lib/dominio";
import { exigirUsuario } from "@/lib/sessao";
import { FormProposta, type NegociacaoOpcao, type ProdutoOpcao } from "./form-proposta";

type ProdutoLinha = {
  id: string;
  nome: string;
  quantidade_minima: number;
  precos: { canal: Canal; preco: number }[];
};

export default async function NovaProposta(props: PageProps<"/propostas/nova">) {
  const { supabase, perfil } = await exigirUsuario();
  const params = await props.searchParams;
  const negociacaoInicial = typeof params.negociacao === "string" ? params.negociacao : "";

  const [{ data: negociacoes }, { data: produtos }, { data: disponibilidade }, { data: regras }] = await Promise.all([
    supabase
      .from("negociacoes")
      .select("id, titulo, empresas!inner(nome, canal)")
      .in("estagio", ESTAGIOS_ABERTOS)
      .order("atualizado_em", { ascending: false })
      .returns<NegociacaoOpcao[]>(),
    supabase
      .from("produtos")
      .select("id, nome, quantidade_minima, precos(canal, preco)")
      .eq("ativo", true)
      .order("nome")
      .returns<ProdutoLinha[]>(),
    supabase.rpc("disponibilidade_produtos"),
    supabase.from("regras_desconto").select("limite_automatico, limite_gestor").eq("id", 1).single<RegrasDesconto>(),
  ]);

  const saldos = (disponibilidade ?? []) as { produto_id: string; disponivel: number }[];
  const disponivel = new Map(saldos.map((d) => [d.produto_id, d.disponivel]));
  const opcoes: ProdutoOpcao[] = (produtos ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    quantidade_minima: p.quantidade_minima,
    disponivel: disponivel.get(p.id) ?? 0,
    precos: Object.fromEntries(p.precos.map((x) => [x.canal, Number(x.preco)])),
  }));

  return (
    <>
      <h1 className="view-title">Nova proposta</h1>
      {!negociacoes?.length ? (
        <div className="card empty-state">
          <p>Nenhuma negociação em aberto.</p>
          <Link className="btn btn-primary" href="/clientes">
            Ir para clientes
          </Link>
        </div>
      ) : !opcoes.some((p) => Object.keys(p.precos).length) ? (
        <div className="card empty-state">
          <p>Nenhum produto com preço cadastrado.</p>
          {perfil.papel === "admin" && (
            <Link className="btn btn-primary" href="/configuracoes">
              Cadastrar preços
            </Link>
          )}
        </div>
      ) : (
        <FormProposta
          negociacoes={negociacoes}
          produtos={opcoes}
          regras={{
            limite_automatico: Number(regras?.limite_automatico ?? 5),
            limite_gestor: Number(regras?.limite_gestor ?? 15),
          }}
          negociacaoInicial={negociacaoInicial}
        />
      )}
    </>
  );
}
