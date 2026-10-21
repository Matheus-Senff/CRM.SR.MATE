import Link from "next/link";
import { CanalBadge, EstagioBadge } from "@/components/badges";
import { CANAIS, ESTAGIOS_ABERTOS, ROTULO_CANAL, isCanal, type Canal, type Estagio } from "@/lib/dominio";
import { fmtData, fmtMoeda } from "@/lib/formato";
import { exigirUsuario } from "@/lib/sessao";

type Empresa = {
  id: string;
  nome: string;
  canal: Canal;
  cidade: string | null;
  uf: string | null;
  compartilhada: boolean;
  created_at: string;
  responsavel: { nome: string } | null;
  contatos: { nome: string; telefone: string | null }[];
  negociacoes: { estagio: Estagio; valor_estimado: number; atualizado_em: string }[];
};

export default async function Clientes(props: PageProps<"/clientes">) {
  const { supabase, user } = await exigirUsuario();
  const params = await props.searchParams;
  const busca = typeof params.busca === "string" ? params.busca.trim() : "";
  const canal = isCanal(params.canal) ? params.canal : "";
  const carteira = params.carteira === "minha" ? "minha" : "";

  let consulta = supabase
    .from("empresas")
    .select(
      `id, nome, canal, cidade, uf, compartilhada, created_at,
       responsavel:perfis!empresas_responsavel_id_fkey(nome),
       contatos(nome, telefone),
       negociacoes(estagio, valor_estimado, atualizado_em)`,
    )
    .order("nome");
  if (busca) consulta = consulta.ilike("nome", `%${busca.replace(/[%_]/g, "")}%`);
  if (canal) consulta = consulta.eq("canal", canal);
  if (carteira) consulta = consulta.eq("responsavel_id", user.id);
  const { data: empresas, error } = await consulta.returns<Empresa[]>();

  return (
    <>
      <h1 className="view-title">Clientes</h1>
      <p className="view-desc">Sua carteira e as empresas que outros gestores compartilharam.</p>

      <div className="toolbar">
        <form className="form-inline">
          <input type="search" name="busca" placeholder="Buscar empresa…" defaultValue={busca} />
          <select name="canal" defaultValue={canal}>
            <option value="">Todos os canais</option>
            {CANAIS.map((c) => (
              <option key={c} value={c}>
                {ROTULO_CANAL[c]}
              </option>
            ))}
          </select>
          <select name="carteira" defaultValue={carteira}>
            <option value="">Todas as visíveis</option>
            <option value="minha">Só a minha carteira</option>
          </select>
          <button className="btn">Filtrar</button>
        </form>
        <Link className="btn btn-primary" href="/clientes/nova">
          + Nova empresa
        </Link>
      </div>

      {error && <div className="alert alert-critical">{error.message}</div>}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Canal</th>
              <th>Negociação atual</th>
              <th>Contato</th>
              <th>Responsável</th>
              <th className="num">Em negociação</th>
              <th>Última atualização</th>
            </tr>
          </thead>
          <tbody>
            {empresas?.length ? (
              empresas.map((e) => {
                const abertas = e.negociacoes.filter((n) => ESTAGIOS_ABERTOS.includes(n.estagio));
                const recente = [...e.negociacoes].sort((a, b) => b.atualizado_em.localeCompare(a.atualizado_em))[0];
                return (
                  <tr key={e.id}>
                    <td>
                      <Link href={`/clientes/${e.id}`}>{e.nome}</Link>
                      <div className="muted pequeno">
                        {[e.cidade, e.uf].filter(Boolean).join(" / ")}
                        {e.compartilhada && " · compartilhada"}
                      </div>
                    </td>
                    <td>
                      <CanalBadge canal={e.canal} />
                    </td>
                    <td>{recente ? <EstagioBadge estagio={recente.estagio} /> : "—"}</td>
                    <td>
                      {e.contatos[0]?.nome ?? "—"}
                      <div className="muted pequeno">{e.contatos[0]?.telefone}</div>
                    </td>
                    <td>{e.responsavel?.nome ?? "—"}</td>
                    <td className="num">{fmtMoeda(abertas.reduce((s, n) => s + Number(n.valor_estimado), 0))}</td>
                    <td>{fmtData(recente?.atualizado_em ?? e.created_at)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">Nenhuma empresa encontrada.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
