"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoAcao } from "@/components/acao-form";
import { enviarPedidoAoBling, sincronizarProdutos } from "@/lib/bling";
import { CANAIS, isCanal, isEstagio, isTipoInteracaoManual, UFS, type Estagio } from "@/lib/dominio";
import { exigirAdmin, exigirUsuario } from "@/lib/sessao";

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

function numero(formData: FormData, campo: string) {
  const valor = texto(formData, campo).replace(",", ".");
  return valor === "" ? NaN : Number(valor);
}

function mensagemErro(erro: { message: string } | null | undefined, padrao: string) {
  return erro?.message || padrao;
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

export async function criarEmpresa(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const { supabase, user } = await exigirUsuario();

  const nome = texto(formData, "nome");
  const canal = texto(formData, "canal");
  const uf = texto(formData, "uf").toUpperCase();
  if (!nome) return { erro: "Informe o nome da empresa." };
  if (!isCanal(canal)) return { erro: "Escolha o canal." };
  if (uf && !UFS.includes(uf)) return { erro: "UF inválida." };

  const { data: empresa, error } = await supabase
    .from("empresas")
    .insert({
      nome,
      canal,
      cnpj: texto(formData, "cnpj") || null,
      cidade: texto(formData, "cidade") || null,
      uf: uf || null,
      compartilhada: formData.get("compartilhada") === "on",
      responsavel_id: user.id,
    })
    .select("id")
    .single();
  if (error || !empresa) return { erro: mensagemErro(error, "Não foi possível salvar a empresa.") };

  const contato = texto(formData, "contato");
  if (contato) {
    await supabase.from("contatos").insert({
      empresa_id: empresa.id,
      nome: contato,
      telefone: texto(formData, "telefone") || null,
      email: texto(formData, "email") || null,
    });
  }

  const valor = numero(formData, "valor_estimado");
  await supabase.from("negociacoes").insert({
    empresa_id: empresa.id,
    titulo: texto(formData, "titulo") || `Primeiro pedido – ${nome}`,
    valor_estimado: Number.isFinite(valor) && valor > 0 ? valor : 0,
  });

  revalidatePath("/", "layout");
  redirect(`/clientes/${empresa.id}`);
}

export async function atualizarEmpresa(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirUsuario();
  const id = texto(formData, "empresa_id");
  const canal = texto(formData, "canal");
  const uf = texto(formData, "uf").toUpperCase();
  if (!texto(formData, "nome")) return { erro: "Informe o nome da empresa." };
  if (!isCanal(canal)) return { erro: "Escolha o canal." };
  if (uf && !UFS.includes(uf)) return { erro: "UF inválida." };

  const { error } = await supabase
    .from("empresas")
    .update({
      nome: texto(formData, "nome"),
      canal,
      cnpj: texto(formData, "cnpj") || null,
      cidade: texto(formData, "cidade") || null,
      uf: uf || null,
      compartilhada: formData.get("compartilhada") === "on",
    })
    .eq("id", id);
  if (error) return { erro: mensagemErro(error, "Não foi possível salvar.") };

  revalidatePath("/", "layout");
  return { ok: "Dados salvos." };
}

export async function criarContato(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirUsuario();
  const empresaId = texto(formData, "empresa_id");
  const nome = texto(formData, "nome");
  if (!nome) return { erro: "Informe o nome do contato." };

  const { error } = await supabase.from("contatos").insert({
    empresa_id: empresaId,
    nome,
    telefone: texto(formData, "telefone") || null,
    email: texto(formData, "email") || null,
  });
  if (error) return { erro: mensagemErro(error, "Não foi possível salvar o contato.") };

  revalidatePath(`/clientes/${empresaId}`);
  return {};
}

export async function criarNegociacao(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirUsuario();
  const empresaId = texto(formData, "empresa_id");
  const titulo = texto(formData, "titulo");
  const valor = numero(formData, "valor_estimado");
  if (!titulo) return { erro: "Dê um título para a negociação (ex.: Pedido de reposição – março)." };
  if (Number.isFinite(valor) && valor < 0) return { erro: "O valor estimado não pode ser negativo." };

  const { error } = await supabase.from("negociacoes").insert({
    empresa_id: empresaId,
    titulo,
    valor_estimado: Number.isFinite(valor) ? valor : 0,
  });
  if (error) return { erro: mensagemErro(error, "Não foi possível criar a negociação.") };

  revalidatePath("/", "layout");
  return {};
}

export async function registrarInteracao(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const { supabase, user } = await exigirUsuario();
  const empresaId = texto(formData, "empresa_id");
  const tipo = texto(formData, "tipo");
  const nota = texto(formData, "nota");
  if (!isTipoInteracaoManual(tipo)) return { erro: "Escolha o tipo de interação." };
  if (!nota) return { erro: "Escreva o que foi conversado." };

  const { error } = await supabase.from("interacoes").insert({
    empresa_id: empresaId,
    negociacao_id: texto(formData, "negociacao_id") || null,
    tipo,
    nota,
    autor_id: user.id,
  });
  if (error) return { erro: mensagemErro(error, "Não foi possível registrar a interação.") };

  revalidatePath("/", "layout");
  return { ok: "Interação registrada." };
}

// ---------------------------------------------------------------------------
// Funil
// ---------------------------------------------------------------------------

export async function moverEstagio(negociacaoId: string, estagio: Estagio): Promise<EstadoAcao> {
  const { supabase } = await exigirUsuario();
  if (!isEstagio(estagio)) return { erro: "Estágio inválido." };

  const { error } = await supabase.from("negociacoes").update({ estagio }).eq("id", negociacaoId);
  if (error) return { erro: mensagemErro(error, "Não foi possível mover a negociação.") };

  revalidatePath("/", "layout");
  return {};
}

export async function moverEstagioForm(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  return moverEstagio(texto(formData, "negociacao_id"), texto(formData, "estagio") as Estagio);
}

// ---------------------------------------------------------------------------
// Propostas
// ---------------------------------------------------------------------------

export async function criarProposta(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirUsuario();
  const negociacaoId = texto(formData, "negociacao_id");
  const desconto = numero(formData, "desconto_pct");
  if (!negociacaoId) return { erro: "Escolha a negociação." };
  if (!Number.isFinite(desconto) || desconto < 0 || desconto > 100) {
    return { erro: "O desconto precisa estar entre 0% e 100%." };
  }

  const produtos = formData.getAll("produto_id").map(String);
  const quantidades = formData.getAll("quantidade").map((q) => Number(q));
  const itens = produtos
    .map((produto_id, i) => ({ produto_id, quantidade: Math.floor(quantidades[i] || 0) }))
    .filter((i) => i.produto_id && i.quantidade > 0);
  if (!itens.length) return { erro: "Adicione ao menos um produto." };

  const { error } = await supabase.rpc("criar_proposta", {
    p_negociacao_id: negociacaoId,
    p_desconto_pct: desconto,
    p_itens: itens,
    p_observacao: texto(formData, "observacao") || null,
  });
  if (error) return { erro: mensagemErro(error, "Não foi possível criar a proposta.") };

  revalidatePath("/", "layout");
  redirect("/propostas");
}

async function rpcProposta(funcao: string, argumentos: Record<string, unknown>): Promise<EstadoAcao> {
  const { supabase } = await exigirUsuario();
  const { error } = await supabase.rpc(funcao, argumentos);
  if (error) return { erro: mensagemErro(error, "Não foi possível concluir a ação.") };
  revalidatePath("/", "layout");
  return {};
}

export async function reavaliarProposta(_estado: EstadoAcao, formData: FormData) {
  return rpcProposta("reavaliar_proposta", { p_proposta_id: texto(formData, "proposta_id") });
}

export async function enviarProposta(_estado: EstadoAcao, formData: FormData) {
  return rpcProposta("enviar_proposta", { p_proposta_id: texto(formData, "proposta_id") });
}

export async function decidirDesconto(_estado: EstadoAcao, formData: FormData) {
  return rpcProposta("decidir_desconto", {
    p_proposta_id: texto(formData, "proposta_id"),
    p_aprovar: texto(formData, "decisao") === "aprovar",
    p_observacao: texto(formData, "observacao") || null,
  });
}

export async function registrarResultado(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const propostaId = texto(formData, "proposta_id");
  const aceita = texto(formData, "resultado") === "aceita";
  const resultado = await rpcProposta("registrar_resultado_proposta", {
    p_proposta_id: propostaId,
    p_aceita: aceita,
    p_observacao: texto(formData, "observacao") || null,
  });
  if (resultado.erro || !aceita) return resultado;

  try {
    const pedido = await enviarPedidoAoBling(propostaId);
    revalidatePath("/propostas");
    return { ok: `Pedido ${pedido} criado no Bling.` };
  } catch (e) {
    revalidatePath("/propostas");
    return { erro: `Proposta aceita, mas o pedido não foi criado no Bling: ${(e as Error).message}` };
  }
}

export async function reenviarPedidoBling(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirUsuario();
  const propostaId = texto(formData, "proposta_id");
  // Confere pelo RLS se o usuário enxerga a proposta antes de usar a chave secreta.
  const { data } = await supabase.from("propostas").select("id").eq("id", propostaId).eq("status", "aceita").maybeSingle();
  if (!data) return { erro: "Proposta não encontrada." };

  try {
    const pedido = await enviarPedidoAoBling(propostaId);
    revalidatePath("/propostas");
    return { ok: `Pedido ${pedido} criado no Bling.` };
  } catch (e) {
    revalidatePath("/propostas");
    return { erro: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Configurações (admin)
// ---------------------------------------------------------------------------

export async function salvarRegrasDesconto(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirAdmin();
  const automatico = numero(formData, "limite_automatico");
  const gestor = numero(formData, "limite_gestor");
  if (!(automatico >= 0 && automatico <= gestor && gestor <= 100)) {
    return { erro: "Use 0 ≤ limite automático ≤ limite da diretoria ≤ 100." };
  }

  const { error } = await supabase
    .from("regras_desconto")
    .update({ limite_automatico: automatico, limite_gestor: gestor })
    .eq("id", 1);
  if (error) return { erro: mensagemErro(error, "Não foi possível salvar as faixas.") };

  revalidatePath("/", "layout");
  return { ok: "Faixas de desconto salvas." };
}

export async function salvarProduto(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const { supabase } = await exigirAdmin();
  const produtoId = texto(formData, "produto_id");
  const minimo = numero(formData, "quantidade_minima");
  if (!Number.isInteger(minimo) || minimo < 1) return { erro: "O pedido mínimo deve ser um número inteiro ≥ 1." };

  const precos = [];
  const semPreco = [];
  for (const canal of CANAIS) {
    const valor = numero(formData, `preco_${canal}`);
    if (Number.isNaN(valor)) {
      semPreco.push(canal);
      continue;
    }
    if (valor < 0) return { erro: "Preço não pode ser negativo." };
    precos.push({ produto_id: produtoId, canal, preco: valor });
  }

  const { error: erroMinimo } = await supabase
    .from("produtos")
    .update({ quantidade_minima: minimo })
    .eq("id", produtoId);
  if (erroMinimo) return { erro: mensagemErro(erroMinimo, "Não foi possível salvar o pedido mínimo.") };

  if (precos.length) {
    const { error } = await supabase.from("precos").upsert(precos);
    if (error) return { erro: mensagemErro(error, "Não foi possível salvar os preços.") };
  }
  if (semPreco.length) {
    const { error } = await supabase.from("precos").delete().eq("produto_id", produtoId).in("canal", semPreco);
    if (error) return { erro: mensagemErro(error, "Não foi possível remover os preços apagados.") };
  }

  revalidatePath("/configuracoes");
  return { ok: "Salvo." };
}

export async function sincronizarBling(): Promise<EstadoAcao> {
  await exigirAdmin();
  try {
    const total = await sincronizarProdutos();
    revalidatePath("/", "layout");
    return { ok: `${total} produtos sincronizados com o Bling.` };
  } catch (e) {
    return { erro: (e as Error).message };
  }
}
