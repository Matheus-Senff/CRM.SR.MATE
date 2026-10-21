# Benchmark de funcionalidades — CRMs pesquisados x realidade da fábrica de MATE

Elaborado em 04/08/2026. Objetivo: mapear as funcionalidades dos 3 CRMs de referência (Agendor, RD Station CRM, Ploomes) e usá-las como benchmark para a construção do CRM próprio (SrMATE), considerando o cenário atual da empresa:

- **Hoje:** controle manual de leads e clientes, sem visibilidade de funil, sem histórico centralizado.
- **Prioridade atual:** atender a lacuna B2B (venda para distribuidores/atacado/varejo).
- **Horizonte próximo:** lançamento do produto em e-commerce.

## Matriz comparativa de funcionalidades

| Funcionalidade | Agendor | RD Station CRM | Ploomes |
|---|---|---|---|
| Contatos e histórico centralizado | Sim | Sim, com campos personalizados ilimitados | Sim, com gestão de carteira |
| Funil de vendas visual/personalizável | Sim | Sim, múltiplos funis (Basic+) | Sim |
| Qualificação/priorização de leads | Parcial (qualificação obrigatória no plano Performance) | Sim, com insights de IA (Pro+) | Sim, via funil e regras |
| Automação de tarefas/follow-up | Sim (plano Performance) | Sim, com templates de automação (Pro+) | Sim, com fluxos de aprovação |
| Integração com WhatsApp | Sim, nativo em todos os planos | Sim, nativo (WhatsApp Web) | Possui integração, mas menos destacada nas fontes |
| Geração de propostas/pedidos (CPQ) | Sim (plano Performance) | Não é o foco (CRM comercial/marketing) | Sim, CPQ nativo com cálculo de impostos e margem — diferencial |
| Fluxo de aprovação de desconto | Não identificado nas fontes | Não identificado | Sim, nativo — diferencial |
| Integração nativa com ERP/estoque | Não nativa (via integradores como Pluga/Zapier) | Não nativa (foco marketing+vendas) | Sim, sincroniza tabela de preços, estoque e limite de crédito — diferencial |
| Relatórios e dashboards | Sim (Pro+) | Sim, com IA (Basic/Pro+) | Sim, tempo real |
| App mobile para vendedor externo | Sim | Sim | Sim |
| Integração nativa com e-commerce | Não nativa (via Pluga/Loja Integrada) | Sim, nativa com Loja Virtual, Shopify, Nuvemshop, Wix — sincroniza carrinho, pedidos e comportamento de compra em tempo real — diferencial | Não nativa (via Pluga) |
| Plano de entrada | Gratuito até 3 usuários | Gratuito até 4 usuários | Sem plano gratuito claro; preço sob consulta |
| Perfil de maturidade do negócio-alvo | Pequenas empresas em geral | Pequenas empresas, forte em marketing+vendas | Empresas B2B com processos de venda mais complexos (indústria) |

## Leitura para o cenário da fábrica de MATE

**Resolvendo a lacuna atual (controle manual).** As três ferramentas mostram que o mínimo indispensável para sair do controle manual é: (1) contatos e histórico centralizado, (2) funil visual de leads/clientes com estágios claros, (3) WhatsApp integrado — provavelmente o canal onde hoje a negociação já acontece de forma dispersa — e (4) relatórios básicos de pipeline para dar visibilidade à gestão. Isso está presente nas três referências e deve ser o núcleo do MVP do CRM próprio.

**Para o foco B2B de agora.** O Ploomes é a referência mais relevante: CPQ nativo (proposta com cálculo automático de preço/imposto/margem) e integração com estoque/tabela de preços resolvem exatamente o tipo de problema que uma fábrica que vende para distribuidor, atacado e varejo enfrenta — preços diferentes por canal, necessidade de checar estoque antes de confirmar pedido, e fluxo de aprovação quando o vendedor pede desconto. Esses são bons candidatos a funcionalidades de "Fase 1 avançada" do CRM próprio, mesmo que não entrem no primeiro MVP.

**Para a preparação do e-commerce.** O RD Station CRM é a referência mais relevante aqui: sua integração nativa com plataformas de loja virtual sincroniza em tempo real cadastro, carrinho abandonado, histórico de compra e status de pagamento — unificando o cliente de e-commerce dentro do mesmo CRM usado pelo time comercial B2B. A recomendação prática é desenhar o modelo de dados do CRM próprio (cliente, pedido, canal de origem) de forma agnóstica ao canal desde o início, para que quando o e-commerce for lançado não seja necessário migrar ou duplicar cadastro de clientes.

## Priorização sugerida para o CRM SrMATE

**Fase 1 — MVP B2B (resolve a dor atual):**
- Cadastro único de clientes/leads com histórico de interações.
- Funil de vendas com estágios personalizáveis para o processo comercial da fábrica.
- Integração com WhatsApp (ou ao menos registro manual rápido de conversas).
- Dashboard simples de pipeline (quantos leads em cada estágio, previsão de fechamento).

**Fase 2 — Aprofundamento B2B (inspirado no Ploomes):**
- Geração de propostas/pedidos com tabela de preço por canal (distribuidor/atacado/varejo).
- Checagem de disponibilidade de estoque no momento da proposta.
- Fluxo de aprovação de desconto.

**Fase 3 — Prontidão para e-commerce (inspirado no RD Station):**
- Modelo de dados de cliente/pedido compartilhado entre B2B e e-commerce.
- Sincronização de cadastro, carrinho e pedidos da loja virtual com o mesmo CRM.
- Segmentação de clientes por canal de origem (B2B x e-commerce) para campanhas e relatórios.

## Fontes consultadas nesta etapa

- [Agendor — Planos e preços](https://www.agendor.com.br/planos-precos)
- [Agendor — CRM para indústria](https://www.agendor.com.br/blog/crm-para-industria/)
- [RD Station — CRM para pequenas empresas](https://www.rdstation.com/produtos/crm/solucoes/para-pequenas-empresas/)
- [RD Station — Planos e preços do CRM](https://www.rdstation.com/planos/crm/)
- [RD Station — Integração Loja Virtual](https://www.rdstation.com/integracoes/loja-virtual/)
- [Ploomes — Como escolher um CRM para sua indústria](https://blog.ploomes.com/como-escolher-crm-para-industria/)
