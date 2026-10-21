import Link from "next/link";
import { notFound } from "next/navigation";
import { AcaoForm, BotaoEnviar } from "@/components/acao-form";
import { CanalBadge, EstagioBadge, StatusBadge } from "@/components/badges";
import {
  ESTAGIOS,
  ROTULO_ESTAGIO,
  ROTULO_INTERACAO,
  TIPOS_INTERACAO_MANUAL,
  type Estagio,
  type StatusProposta,
  type TipoInteracao,
} from "@/lib/dominio";
import { fmtData, fmtDataHora, fmtMoeda } from "@/lib/formato";
import { exigirUsuario } from "@/lib/sessao";
import { atualizarEmpresa, criarContato, criarNegociacao, moverEstagioForm, registrarInteracao } from "../../actions";
import { CamposEmpresa, type DadosEmpresa } from "../campos-empresa";

type Empresa = DadosEmpresa & {
  id: string;
  created_at: string;
  responsavel_id: string | null;
  responsavel: { nome: string } | null;
  contatos: { id: string; nome: string; telefone: string | null; email: string | null }[];
  negociacoes: {
    id: string;
    titulo: string;
    estagio: Estagio;
    valor_estimado: number;
    created_at: string;
    propostas: { id: string; numero: number; status: StatusProposta; total: number; created_at: string }[];
  }[];
};

type Interacao = {
  id: string;
  tipo: TipoInteracao;
  nota: string;
  ocorrida_em: string;
  autor: { nome: string } | null;
};

function linkWhatsApp(telefone: string) {
  const digitos = telefone.replace(/\D/g, "");
  return `https://wa.me/${digitos.length <= 11 ? `55${digitos}` : digitos}`;
}

export default async function DetalheEmpresa(props: PageProps<"/clientes/[id]">) {
  const { id } = await props.params;
  const { supabase } = await exigirUsuario();

  const [{ data: empresa }, { data: interacoes }] = await Promise.all([
    supabase
      .from("empresas")
      .select(
        `id, nome, canal, cnpj, cidade, uf, compartilhada, created_at, responsavel_id,
         responsavel:perfis!empresas_responsavel_id_fkey(nome),
         contatos(id, nome, telefone, email),
         negociacoes(id, titulo, estagio, valor_estimado, created_at,
           propostas(id, numero, status, total, created_at))`,
      )
      .eq("id", id)
      .maybeSingle<Empresa>(),
    supabase
      .from("interacoes")
      .select("id, tipo, nota, ocorrida_em, autor:perfis!interacoes_autor_id_fkey(nome)")
      .eq("empresa_id", id)
      .order("ocorrida_em", { ascending: false })
      .limit(100)
      .returns<Interacao[]>(),
  ]);

  if (!empresa) notFound();

  const negociacoes = [...empresa.negociacoes].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <>
      <p className="pequeno">
        <Link href="/clientes">← Clientes</Link>
      </p>
      <h1 className="view-title">{empresa.nome}</h1>
      <div className="pc-actions" style={{ marginTop: 0, marginBottom: 18 }}>
        <CanalBadge canal={empresa.canal} />
        <span className="muted pequeno">
          Responsável: {empresa.responsavel?.nome ?? "—"} · cliente desde {fmtData(empresa.created_at)}
          {empresa.compartilhada ? " · compartilhada com a equipe" : " · carteira privada"}
        </span>
      </div>

      <div className="grid-2">
        <div>
          <div className="card">
            <h2>Negociações</h2>
            <div className="card-sub">Cada pedido ou recompra é uma negociação com o seu estágio no funil.</div>
            {negociacoes.length ? (
              negociacoes.map((n) => (
                <div key={n.id} className="propcard">
                  <div className="pc-top">
                    <div>
                      <div className="pc-title">
                        {n.titulo} <EstagioBadge estagio={n.estagio} />
                      </div>
                      <div className="pc-sub">Aberta em {fmtData(n.created_at)}</div>
                    </div>
                    <div className="pc-total">{fmtMoeda(n.valor_estimado)}</div>
                  </div>
                  {n.propostas.length > 0 && (
                    <ul className="lista-simples" style={{ marginTop: 8 }}>
                      {[...n.propostas]
                        .sort((a, b) => b.numero - a.numero)
                        .map((p) => (
                          <li key={p.id}>
                            <span>
                              Proposta #{p.numero} · {fmtData(p.created_at)} · {fmtMoeda(p.total)}
                            </span>
                            <StatusBadge status={p.status} />
                          </li>
                        ))}
                    </ul>
                  )}
                  <div className="pc-actions">
                    <AcaoForm action={moverEstagioForm} className="form-inline">
                      <input type="hidden" name="negociacao_id" value={n.id} />
                      <select name="estagio" defaultValue={n.estagio} aria-label="Estágio">
                        {ESTAGIOS.map((e) => (
                          <option key={e} value={e}>
                            {ROTULO_ESTAGIO[e]}
                          </option>
                        ))}
                      </select>
                      <BotaoEnviar className="btn btn-sm">Mover</BotaoEnviar>
                    </AcaoForm>
                    <Link className="btn btn-sm btn-primary" href={`/propostas/nova?negociacao=${n.id}`}>
                      + Proposta
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">Nenhuma negociação.</div>
            )}
            <hr className="sep" />
            <AcaoForm action={criarNegociacao} className="form-inline">
              <input type="hidden" name="empresa_id" value={empresa.id} />
              <label className="field">
                Nova negociação
                <input type="text" name="titulo" placeholder="Ex.: Reposição de novembro" required />
              </label>
              <label className="field">
                Valor estimado (R$)
                <input type="number" name="valor_estimado" min="0" step="0.01" />
              </label>
              <BotaoEnviar className="btn">Criar</BotaoEnviar>
            </AcaoForm>
          </div>

          <div className="card">
            <h2>Histórico de interações</h2>
            <AcaoForm action={registrarInteracao}>
              <input type="hidden" name="empresa_id" value={empresa.id} />
              <div className="form-grid">
                <label className="field">
                  Tipo
                  <select name="tipo">
                    {TIPOS_INTERACAO_MANUAL.map((t) => (
                      <option key={t} value={t}>
                        {ROTULO_INTERACAO[t]}
                      </option>
                    ))}
                  </select>
                </label>
                {negociacoes.length > 0 && (
                  <label className="field">
                    Negociação
                    <select name="negociacao_id">
                      <option value="">—</option>
                      {negociacoes.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.titulo}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              <label className="field">
                Anotação
                <textarea name="nota" rows={2} placeholder="O que foi conversado?" required />
              </label>
              <BotaoEnviar className="btn btn-primary btn-sm">Registrar interação</BotaoEnviar>
            </AcaoForm>
            <hr className="sep" />
            {interacoes?.length ? (
              <div className="timeline">
                {interacoes.map((i) => (
                  <div className="timeline-item" key={i.id}>
                    <div className="ti-head">
                      {ROTULO_INTERACAO[i.tipo]}
                      <span className="ti-date">
                        {fmtDataHora(i.ocorrida_em)}
                        {i.autor && ` · ${i.autor.nome}`}
                      </span>
                    </div>
                    <div className="ti-note">{i.nota}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">Sem interações.</div>
            )}
          </div>
        </div>

        <div>
          <div className="card">
            <h2>Contatos</h2>
            {empresa.contatos.length ? (
              <ul className="lista-simples">
                {empresa.contatos.map((c) => (
                  <li key={c.id}>
                    <div>
                      <b>{c.nome}</b>
                      <div className="muted pequeno">{[c.telefone, c.email].filter(Boolean).join(" · ")}</div>
                    </div>
                    {c.telefone && (
                      <a className="btn btn-sm" href={linkWhatsApp(c.telefone)} target="_blank" rel="noreferrer">
                        WhatsApp
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">Nenhum contato.</div>
            )}
            <hr className="sep" />
            <AcaoForm action={criarContato}>
              <input type="hidden" name="empresa_id" value={empresa.id} />
              <label className="field">
                Nome
                <input type="text" name="nome" required />
              </label>
              <label className="field">
                Telefone / WhatsApp
                <input type="tel" name="telefone" />
              </label>
              <label className="field">
                E-mail
                <input type="email" name="email" />
              </label>
              <BotaoEnviar className="btn btn-sm">Adicionar contato</BotaoEnviar>
            </AcaoForm>
          </div>

          <div className="card">
            <h2>Dados da empresa</h2>
            <AcaoForm action={atualizarEmpresa}>
              <input type="hidden" name="empresa_id" value={empresa.id} />
              <CamposEmpresa empresa={empresa} />
              <BotaoEnviar className="btn btn-sm">Salvar</BotaoEnviar>
            </AcaoForm>
          </div>
        </div>
      </div>
    </>
  );
}
