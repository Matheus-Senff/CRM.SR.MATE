# CRM SrMATE

CRM comercial B2B da SrMATE (distribuidor, atacado e varejo), com integração ao Bling. O e-commerce (Fase 3) fica para depois.

**Stack:** Next.js 16 (App Router, server actions) na Vercel · Supabase (Postgres, Auth e RLS) · API v3 do Bling.

## O que o sistema faz

- **Clientes:** cada gestor tem a própria carteira e pode compartilhar uma empresa com toda a equipe. A empresa tem contatos (com atalho para o WhatsApp), histórico de interações e várias negociações ao longo do tempo (recompra).
- **Funil:** quadro por estágio. Dá para arrastar os cartões ou trocar o estágio pelo seletor do cartão, que também funciona no celular. Toda mudança de estágio entra no histórico.
- **Propostas:** o preço vem da tabela do canal do cliente. O sistema soma as linhas repetidas do mesmo produto, confere o estoque disponível (já descontando o que está reservado por outras propostas em aberto) e o pedido mínimo do produto, e aplica as faixas de desconto.
- **Aprovações:** descontos na faixa intermediária vão para a diretoria (perfil `admin`). Acima do limite, a proposta fica bloqueada.
- **Bling:** produtos e estoque são sincronizados do Bling (pelo botão em Configurações e por um cron diário). Quando o cliente aceita uma proposta, ela vira um pedido de venda no Bling, que calcula os impostos (Simples Nacional, ICMS-ST, DIFAL) e emite a NF-e.
- **Configurações (admin):** faixas de desconto, preço por canal, pedido mínimo por produto e conexão com o Bling.

As regras de proposta ficam no banco, em funções RPC (`supabase/migrations`). O app não grava em `propostas` diretamente, então nenhuma tela consegue pular a aprovação.

## Colocar no ar

### 1. Supabase (projeto `ftqccptcnknyyyukojvo`)

Aplique o schema por uma destas formas:

- **CLI:** `npx supabase link --project-ref ftqccptcnknyyyukojvo` e depois `npx supabase db push`. O link pede a senha do banco.
- **Painel:** abra o SQL Editor, cole o conteúdo de `supabase/migrations/20261020000000_schema_inicial.sql` e execute.
- **Integração com o GitHub:** no painel do Supabase, em Integrations → GitHub, aponte para este repositório. As migrações passam a ser aplicadas a cada merge na `main`.

Depois:

1. Em Authentication → Users, crie os usuários (os 3 gestores e a diretoria). Para mostrar o nome certo no sistema, preencha `nome` em *User metadata*.
2. Dê o perfil de diretoria a quem aprova descontos e cuida das configurações:
   ```sql
   update public.perfis set papel = 'admin' where id = (select id from auth.users where email = 'diretoria@exemplo.com');
   ```
3. Em Authentication → Sign In / Providers, desative "Allow new users to sign up". Os acessos são criados só pela diretoria.

### 2. Vercel

Configure as variáveis de ambiente listadas em `.env.example`:

| Variável | Onde pegar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ftqccptcnknyyyukojvo.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → Publishable key |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → Secret key |
| `BLING_CLIENT_ID` / `BLING_CLIENT_SECRET` | Bling → Central de Extensões → Área do integrador → seu aplicativo |
| `CRON_SECRET` | Qualquer texto aleatório longo |

Se o Supabase foi ligado à Vercel pela integração oficial, as variáveis `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` que ela cria também funcionam.

O `vercel.json` agenda a sincronização com o Bling todo dia às 9h UTC (6h em Brasília).

### 3. Bling

1. Cadastre um aplicativo na Área do integrador do Bling, com URL de redirecionamento `https://SEU-DOMINIO/api/bling/callback`. Ele precisa dos escopos de produtos, estoques, contatos e pedidos de venda.
2. No CRM, entre com o perfil admin e vá em **Configurações → Conectar ao Bling**, depois em **Sincronizar produtos e estoque**.
3. Cadastre o preço de cada canal e o pedido mínimo de cada produto.

## Desenvolvimento local

```bash
npm install
npx supabase start          # precisa de Docker; aplica a migração e o seed
cp .env.example .env.local  # use a URL e as chaves que o comando acima mostrar
npm run dev
```

Verificações: `npm run lint`, `npx tsc --noEmit` e `npm run build`.

## Documentos e protótipo

- `prototipo/crm-srmate-prototipo.html`: protótipo navegável original, que serviu de base para as telas.
- `docs/`: pesquisa de CRMs, benchmark de funcionalidades e descrição do protótipo.
