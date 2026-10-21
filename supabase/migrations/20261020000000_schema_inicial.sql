-- CRM SrMATE — schema inicial (Fases 1 e 2)
--
-- As regras de negócio de proposta (preço por canal, estoque e faixas de
-- desconto) ficam no banco, em funções RPC. O app não grava em propostas
-- diretamente, assim nenhuma tela consegue pular a aprovação do gestor.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type public.canal as enum ('distribuidor', 'atacado', 'varejo');

create type public.estagio as enum (
  'novo_lead', 'contato_feito', 'proposta_enviada', 'negociacao', 'ganho', 'perdido'
);

create type public.papel as enum ('vendedor', 'gestor', 'admin');

create type public.status_proposta as enum (
  'rascunho',             -- estoque insuficiente; precisa ser reavaliada
  'aguardando_aprovacao', -- desconto na faixa do gestor
  'aprovada',             -- pronta para enviar ao cliente
  'recusada',             -- desconto recusado pelo gestor
  'bloqueada',            -- desconto acima do limite do gestor
  'enviada',
  'aceita',
  'perdida'
);

create type public.tipo_interacao as enum ('whatsapp', 'ligacao', 'email', 'visita', 'sistema');

-- ---------------------------------------------------------------------------
-- Usuários
-- ---------------------------------------------------------------------------

create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  papel public.papel not null default 'gestor',
  created_at timestamptz not null default now()
);

create function public.criar_perfil_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfis (id, nome)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'nome', ''), new.email, 'Usuário'));
  return new;
end;
$$;

create trigger criar_perfil_apos_cadastro
  after insert on auth.users
  for each row execute function public.criar_perfil_novo_usuario();

create function public.papel_atual()
returns public.papel
language sql
stable
security definer
set search_path = ''
as $$
  select papel from public.perfis where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Clientes, contatos, negociações e interações (Fase 1)
-- ---------------------------------------------------------------------------

create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  canal public.canal not null,
  cnpj text,
  cidade text,
  uf char(2),
  responsavel_id uuid references public.perfis (id) on delete set null default auth.uid(),
  -- false: só o responsável (e o admin) vê; true: toda a equipe vê e trabalha.
  compartilhada boolean not null default false,
  bling_contato_id bigint unique,
  created_at timestamptz not null default now()
);

create function public.pode_acessar_empresa(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.empresas e
    where e.id = p_empresa_id
      and (e.responsavel_id = auth.uid() or e.compartilhada or public.papel_atual() = 'admin')
  );
$$;

create table public.contatos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  telefone text,
  email text,
  created_at timestamptz not null default now()
);

-- Uma empresa pode ter várias negociações ao longo do tempo (recompra),
-- cada uma com o seu estágio no funil.
create table public.negociacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  titulo text not null check (length(trim(titulo)) > 0),
  estagio public.estagio not null default 'novo_lead',
  valor_estimado numeric(14, 2) not null default 0 check (valor_estimado >= 0),
  responsavel_id uuid references public.perfis (id) on delete set null default auth.uid(),
  fechado_em timestamptz,
  created_at timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.interacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  negociacao_id uuid references public.negociacoes (id) on delete set null,
  tipo public.tipo_interacao not null,
  nota text not null check (length(trim(nota)) > 0),
  ocorrida_em timestamptz not null default now(),
  autor_id uuid references public.perfis (id) on delete set null default auth.uid()
);

create index on public.contatos (empresa_id);
create index on public.negociacoes (empresa_id);
create index on public.negociacoes (estagio);
create index on public.interacoes (empresa_id, ocorrida_em desc);
create index on public.interacoes (ocorrida_em desc);

create function public.rotulo_estagio(p_estagio public.estagio)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_estagio
    when 'novo_lead' then 'Novo lead'
    when 'contato_feito' then 'Contato feito'
    when 'proposta_enviada' then 'Proposta enviada'
    when 'negociacao' then 'Negociação'
    when 'ganho' then 'Fechado – ganho'
    when 'perdido' then 'Fechado – perdido'
  end;
$$;

-- Registra no histórico toda mudança de estágio, venha de onde vier.
create function public.registrar_mudanca_estagio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  if new.estagio is distinct from old.estagio then
    new.fechado_em := case when new.estagio in ('ganho', 'perdido') then now() end;
    insert into public.interacoes (empresa_id, negociacao_id, tipo, nota, autor_id)
    values (new.empresa_id, new.id, 'sistema',
            format('Estágio de "%s" alterado de "%s" para "%s".', new.titulo,
                   public.rotulo_estagio(old.estagio), public.rotulo_estagio(new.estagio)),
            auth.uid());
  end if;
  return new;
end;
$$;

create trigger negociacoes_mudanca_estagio
  before update on public.negociacoes
  for each row execute function public.registrar_mudanca_estagio();

-- ---------------------------------------------------------------------------
-- Produtos, preços e regras de desconto (Fase 2)
-- ---------------------------------------------------------------------------

create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  nome text not null,
  estoque integer not null default 0 check (estoque >= 0),
  quantidade_minima integer not null default 1 check (quantidade_minima > 0),
  ativo boolean not null default true,
  bling_id bigint unique, -- estoque e cadastro vêm do Bling
  sincronizado_em timestamptz,
  created_at timestamptz not null default now()
);

create table public.precos (
  produto_id uuid not null references public.produtos (id) on delete cascade,
  canal public.canal not null,
  preco numeric(12, 2) not null check (preco >= 0),
  primary key (produto_id, canal)
);

-- Linha única com as faixas de desconto, editável pelo admin.
create table public.regras_desconto (
  id smallint primary key default 1 check (id = 1),
  limite_automatico numeric(5, 2) not null default 5,
  limite_gestor numeric(5, 2) not null default 15,
  check (limite_automatico >= 0 and limite_automatico <= limite_gestor and limite_gestor <= 100)
);

insert into public.regras_desconto (id) values (1);

-- ---------------------------------------------------------------------------
-- Propostas
-- ---------------------------------------------------------------------------

create table public.propostas (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity unique,
  negociacao_id uuid not null references public.negociacoes (id) on delete restrict,
  canal public.canal not null,
  desconto_pct numeric(5, 2) not null check (desconto_pct >= 0 and desconto_pct <= 100),
  status public.status_proposta not null,
  subtotal numeric(14, 2) not null,
  desconto_valor numeric(14, 2) not null,
  total numeric(14, 2) not null,
  observacao text,
  criado_por uuid references public.perfis (id) on delete set null,
  decidido_por uuid references public.perfis (id) on delete set null,
  decidido_em timestamptz,
  bling_pedido_id bigint,
  bling_erro text,
  created_at timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.proposta_itens (
  id uuid primary key default gen_random_uuid(),
  proposta_id uuid not null references public.propostas (id) on delete cascade,
  produto_id uuid not null references public.produtos (id) on delete restrict,
  quantidade integer not null check (quantidade > 0),
  preco_unitario numeric(12, 2) not null,
  total numeric(14, 2) not null,
  unique (proposta_id, produto_id)
);

create index on public.propostas (negociacao_id);
create index on public.propostas (status);
create index on public.proposta_itens (produto_id);

-- Estoque reservado = itens de propostas que ainda podem virar pedido, de
-- todas as carteiras (por isso security definer: a reserva conta mesmo as
-- propostas que o usuário não enxerga).
create function public.disponibilidade_produtos()
returns table (produto_id uuid, estoque integer, reservado integer, disponivel integer)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.estoque, coalesce(r.reservado, 0)::integer, (p.estoque - coalesce(r.reservado, 0))::integer
  from public.produtos p
  left join (
    select i.produto_id, sum(i.quantidade) as reservado
    from public.proposta_itens i
    join public.propostas pr on pr.id = i.proposta_id
    where pr.status in ('aguardando_aprovacao', 'aprovada', 'enviada')
    group by i.produto_id
  ) r on r.produto_id = p.id;
$$;

-- Faixa do desconto: 'automatico', 'gestor' ou 'bloqueado'.
create function public.faixa_desconto(p_pct numeric)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_pct <= r.limite_automatico then 'automatico'
    when p_pct <= r.limite_gestor then 'gestor'
    else 'bloqueado'
  end
  from public.regras_desconto r
  where r.id = 1;
$$;

-- Status que uma proposta deve ter, dado o estoque disponível (sem contar a
-- reserva da própria proposta) e a faixa do desconto.
create function public.avaliar_status_proposta(p_proposta_id uuid)
returns public.status_proposta
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_desconto numeric;
  v_falta boolean;
begin
  select desconto_pct into v_desconto from public.propostas where id = p_proposta_id;

  select exists (
    select 1
    from public.proposta_itens i
    join public.produtos p on p.id = i.produto_id
    where i.proposta_id = p_proposta_id
      and i.quantidade > p.estoque - coalesce((
        select sum(oi.quantidade)
        from public.proposta_itens oi
        join public.propostas op on op.id = oi.proposta_id
        where oi.produto_id = i.produto_id
          and op.id <> p_proposta_id
          and op.status in ('aguardando_aprovacao', 'aprovada', 'enviada')
      ), 0)
  ) into v_falta;

  if v_falta then
    return 'rascunho';
  end if;

  return case public.faixa_desconto(v_desconto)
    when 'automatico' then 'aprovada'
    when 'gestor' then 'aguardando_aprovacao'
    else 'bloqueada'
  end::public.status_proposta;
end;
$$;

create function public.pode_acessar_proposta(p_proposta_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.pode_acessar_empresa(n.empresa_id)
  from public.propostas p
  join public.negociacoes n on n.id = p.negociacao_id
  where p.id = p_proposta_id;
$$;

-- Cria a proposta calculando preço pelo canal da empresa. p_itens é um
-- array JSON de {"produto_id": uuid, "quantidade": int}; linhas repetidas do
-- mesmo produto são somadas antes de checar o estoque.
create function public.criar_proposta(
  p_negociacao_id uuid,
  p_desconto_pct numeric,
  p_itens jsonb,
  p_observacao text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_canal public.canal;
  v_empresa_id uuid;
  v_titulo text;
  v_proposta_id uuid;
  v_subtotal numeric(14, 2);
  v_status public.status_proposta;
  v_abaixo_minimo text;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  if p_desconto_pct is null or p_desconto_pct < 0 or p_desconto_pct > 100 then
    raise exception 'O desconto precisa estar entre 0%% e 100%%.' using errcode = '22023';
  end if;

  select e.canal, e.id, n.titulo into v_canal, v_empresa_id, v_titulo
  from public.negociacoes n
  join public.empresas e on e.id = n.empresa_id
  where n.id = p_negociacao_id;

  if not found or not public.pode_acessar_empresa(v_empresa_id) then
    raise exception 'Negociação não encontrada.' using errcode = 'P0002';
  end if;

  create temporary table _itens on commit drop as
  select (item ->> 'produto_id')::uuid as produto_id,
         sum((item ->> 'quantidade')::integer)::integer as quantidade
  from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) as item
  where coalesce((item ->> 'quantidade')::integer, 0) > 0
  group by 1;

  if not exists (select 1 from _itens) then
    drop table _itens;
    raise exception 'Adicione ao menos um produto com quantidade maior que zero.' using errcode = '22023';
  end if;

  if exists (
    select 1 from _itens i
    left join public.produtos p on p.id = i.produto_id and p.ativo
    left join public.precos pr on pr.produto_id = i.produto_id and pr.canal = v_canal
    where p.id is null or pr.preco is null
  ) then
    drop table _itens;
    raise exception 'Há produto inativo ou sem preço para o canal %.', v_canal using errcode = '22023';
  end if;

  select string_agg(format('%s (mín. %s)', p.nome, p.quantidade_minima), ', ') into v_abaixo_minimo
  from _itens i
  join public.produtos p on p.id = i.produto_id
  where i.quantidade < p.quantidade_minima;

  if v_abaixo_minimo is not null then
    drop table _itens;
    raise exception 'Quantidade abaixo do pedido mínimo: %.', v_abaixo_minimo using errcode = '22023';
  end if;

  select sum(pr.preco * i.quantidade) into v_subtotal
  from _itens i
  join public.precos pr on pr.produto_id = i.produto_id and pr.canal = v_canal;

  insert into public.propostas (
    negociacao_id, canal, desconto_pct, status, subtotal, desconto_valor, total, observacao, criado_por
  ) values (
    p_negociacao_id, v_canal, p_desconto_pct, 'rascunho', v_subtotal,
    round(v_subtotal * p_desconto_pct / 100, 2),
    v_subtotal - round(v_subtotal * p_desconto_pct / 100, 2),
    nullif(trim(p_observacao), ''), auth.uid()
  )
  returning id into v_proposta_id;

  insert into public.proposta_itens (proposta_id, produto_id, quantidade, preco_unitario, total)
  select v_proposta_id, i.produto_id, i.quantidade, pr.preco, pr.preco * i.quantidade
  from _itens i
  join public.precos pr on pr.produto_id = i.produto_id and pr.canal = v_canal;

  drop table _itens;

  v_status := public.avaliar_status_proposta(v_proposta_id);
  update public.propostas set status = v_status where id = v_proposta_id;

  -- O valor da negociação passa a seguir a proposta mais recente que pode
  -- seguir adiante.
  if v_status in ('aprovada', 'aguardando_aprovacao') then
    update public.negociacoes
    set valor_estimado = (select total from public.propostas where id = v_proposta_id)
    where id = p_negociacao_id;
  end if;

  insert into public.interacoes (empresa_id, negociacao_id, tipo, nota)
  values (v_empresa_id, p_negociacao_id, 'sistema',
          format('Proposta criada para "%s" com desconto de %s%% (%s).', v_titulo, trim_scale(p_desconto_pct),
                 case v_status
                   when 'rascunho' then 'rascunho: estoque insuficiente'
                   when 'aprovada' then 'aprovada automaticamente'
                   when 'aguardando_aprovacao' then 'aguardando aprovação da diretoria'
                   else 'bloqueada: desconto acima do limite'
                 end));

  return v_proposta_id;
end;
$$;

-- Reavalia um rascunho (ex.: depois de reposição de estoque). Passa pelas
-- mesmas faixas de desconto da criação, então não há atalho para "enviada".
create function public.reavaliar_proposta(p_proposta_id uuid)
returns public.status_proposta
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.status_proposta;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  perform 1 from public.propostas where id = p_proposta_id and status = 'rascunho' for update;
  if not found or not public.pode_acessar_proposta(p_proposta_id) then
    raise exception 'Só propostas em rascunho podem ser reavaliadas.' using errcode = '22023';
  end if;

  v_status := public.avaliar_status_proposta(p_proposta_id);
  update public.propostas set status = v_status, atualizado_em = now() where id = p_proposta_id;
  return v_status;
end;
$$;

create function public.decidir_desconto(p_proposta_id uuid, p_aprovar boolean, p_observacao text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prop public.propostas;
begin
  -- Cada gestor cuida da própria carteira; quem aprova desconto é a
  -- diretoria (perfil admin).
  if public.papel_atual() is distinct from 'admin' then
    raise exception 'Só a diretoria (perfil admin) pode aprovar ou recusar descontos.' using errcode = '42501';
  end if;

  select * into v_prop from public.propostas where id = p_proposta_id for update;
  if not found or v_prop.status <> 'aguardando_aprovacao' then
    raise exception 'A proposta não está aguardando aprovação.' using errcode = '22023';
  end if;

  update public.propostas
  set status = case when p_aprovar then 'aprovada' else 'recusada' end::public.status_proposta,
      decidido_por = auth.uid(),
      decidido_em = now(),
      observacao = coalesce(nullif(trim(p_observacao), ''), observacao),
      atualizado_em = now()
  where id = p_proposta_id;

  insert into public.interacoes (empresa_id, negociacao_id, tipo, nota)
  select n.empresa_id, n.id, 'sistema',
         format('Desconto de %s%% da proposta #%s %s pela diretoria.', trim_scale(v_prop.desconto_pct), v_prop.numero,
                case when p_aprovar then 'aprovado' else 'recusado' end)
  from public.negociacoes n where n.id = v_prop.negociacao_id;
end;
$$;

create function public.enviar_proposta(p_proposta_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prop public.propostas;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  select * into v_prop from public.propostas where id = p_proposta_id for update;
  if not found or v_prop.status <> 'aprovada' or not public.pode_acessar_proposta(p_proposta_id) then
    raise exception 'Só propostas aprovadas podem ser enviadas.' using errcode = '22023';
  end if;

  update public.propostas set status = 'enviada', atualizado_em = now() where id = p_proposta_id;

  update public.negociacoes
  set estagio = 'proposta_enviada'
  where id = v_prop.negociacao_id and estagio in ('novo_lead', 'contato_feito');
end;
$$;

-- Resultado informado pelo cliente. Aceita: baixa o estoque e marca a
-- negociação como ganha. Perdida: só registra; o vendedor decide se faz
-- nova proposta ou encerra a negociação.
create function public.registrar_resultado_proposta(p_proposta_id uuid, p_aceita boolean, p_observacao text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prop public.propostas;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  select * into v_prop from public.propostas where id = p_proposta_id for update;
  if not found or v_prop.status <> 'enviada' or not public.pode_acessar_proposta(p_proposta_id) then
    raise exception 'Só propostas enviadas podem ser marcadas como aceitas ou perdidas.' using errcode = '22023';
  end if;

  if p_aceita then
    perform 1 from public.produtos p
    join public.proposta_itens i on i.produto_id = p.id
    where i.proposta_id = p_proposta_id
    for update of p;

    if exists (
      select 1 from public.proposta_itens i
      join public.produtos p on p.id = i.produto_id
      where i.proposta_id = p_proposta_id and p.estoque < i.quantidade
    ) then
      raise exception 'Estoque insuficiente para concluir o pedido.' using errcode = '22023';
    end if;

    update public.produtos p
    set estoque = p.estoque - i.quantidade
    from public.proposta_itens i
    where i.proposta_id = p_proposta_id and i.produto_id = p.id;
  end if;

  update public.propostas
  set status = case when p_aceita then 'aceita' else 'perdida' end::public.status_proposta,
      observacao = coalesce(nullif(trim(p_observacao), ''), observacao),
      atualizado_em = now()
  where id = p_proposta_id;

  if p_aceita then
    update public.negociacoes
    set estagio = 'ganho', valor_estimado = v_prop.total
    where id = v_prop.negociacao_id;
  else
    insert into public.interacoes (empresa_id, negociacao_id, tipo, nota)
    select n.empresa_id, n.id, 'sistema',
           format('Proposta #%s recusada pelo cliente.%s', v_prop.numero,
                  coalesce(' Motivo: ' || nullif(trim(p_observacao), ''), ''))
    from public.negociacoes n where n.id = v_prop.negociacao_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Segurança (RLS)
-- ---------------------------------------------------------------------------
-- Cada gestor vê a própria carteira e as empresas marcadas como
-- compartilhadas; o admin vê tudo. Contatos, negociações, interações e
-- propostas seguem a visibilidade da empresa.

alter table public.perfis enable row level security;
alter table public.empresas enable row level security;
alter table public.contatos enable row level security;
alter table public.negociacoes enable row level security;
alter table public.interacoes enable row level security;
alter table public.produtos enable row level security;
alter table public.precos enable row level security;
alter table public.regras_desconto enable row level security;
alter table public.propostas enable row level security;
alter table public.proposta_itens enable row level security;

create policy "perfis: leitura" on public.perfis for select to authenticated using (true);
create policy "perfis: editar o próprio" on public.perfis for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.perfis from authenticated;
grant update (nome) on public.perfis to authenticated;

create policy "empresas: leitura" on public.empresas for select to authenticated
  using (responsavel_id = auth.uid() or compartilhada or public.papel_atual() = 'admin');
create policy "empresas: inserir na própria carteira" on public.empresas for insert to authenticated
  with check (responsavel_id = auth.uid() or public.papel_atual() = 'admin');
create policy "empresas: editar" on public.empresas for update to authenticated
  using (responsavel_id = auth.uid() or compartilhada or public.papel_atual() = 'admin')
  with check (responsavel_id = auth.uid() or compartilhada or public.papel_atual() = 'admin');
create policy "empresas: excluir (responsável ou admin)" on public.empresas for delete to authenticated
  using (responsavel_id = auth.uid() or public.papel_atual() = 'admin');

create policy "contatos: acesso pela empresa" on public.contatos for all to authenticated
  using (public.pode_acessar_empresa(empresa_id)) with check (public.pode_acessar_empresa(empresa_id));

create policy "negociacoes: leitura" on public.negociacoes for select to authenticated
  using (public.pode_acessar_empresa(empresa_id));
create policy "negociacoes: inserir" on public.negociacoes for insert to authenticated
  with check (public.pode_acessar_empresa(empresa_id));
create policy "negociacoes: editar" on public.negociacoes for update to authenticated
  using (public.pode_acessar_empresa(empresa_id)) with check (public.pode_acessar_empresa(empresa_id));

create policy "interacoes: leitura" on public.interacoes for select to authenticated
  using (public.pode_acessar_empresa(empresa_id));
create policy "interacoes: inserir as próprias" on public.interacoes for insert to authenticated
  with check (autor_id = auth.uid() and tipo <> 'sistema' and public.pode_acessar_empresa(empresa_id));

create policy "produtos: leitura" on public.produtos for select to authenticated using (true);
create policy "produtos: admin" on public.produtos for update to authenticated
  using (public.papel_atual() = 'admin') with check (public.papel_atual() = 'admin');

create policy "precos: leitura" on public.precos for select to authenticated using (true);
create policy "precos: admin" on public.precos for all to authenticated
  using (public.papel_atual() = 'admin') with check (public.papel_atual() = 'admin');

create policy "regras_desconto: leitura" on public.regras_desconto for select to authenticated using (true);
create policy "regras_desconto: admin" on public.regras_desconto for update to authenticated
  using (public.papel_atual() = 'admin') with check (public.papel_atual() = 'admin');

-- Propostas só mudam pelas funções acima.
create policy "propostas: leitura" on public.propostas for select to authenticated
  using (public.pode_acessar_proposta(id));
create policy "proposta_itens: leitura" on public.proposta_itens for select to authenticated
  using (public.pode_acessar_proposta(proposta_id));

-- Produtos vêm do Bling (sincronização com a service role); no app o admin
-- só ajusta o pedido mínimo.
revoke update on public.produtos from authenticated;
grant update (quantidade_minima) on public.produtos to authenticated;

-- Funções: só usuários autenticados.
revoke execute on function
  public.papel_atual(),
  public.pode_acessar_empresa(uuid),
  public.pode_acessar_proposta(uuid),
  public.disponibilidade_produtos(),
  public.faixa_desconto(numeric),
  public.avaliar_status_proposta(uuid),
  public.criar_proposta(uuid, numeric, jsonb, text),
  public.reavaliar_proposta(uuid),
  public.decidir_desconto(uuid, boolean, text),
  public.enviar_proposta(uuid),
  public.registrar_resultado_proposta(uuid, boolean, text)
from public, anon;

grant execute on function
  public.papel_atual(),
  public.pode_acessar_empresa(uuid),
  public.pode_acessar_proposta(uuid),
  public.disponibilidade_produtos(),
  public.faixa_desconto(numeric),
  public.criar_proposta(uuid, numeric, jsonb, text),
  public.reavaliar_proposta(uuid),
  public.decidir_desconto(uuid, boolean, text),
  public.enviar_proposta(uuid),
  public.registrar_resultado_proposta(uuid, boolean, text)
to authenticated;

revoke execute on function public.criar_perfil_novo_usuario() from public, anon, authenticated;
revoke execute on function public.registrar_mudanca_estagio() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Integração com o Bling
-- ---------------------------------------------------------------------------
-- Tokens OAuth do Bling. Sem políticas de RLS: só a service role (servidor)
-- lê e grava.

create table public.integracao_bling (
  id smallint primary key default 1 check (id = 1),
  access_token text not null,
  refresh_token text not null,
  expira_em timestamptz not null,
  atualizado_em timestamptz not null default now()
);

alter table public.integracao_bling enable row level security;
revoke all on public.integracao_bling from anon, authenticated;
