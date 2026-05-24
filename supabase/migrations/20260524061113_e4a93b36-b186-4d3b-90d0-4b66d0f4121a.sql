
-- Seed vendedor user (idempotent)
DO $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE email = 'vendedor@loja.com';
  IF v_id IS NULL THEN
    v_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      'vendedor@loja.com', crypt('vendedor12', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('nome','Vendedor Demo'), now(), now(),
      '', '', '', ''
    );
    INSERT INTO public.profiles (id, nome, email) VALUES (v_id, 'Vendedor Demo', 'vendedor@loja.com')
      ON CONFLICT (id) DO NOTHING;
    DELETE FROM public.user_roles WHERE user_id = v_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_id, 'vendedor');
  END IF;
END $$;

-- Categorias
INSERT INTO public.categorias (nome, cor) VALUES
  ('Bebidas', '#3b82f6'),
  ('Cervejas', '#f59e0b'),
  ('Destilados', '#8b5cf6'),
  ('Snacks', '#ef4444'),
  ('Tabacaria', '#64748b'),
  ('Gelados', '#06b6d4')
ON CONFLICT DO NOTHING;

-- Produtos (idempotent por sku)
INSERT INTO public.produtos (sku, nome, codigo_barras, unidade, preco_custo, preco_venda, estoque, estoque_minimo, categoria_id) VALUES
  ('COCA-2L', 'Coca-Cola 2L', '7894900011517', 'UN', 6.50, 11.90, 48, 12, (SELECT id FROM public.categorias WHERE nome='Bebidas' LIMIT 1)),
  ('GUARA-2L', 'Guaraná Antarctica 2L', '7891991010924', 'UN', 5.20, 9.90, 30, 10, (SELECT id FROM public.categorias WHERE nome='Bebidas' LIMIT 1)),
  ('AGUA-500', 'Água Mineral 500ml', '7891910000147', 'UN', 1.20, 3.50, 120, 30, (SELECT id FROM public.categorias WHERE nome='Bebidas' LIMIT 1)),
  ('HEINEKEN-LN', 'Heineken Long Neck 330ml', '7896045506842', 'UN', 4.20, 8.90, 96, 24, (SELECT id FROM public.categorias WHERE nome='Cervejas' LIMIT 1)),
  ('SKOL-LATA', 'Skol Lata 350ml', '7891991002301', 'UN', 2.80, 4.90, 144, 48, (SELECT id FROM public.categorias WHERE nome='Cervejas' LIMIT 1)),
  ('BRAHMA-600', 'Brahma 600ml', '7891991010054', 'UN', 5.00, 9.50, 36, 12, (SELECT id FROM public.categorias WHERE nome='Cervejas' LIMIT 1)),
  ('SMIRNOFF-1L', 'Vodka Smirnoff 1L', '7893218002576', 'UN', 28.00, 49.90, 8, 4, (SELECT id FROM public.categorias WHERE nome='Destilados' LIMIT 1)),
  ('JW-RED-1L', 'Whisky JW Red 1L', '5000267023625', 'UN', 78.00, 129.90, 4, 2, (SELECT id FROM public.categorias WHERE nome='Destilados' LIMIT 1)),
  ('DORITOS-150', 'Doritos Queijo Nacho 150g', '7892840244033', 'UN', 6.50, 11.50, 60, 20, (SELECT id FROM public.categorias WHERE nome='Snacks' LIMIT 1)),
  ('LAYS-90', 'Lays Original 90g', '7892840246495', 'UN', 4.20, 7.90, 80, 24, (SELECT id FROM public.categorias WHERE nome='Snacks' LIMIT 1)),
  ('MARLBORO-RED', 'Marlboro Red', '7896004001234', 'MC', 6.00, 11.00, 50, 15, (SELECT id FROM public.categorias WHERE nome='Tabacaria' LIMIT 1)),
  ('SORVETE-MAGNUM', 'Sorvete Magnum Chocolate', '7891150064072', 'UN', 5.50, 11.90, 24, 8, (SELECT id FROM public.categorias WHERE nome='Gelados' LIMIT 1))
ON CONFLICT (sku) DO NOTHING;

-- Clientes
INSERT INTO public.clientes (nome, telefone, email, documento) VALUES
  ('Cliente Balcão', NULL, NULL, NULL),
  ('João Silva', '(11) 98765-4321', 'joao@exemplo.com', '123.456.789-00'),
  ('Maria Santos', '(11) 91234-5678', 'maria@exemplo.com', '987.654.321-00')
ON CONFLICT DO NOTHING;
