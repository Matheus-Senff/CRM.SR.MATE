# Protótipo do CRM SrMATE — Fase 1 e Fase 2

Elaborado em 04/08/2026. Protótipo interativo (HTML/CSS/JS, front-end apenas, dados fictícios em memória) construído com base no benchmark de CRMs (Agendor, RD Station CRM, Ploomes) e na decisão de escopo: atender agora as Fases 1 e 2, deixando a Fase 3 (e-commerce) para depois.

Arquivo do protótipo: `crm-srmate-prototipo.html` (abrir diretamente no navegador).

## Telas incluídas

- **Visão geral (Dashboard):** KPIs (leads ativos, propostas em aberto, valor em pipeline, taxa de conversão), gráfico de funil por estágio, gráfico de pipeline por canal, atividade recente e resumo de aprovações pendentes.
- **Clientes & Leads:** cadastro único com histórico de interações (WhatsApp, ligação, e-mail, visita), filtros por canal/estágio/busca, modal de detalhe do cliente com linha do tempo e registro de nova interação.
- **Funil de vendas (kanban):** colunas por estágio (Novo Lead → Contato Feito → Proposta Enviada → Negociação → Fechado Ganho / Fechado Perdido), com drag-and-drop dos cartões.
- **Propostas (CPQ):** criação de proposta com seleção de cliente (define automaticamente o canal/tabela de preço), adição de produtos e quantidades, cálculo automático de subtotal/desconto/total, checagem de disponibilidade de estoque por item, e aplicação da regra de aprovação de desconto.
- **Aprovações:** fila de propostas com desconto entre 5% e 15% aguardando decisão do gestor (aprovar/rejeitar).
- **Relatórios:** pipeline por canal, taxa de conversão ganho x perdido, ticket médio, tabela resumo por estágio.

## Regras de negócio simuladas

- Tabela de preço por canal (Distribuidor / Atacado / Varejo) — 4 produtos de exemplo (Erva-Mate Tradicional, Composta, Premium, Kit Degustação).
- Estoque mock por produto, com um produto propositalmente com estoque baixo (Kit Degustação, 120 un.) para demonstrar o alerta de estoque insuficiente.
- Regra de desconto: até 5% aprovação automática; 5%–15% exige aprovação do gestor; acima de 15% bloqueado (precisa negociação fora do fluxo padrão).

## Limitações conhecidas (é um protótipo, não o sistema final)

- Sem backend/banco de dados — todos os dados voltam ao estado inicial se a página for recarregada.
- Sem autenticação/perfis de usuário.
- Sem integração real com WhatsApp, ERP ou estoque — os campos e alertas são simulados para validar o fluxo.
- Fase 3 (e-commerce) não foi implementada; o modelo de dados de cliente/pedido foi pensado para comportar essa extensão depois (ver `benchmark-funcionalidades-crm.md`).

## Próximos passos possíveis
- Validar o protótipo com o time comercial da fábrica (fluxo de funil, propostas e aprovação de desconto fazem sentido no dia a dia?).
- Definir se o caminho será construir esse CRM do zero (com um backend real) ou configurar um dos CRMs de mercado com essas regras.
- Planejar a Fase 3 (e-commerce) quando o lançamento estiver mais próximo.
