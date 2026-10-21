import Link from "next/link";
import { corEstagio } from "@/components/badges";
import {
  CANAIS,
  ESTAGIOS_ABERTOS,
  ROTULO_CANAL,
  ROTULO_ESTAGIO,
  ROTULO_INTERACAO,
  type Canal,
  type Estagio,
  type TipoInteracao,
} from "@/lib/dominio";
import { fmtData, fmtMoeda } from "@/lib/formato";
import { exigirUsuario } from "@/lib/sessao";

type Negociacao = { estagio: Estagio; valor_estimado: number; empresas: { canal: Canal } };
type Interacao = { id: string; tipo: TipoInteracao; nota: string; ocorrida_em: string; empresas: { id: string; nome: string } };
type Pendente = { id: string; numero: number; desconto_pct: number; total: number; negociacoes: { empresas: { nome: string } } };

export default async function VisaoGeral() {
  const { supabase } = await exigirUsuario();

  const [{ data: negociacoes }, { count: propostasAbertas }, { data: interacoes }, { data: pendentes }] = await Promise.all([
    supabase.from("negociacoes").select("estagio, valor_estimado, empresas!inner(canal)").returns<Negociacao[]>(),
    supabase
      .from("propostas")
      .select("id", { count: "exact", head: true })
      .in("status", ["rascunho", "aguardando_aprovacao", "aprovada", "enviada"]),
    supabase
      .from("interacoes")
      .select("id, tipo, nota, ocorrida_em, empresas!inner(id, nome)")
      .order("ocorrida_em", { ascending: false })
      .limit(6)
      .returns<Interacao[]>(),
    supabase
      .from("propostas")
      .select("id, numero, desconto_pct, total, negociacoes!inner(empresas!inner(nome))")
      .eq("status", "aguardando_aprovacao")
      .order("created_at")
      .limit(5)
      .returns<Pendente[]>(),
  ]);

  const lista = negociacoes ?? [];
  const abertas = lista.filter((n) => ESTAGIOS_ABERTOS.includes(n.estagio));
  const ganhos = lista.filter((n) => n.estagio === "ganho").length;
  const perdidos = lista.filter((n) => n.estagio === "perdido").length;
  const pipeline = abertas.reduce((s, n) => s + Number(n.valor_estimado), 0);
  const conversao = ganhos + perdidos ? Math.round((ganhos / (ganhos + perdidos)) * 100) : 0;

  const porEstagio = ESTAGIOS_ABERTOS.map((e) => ({ e, n: lista.filter((n) => n.estagio === e).length }));
  porEstagio.push({ e: "ganho", n: ganhos });
  const maxEstagio = Math.max(1, ...porEstagio.map((x) => x.n));

  const porCanal = CANAIS.map((c) => ({
    c,
    v: abertas.filter((n) => n.empresas.canal === c).reduce((s, n) => s + Number(n.valor_estimado), 0),
  }));
  const maxCanal = Math.max(1, ...porCanal.map((x) => x.v));

  return (
    <>
      <h1 className="view-title">Visão geral</h1>
      <p className="view-desc">Negociações, propostas e atividades da sua carteira e das empresas compartilhadas.</p>

      <div className="kpi-row">
        <div className="kpi-tile">
          <div className="kpi-label">Negociações em aberto</div>
          <div className="kpi-value">{abertas.length}</div>
          <div className="kpi-note">em algum estágio do funil</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-label">Propostas em andamento</div>
          <div className="kpi-value">{propostasAbertas ?? 0}</div>
          <div className="kpi-note">rascunho, em aprovação, aprovada ou enviada</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-label">Valor em negociação</div>
          <div className="kpi-value">{fmtMoeda(pipeline)}</div>
          <div className="kpi-note">soma das negociações em aberto</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-label">Taxa de conversão</div>
          <div className="kpi-value">{conversao}%</div>
          <div className="kpi-note">
            {ganhos} ganhas / {perdidos} perdidas
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>Funil de vendas</h2>
          <div className="card-sub">Negociações em cada estágio</div>
          {porEstagio.map(({ e, n }) => (
            <div className="bar-row" key={e}>
              <div className="bar-label">{ROTULO_ESTAGIO[e]}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${n ? Math.max(2, (n / maxEstagio) * 100) : 0}%`, background: corEstagio(e) }} />
              </div>
              <div className="bar-value">{n}</div>
            </div>
          ))}
          <div className="kpi-note">Fechadas como perdidas: {perdidos} (fora da progressão acima).</div>
        </div>
        <div className="card">
          <h2>Valor em negociação por canal</h2>
          <div className="card-sub">Negociações em aberto</div>
          {porCanal.map(({ c, v }) => (
            <div className="bar-row" key={c}>
              <div className="bar-label">{ROTULO_CANAL[c]}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${v ? Math.max(2, (v / maxCanal) * 100) : 0}%`, background: `var(--canal-${c})` }} />
              </div>
              <div className="bar-value">{fmtMoeda(v)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2b">
        <div className="card">
          <h2>Atividade recente</h2>
          <div className="card-sub">Últimas interações registradas</div>
          {interacoes?.length ? (
            <ul className="lista-simples">
              {interacoes.map((i) => (
                <li key={i.id}>
                  <div>
                    <Link href={`/clientes/${i.empresas.id}`}>
                      <b>{i.empresas.nome}</b>
                    </Link>
                    <div className="muted">
                      {ROTULO_INTERACAO[i.tipo]} — {i.nota}
                    </div>
                  </div>
                  <div className="muted" style={{ whiteSpace: "nowrap" }}>
                    {fmtData(i.ocorrida_em)}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">Nenhuma interação ainda.</div>
          )}
        </div>
        <div className="card">
          <h2>Aprovações pendentes</h2>
          <div className="card-sub">Propostas aguardando decisão da diretoria</div>
          {pendentes?.length ? (
            <ul className="lista-simples">
              {pendentes.map((p) => (
                <li key={p.id}>
                  <div>
                    <b>{p.negociacoes.empresas.nome}</b>
                    <div className="muted">
                      Proposta #{p.numero} · desconto de {Number(p.desconto_pct)}% · {fmtMoeda(p.total)}
                    </div>
                  </div>
                  <Link className="btn btn-sm" href="/aprovacoes">
                    Ver
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">Nenhuma aprovação pendente.</div>
          )}
        </div>
      </div>
    </>
  );
}
