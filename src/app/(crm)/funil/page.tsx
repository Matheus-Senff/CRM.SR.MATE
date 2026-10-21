import { exigirUsuario } from "@/lib/sessao";
import { Kanban, type CartaoNegociacao } from "./kanban";

export default async function Funil() {
  const { supabase } = await exigirUsuario();
  const { data } = await supabase
    .from("negociacoes")
    .select("id, titulo, estagio, valor_estimado, empresas!inner(id, nome, canal)")
    .order("atualizado_em", { ascending: false })
    .returns<CartaoNegociacao[]>();

  return (
    <>
      <h1 className="view-title">Funil de vendas</h1>
      <p className="view-desc">
        Arraste os cartões entre as colunas ou troque o estágio no seletor do cartão (funciona também no celular).
      </p>
      <Kanban negociacoes={data ?? []} />
    </>
  );
}
