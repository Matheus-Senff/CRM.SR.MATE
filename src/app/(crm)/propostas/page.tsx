import Link from "next/link";
import { AcaoForm, BotaoEnviar } from "@/components/acao-form";
import { isStatusProposta, ROTULO_STATUS, STATUS_PROPOSTA } from "@/lib/dominio";
import { exigirUsuario } from "@/lib/sessao";
import { enviarProposta, reavaliarProposta, reenviarPedidoBling, registrarResultado } from "../actions";
import { CartaoProposta, SELECT_PROPOSTA, type PropostaCompleta } from "./cartao-proposta";

export default async function Propostas(props: PageProps<"/propostas">) {
  const { supabase } = await exigirUsuario();
  const params = await props.searchParams;
  const status = isStatusProposta(params.status) ? params.status : "";

  let consulta = supabase.from("propostas").select(SELECT_PROPOSTA).order("numero", { ascending: false }).limit(100);
  if (status) consulta = consulta.eq("status", status);
  const { data: propostas, error } = await consulta.returns<PropostaCompleta[]>();

  return (
    <>
      <h1 className="view-title">Propostas</h1>
      <div className="toolbar">
        <form className="form-inline">
          <select name="status" defaultValue={status} aria-label="Status">
            <option value="">Todos os status</option>
            {STATUS_PROPOSTA.map((s) => (
              <option key={s} value={s}>
                {ROTULO_STATUS[s]}
              </option>
            ))}
          </select>
          <button className="btn">Filtrar</button>
        </form>
        <Link className="btn btn-primary" href="/propostas/nova">
          Nova proposta
        </Link>
      </div>

      {error && <div className="alert alert-critical">{error.message}</div>}

      {propostas?.length ? (
        propostas.map((p) => (
          <CartaoProposta key={p.id} proposta={p}>
            {p.status === "rascunho" && (
              <div className="alert alert-critical">
                Estoque insuficiente quando a proposta foi criada. Depois da reposição, reavalie: ela passa pelas
                mesmas regras de desconto.
              </div>
            )}
            {p.status === "aguardando_aprovacao" && (
              <div className="alert alert-warning">
                Aguardando a diretoria. <Link href="/aprovacoes">Ver fila de aprovações →</Link>
              </div>
            )}
            {p.status === "bloqueada" && (
              <div className="alert alert-critical">
                Desconto acima do limite. Crie uma nova proposta com desconto menor ou negocie com a diretoria.
              </div>
            )}
            {p.status === "aceita" && p.bling_pedido_id && (
              <div className="alert alert-good">Pedido {p.bling_pedido_id} criado no Bling.</div>
            )}
            {p.status === "aceita" && !p.bling_pedido_id && p.bling_erro && (
              <div className="alert alert-critical">Pedido não criado no Bling: {p.bling_erro}</div>
            )}

            <div className="pc-actions">
              {p.status === "rascunho" && (
                <AcaoForm action={reavaliarProposta}>
                  <input type="hidden" name="proposta_id" value={p.id} />
                  <BotaoEnviar className="btn btn-sm">Reavaliar estoque</BotaoEnviar>
                </AcaoForm>
              )}
              {p.status === "aprovada" && (
                <AcaoForm action={enviarProposta}>
                  <input type="hidden" name="proposta_id" value={p.id} />
                  <BotaoEnviar className="btn btn-sm btn-primary">Marcar como enviada ao cliente</BotaoEnviar>
                </AcaoForm>
              )}
              {p.status === "enviada" && (
                <AcaoForm action={registrarResultado} className="form-inline">
                  <input type="hidden" name="proposta_id" value={p.id} />
                  <input type="text" name="observacao" placeholder="Observação / motivo (opcional)" />
                  <BotaoEnviar className="btn btn-sm btn-primary" name="resultado" value="aceita">
                    Cliente aceitou
                  </BotaoEnviar>
                  <BotaoEnviar className="btn btn-sm" name="resultado" value="perdida">
                    Cliente recusou
                  </BotaoEnviar>
                </AcaoForm>
              )}
              {p.status === "aceita" && !p.bling_pedido_id && (
                <AcaoForm action={reenviarPedidoBling}>
                  <input type="hidden" name="proposta_id" value={p.id} />
                  <BotaoEnviar className="btn btn-sm">Enviar pedido ao Bling</BotaoEnviar>
                </AcaoForm>
              )}
            </div>
          </CartaoProposta>
        ))
      ) : (
        <div className="card empty-state">Nenhuma proposta{status && " com esse status"}.</div>
      )}
    </>
  );
}
