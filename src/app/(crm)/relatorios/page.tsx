import { EstagioBadge } from "@/components/badges";
import { CANAIS, ESTAGIOS, ESTAGIOS_ABERTOS, ROTULO_CANAL, type Canal, type Estagio } from "@/lib/dominio";
import { fmtMoeda, hojeISO } from "@/lib/formato";
import { exigirUsuario } from "@/lib/sessao";

type Negociacao = {
  estagio: Estagio;
  valor_estimado: number;
  fechado_em: string | null;
  empresas: { canal: Canal };
};

const PERIODOS = { 30: "Últimos 30 dias", 90: "Últimos 90 dias", 365: "Últimos 12 meses" } as const;

export default async function Relatorios(props: PageProps<"/relatorios">) {
  const { supabase } = await exigirUsuario();
  const params = await props.searchParams;
  const dias = Number(params.periodo) in PERIODOS ? (Number(params.periodo) as keyof typeof PERIODOS) : 90;

  const { data } = await supabase
    .from("negociacoes")
    .select("estagio, valor_estimado, fechado_em, empresas!inner(canal)")
    .returns<Negociacao[]>();
  const lista = data ?? [];

  const inicio = new Date(`${hojeISO()}T00:00:00-03:00`);
  inicio.setDate(inicio.getDate() - dias);
  const fechadasNoPeriodo = lista.filter((n) => n.fechado_em && new Date(n.fechado_em) >= inicio);
  const ganhas = fechadasNoPeriodo.filter((n) => n.estagio === "ganho");
  const perdidas = fechadasNoPeriodo.filter((n) => n.estagio === "perdido");
  const decididas = ganhas.length + perdidas.length;
  const taxa = decididas ? Math.round((ganhas.length / decididas) * 100) : 0;
  const ticket = ganhas.length ? ganhas.reduce((s, n) => s + Number(n.valor_estimado), 0) / ganhas.length : 0;

  const abertas = lista.filter((n) => ESTAGIOS_ABERTOS.includes(n.estagio));
  const porCanal = CANAIS.map((c) => ({
    c,
    aberto: abertas.filter((n) => n.empresas.canal === c).reduce((s, n) => s + Number(n.valor_estimado), 0),
    ganho: ganhas.filter((n) => n.empresas.canal === c).reduce((s, n) => s + Number(n.valor_estimado), 0),
  }));
  const maxCanal = Math.max(1, ...porCanal.map((x) => x.aberto));

  return (
    <>
      <h1 className="view-title">Relatórios</h1>
      <div className="toolbar">
        <div />
        <form className="form-inline">
          <select name="periodo" defaultValue={dias} aria-label="Período">
            {Object.entries(PERIODOS).map(([v, r]) => (
              <option key={v} value={v}>
                {r}
              </option>
            ))}
          </select>
          <button className="btn">Aplicar</button>
        </form>
      </div>

      <div className="grid-2b">
        <div className="card">
          <h2>Valor em negociação por canal</h2>
          {porCanal.map(({ c, aberto }) => (
            <div className="bar-row" key={c}>
              <div className="bar-label">{ROTULO_CANAL[c]}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${aberto ? Math.max(2, (aberto / maxCanal) * 100) : 0}%`, background: `var(--canal-${c})` }} />
              </div>
              <div className="bar-value">{fmtMoeda(aberto)}</div>
            </div>
          ))}
        </div>
        <div className="card">
          <h2>Conversão — {PERIODOS[dias].toLowerCase()}</h2>
          <div className="card-sub">Negociações fechadas no período</div>
          <div className="stat-inline" style={{ marginBottom: 12 }}>
            <div>
              Ganhas<b style={{ color: "var(--status-good)" }}>{ganhas.length}</b>
            </div>
            <div>
              Perdidas<b style={{ color: "var(--status-critical)" }}>{perdidas.length}</b>
            </div>
            <div>
              Taxa de conversão<b>{taxa}%</b>
            </div>
            <div>
              Ticket médio<b>{fmtMoeda(ticket)}</b>
            </div>
          </div>
          <div className="bar-row">
            <div className="bar-label">Ganhas × perdidas</div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${decididas ? (ganhas.length / decididas) * 100 : 0}%`, background: "var(--status-good)" }} />
              <div className="bar-fill" style={{ width: `${decididas ? (perdidas.length / decididas) * 100 : 0}%`, background: "var(--status-critical)" }} />
            </div>
            <div className="bar-value">{decididas}</div>
          </div>
        </div>
      </div>

      <div className="grid-2b">
        <div className="card">
          <h2>Por estágio</h2>
          <div className="table-wrap" style={{ border: "none" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Estágio</th>
                  <th className="num">Negociações</th>
                  <th className="num">Valor</th>
                </tr>
              </thead>
              <tbody>
                {ESTAGIOS.map((e) => {
                  const doEstagio = lista.filter((n) => n.estagio === e);
                  return (
                    <tr key={e}>
                      <td>
                        <EstagioBadge estagio={e} />
                      </td>
                      <td className="num">{doEstagio.length}</td>
                      <td className="num">{fmtMoeda(doEstagio.reduce((s, n) => s + Number(n.valor_estimado), 0))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h2>Vendas ganhas por canal</h2>
          <div className="card-sub">{PERIODOS[dias]}</div>
          <div className="table-wrap" style={{ border: "none" }}>
            <table className="data-table">
              <tbody>
                {porCanal.map(({ c, ganho }) => (
                  <tr key={c}>
                    <td>{ROTULO_CANAL[c]}</td>
                    <td className="num">{fmtMoeda(ganho)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
