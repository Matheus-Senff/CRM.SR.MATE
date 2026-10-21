-- Dados de exemplo para desenvolvimento local (os mesmos do protótipo).
-- Em produção o catálogo e o estoque vêm do Bling; só os preços por canal
-- e o pedido mínimo são cadastrados no CRM.

insert into public.produtos (id, sku, nome, estoque, quantidade_minima) values
  ('00000000-0000-0000-0000-000000000001', 'EM-TRAD-1KG', 'Erva-Mate Tradicional 1kg', 4200, 10),
  ('00000000-0000-0000-0000-000000000002', 'EM-HORT-500', 'Erva-Mate Composta Hortelã 500g', 1800, 10),
  ('00000000-0000-0000-0000-000000000003', 'EM-PREM-1KG', 'Erva-Mate Premium Selecionada 1kg', 650, 5),
  ('00000000-0000-0000-0000-000000000004', 'KIT-DEG-3X250', 'Kit Degustação 3x250g', 120, 1);

insert into public.precos (produto_id, canal, preco) values
  ('00000000-0000-0000-0000-000000000001', 'distribuidor', 14.90),
  ('00000000-0000-0000-0000-000000000001', 'atacado', 17.90),
  ('00000000-0000-0000-0000-000000000001', 'varejo', 22.90),
  ('00000000-0000-0000-0000-000000000002', 'distribuidor', 9.50),
  ('00000000-0000-0000-0000-000000000002', 'atacado', 11.90),
  ('00000000-0000-0000-0000-000000000002', 'varejo', 15.90),
  ('00000000-0000-0000-0000-000000000003', 'distribuidor', 21.90),
  ('00000000-0000-0000-0000-000000000003', 'atacado', 25.90),
  ('00000000-0000-0000-0000-000000000003', 'varejo', 32.90),
  ('00000000-0000-0000-0000-000000000004', 'distribuidor', 28.00),
  ('00000000-0000-0000-0000-000000000004', 'atacado', 34.00),
  ('00000000-0000-0000-0000-000000000004', 'varejo', 45.00);
