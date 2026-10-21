import { AcaoForm, BotaoEnviar } from "@/components/acao-form";
import type { RegrasDesconto } from "@/lib/dominio";
import { exigirUsuario } from "@/lib/sessao";
import { decidirDesconto } from "../actions";
import { CartaoProposta, SELECT_PROPOSTA, type PropostaCompleta } from "../propostas/cartao-proposta";

export default async function Aprovacoes() {
  const { supabase, perfil } = await exigirUsuario();
  const [{ data: pendentes }, { data: regras }] = await Promise.all([
    supabase
      .from("propostas")
      .select(SELECT_PROPOSTA)
      .eq("status", "aguardando_aprovacao")
      .order("created_at")
      .returns<PropostaCompleta[]>(),
    supabase.from("regras_desconto").select("limite_automatico, limite_gestor").eq("id", 1).single<RegrasDesconto>(),
  ]);
  const podeDecidir = perfil.papel === "admin";

  return (
    <>
      <h1 className="view-title">Aprovações de desconto</h1>
      <div className="faixas">
        <span className="faixa faixa-good">Automático até {Number(regras?.limite_automatico ?? 5)}%</span>
        <span className="faixa faixa-warning">Diretoria até {Number(regras?.limite_gestor ?? 15)}%</span>
      </div>
      {pendentes?.length ? (
        pendentes.map((p) => (
          <CartaoProposta key={p.id} proposta={p}>
            {podeDecidir && (
              <AcaoForm action={decidirDesconto} className="pc-actions">
                <input type="hidden" name="proposta_id" value={p.id} />
                <input type="text" name="observacao" placeholder="Comentário (opcional)" />
                <BotaoEnviar className="btn btn-sm btn-primary" name="decisao" value="aprovar">
                  Aprovar desconto
                </BotaoEnviar>
                <BotaoEnviar className="btn btn-sm btn-danger" name="decisao" value="recusar">
                  Recusar
                </BotaoEnviar>
              </AcaoForm>
            )}
          </CartaoProposta>
        ))
      ) : (
        <div className="card empty-state">Nenhuma proposta aguardando aprovação.</div>
      )}
    </>
  );
}
