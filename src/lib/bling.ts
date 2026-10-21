import "server-only";

import { hojeISO } from "@/lib/formato";
import { createAdminClient } from "@/lib/supabase/server";

// Integração com a API v3 do Bling: o catálogo e o estoque vêm do Bling, e
// cada proposta aceita vira um pedido de venda lá. Impostos e NF-e ficam por
// conta do Bling, a partir da natureza de operação configurada no pedido.

const API = "https://api.bling.com.br/Api/v3";
export const BLING_AUTHORIZE_URL = "https://www.bling.com.br/Api/v3/oauth/authorize";

function credenciais() {
  const id = process.env.BLING_CLIENT_ID;
  const segredo = process.env.BLING_CLIENT_SECRET;
  if (!id || !segredo) throw new Error("BLING_CLIENT_ID e BLING_CLIENT_SECRET não configurados.");
  return { id, segredo };
}

export function blingClientId() {
  return credenciais().id;
}

type RespostaToken = { access_token: string; refresh_token: string; expires_in: number };

async function pedirToken(corpo: Record<string, string>) {
  const { id, segredo } = credenciais();
  const resposta = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${segredo}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "1.0",
    },
    body: new URLSearchParams(corpo),
    cache: "no-store",
  });
  if (!resposta.ok) {
    throw new Error(`Bling recusou o token (${resposta.status}): ${await resposta.text()}`);
  }
  const token = (await resposta.json()) as RespostaToken;

  const { error } = await createAdminClient()
    .from("integracao_bling")
    .upsert({
      id: 1,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expira_em: new Date(Date.now() + token.expires_in * 1000).toISOString(),
      atualizado_em: new Date().toISOString(),
    });
  if (error) throw new Error(`Não foi possível salvar o token do Bling: ${error.message}`);

  return token.access_token;
}

export function trocarCodigoPorToken(codigo: string) {
  return pedirToken({ grant_type: "authorization_code", code: codigo });
}

async function tokenValido() {
  const { data } = await createAdminClient()
    .from("integracao_bling")
    .select("access_token, refresh_token, expira_em")
    .eq("id", 1)
    .maybeSingle<{ access_token: string; refresh_token: string; expira_em: string }>();
  if (!data) throw new Error("O Bling ainda não foi conectado. Conecte em Configurações.");

  // Renova com um minuto de folga.
  if (new Date(data.expira_em).getTime() - 60_000 > Date.now()) return data.access_token;
  return pedirToken({ grant_type: "refresh_token", refresh_token: data.refresh_token });
}

export async function statusConexao() {
  const { data } = await createAdminClient()
    .from("integracao_bling")
    .select("atualizado_em")
    .eq("id", 1)
    .maybeSingle<{ atualizado_em: string }>();
  return data;
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function bling<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const token = await tokenValido();
  for (let tentativa = 0; ; tentativa++) {
    const resposta = await fetch(`${API}${caminho}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...init.headers,
      },
      cache: "no-store",
    });
    // Limite do Bling: 3 requisições por segundo.
    if (resposta.status === 429 && tentativa < 3) {
      await esperar(1000 * (tentativa + 1));
      continue;
    }
    if (!resposta.ok) {
      throw new Error(`Bling ${init.method ?? "GET"} ${caminho} falhou (${resposta.status}): ${await resposta.text()}`);
    }
    return resposta.status === 204 ? (undefined as T) : ((await resposta.json()) as T);
  }
}

// ---------------------------------------------------------------------------
// Produtos e estoque
// ---------------------------------------------------------------------------

type ProdutoBling = { id: number; nome: string; codigo?: string; situacao?: string };
type SaldoBling = { produto: { id: number }; saldoVirtualTotal?: number; saldoFisicoTotal?: number };

export async function sincronizarProdutos() {
  const produtos: ProdutoBling[] = [];
  for (let pagina = 1; ; pagina++) {
    const { data } = await bling<{ data: ProdutoBling[] }>(`/produtos?pagina=${pagina}&limite=100&criterio=5`);
    produtos.push(...data);
    if (data.length < 100) break;
    await esperar(350);
  }

  const estoques = new Map<number, number>();
  for (let i = 0; i < produtos.length; i += 50) {
    const lote = produtos.slice(i, i + 50);
    const params = new URLSearchParams();
    lote.forEach((p) => params.append("idsProdutos[]", String(p.id)));
    const { data } = await bling<{ data: SaldoBling[] }>(`/estoques/saldos?${params}`);
    data.forEach((s) => estoques.set(s.produto.id, Math.max(0, Math.floor(s.saldoVirtualTotal ?? s.saldoFisicoTotal ?? 0))));
    await esperar(350);
  }

  const agora = new Date().toISOString();
  const linhas = produtos.map((p) => ({
    bling_id: p.id,
    nome: p.nome,
    sku: p.codigo || null,
    ativo: p.situacao !== "I",
    estoque: estoques.get(p.id) ?? 0,
    sincronizado_em: agora,
  }));

  if (linhas.length) {
    const { error } = await createAdminClient().from("produtos").upsert(linhas, { onConflict: "bling_id" });
    if (error) throw new Error(`Erro ao gravar produtos do Bling: ${error.message}`);
  }
  return linhas.length;
}

// ---------------------------------------------------------------------------
// Pedido de venda
// ---------------------------------------------------------------------------

type PropostaParaPedido = {
  id: string;
  numero: number;
  desconto_pct: number;
  observacao: string | null;
  bling_pedido_id: number | null;
  negociacoes: {
    empresas: {
      id: string;
      nome: string;
      cnpj: string | null;
      cidade: string | null;
      uf: string | null;
      bling_contato_id: number | null;
    };
  };
  proposta_itens: { quantidade: number; preco_unitario: number; produtos: { nome: string; bling_id: number | null } }[];
};

async function garantirContato(empresa: PropostaParaPedido["negociacoes"]["empresas"]) {
  if (empresa.bling_contato_id) return empresa.bling_contato_id;

  const documento = empresa.cnpj?.replace(/\D/g, "") || null;
  let id: number | undefined;

  if (documento) {
    const { data } = await bling<{ data: { id: number }[] }>(`/contatos?numeroDocumento=${documento}`);
    id = data[0]?.id;
  }
  if (!id) {
    const { data } = await bling<{ data: { id: number } }>("/contatos", {
      method: "POST",
      body: JSON.stringify({
        nome: empresa.nome,
        situacao: "A",
        tipo: documento && documento.length === 11 ? "F" : "J",
        numeroDocumento: documento ?? undefined,
        endereco: { geral: { municipio: empresa.cidade ?? undefined, uf: empresa.uf ?? undefined } },
      }),
    });
    id = data.id;
  }

  await createAdminClient().from("empresas").update({ bling_contato_id: id }).eq("id", empresa.id);
  return id;
}

// Cria no Bling o pedido de venda de uma proposta aceita. Grava o id do
// pedido ou o erro na proposta, para a tela mostrar e permitir reenviar.
export async function enviarPedidoAoBling(propostaId: string) {
  const admin = createAdminClient();
  const { data: proposta, error } = await admin
    .from("propostas")
    .select(
      `id, numero, desconto_pct, observacao, bling_pedido_id,
       negociacoes!inner(empresas!inner(id, nome, cnpj, cidade, uf, bling_contato_id)),
       proposta_itens(quantidade, preco_unitario, produtos!inner(nome, bling_id))`,
    )
    .eq("id", propostaId)
    .eq("status", "aceita")
    .single<PropostaParaPedido>();
  if (error || !proposta) throw new Error("Proposta aceita não encontrada.");
  if (proposta.bling_pedido_id) return proposta.bling_pedido_id;

  try {
    const semVinculo = proposta.proposta_itens.filter((i) => !i.produtos.bling_id).map((i) => i.produtos.nome);
    if (semVinculo.length) {
      throw new Error(`Produtos sem cadastro no Bling: ${semVinculo.join(", ")}. Sincronize os produtos.`);
    }

    const contatoId = await garantirContato(proposta.negociacoes.empresas);
    const { data } = await bling<{ data: { id: number } }>("/pedidos/vendas", {
      method: "POST",
      body: JSON.stringify({
        contato: { id: contatoId },
        data: hojeISO(),
        numeroPedidoCompra: `CRM-${proposta.numero}`,
        itens: proposta.proposta_itens.map((i) => ({
          produto: { id: i.produtos.bling_id },
          quantidade: i.quantidade,
          valor: Number(i.preco_unitario),
        })),
        desconto: { valor: Number(proposta.desconto_pct), unidade: "PERCENTUAL" },
        observacoes: [`Proposta #${proposta.numero} do CRM SrMATE.`, proposta.observacao].filter(Boolean).join(" "),
      }),
    });

    await admin.from("propostas").update({ bling_pedido_id: data.id, bling_erro: null }).eq("id", propostaId);
    return data.id;
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : String(e);
    await admin.from("propostas").update({ bling_erro: mensagem.slice(0, 1000) }).eq("id", propostaId);
    throw e;
  }
}
