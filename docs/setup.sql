
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'gerente', 'operador', 'vendedor');
CREATE TYPE public.pedido_status AS ENUM ('pendente','autorizado','separacao','conferencia','faturamento','concluido','cancelado');
CREATE TYPE public.pedido_origem AS ENUM ('balcao','pdv','vendedor','delivery');
CREATE TYPE public.pagamento_tipo AS ENUM ('pix','credito','debito','dinheiro','fiado','outro');
CREATE TYPE public.caixa_status AS ENUM ('aberto','fechado');
CREATE TYPE public.caixa_mov_tipo AS ENUM ('sangria','suprimento','venda','despesa');
CREATE TYPE public.estoque_mov_tipo AS ENUM ('entrada','saida','ajuste','perda');
CREATE TYPE public.nfe_status AS ENUM ('importado','conferindo','confirmado');
CREATE TYPE public.conta_tipo AS ENUM ('pagar','receber');
CREATE TYPE public.conta_status AS ENUM ('pendente','pago','atrasado','cancelado');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role IN ('admin','gerente','operador')) $$;

-- Profile policies
CREATE POLICY "profiles_select_all_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- user_roles policies
CREATE POLICY "roles_select_self_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles_admin_write" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Auto-create profile on signup + default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), NEW.email);
  -- Default role: operador
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'operador') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ CATEGORIAS ============
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cor TEXT DEFAULT '#3b82f6',
  icone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cat_select_auth" ON public.categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "cat_write_staff" ON public.categorias FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============ PRODUTOS ============
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  codigo_barras TEXT,
  nome TEXT NOT NULL,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  preco_venda NUMERIC(12,2) NOT NULL DEFAULT 0,
  preco_custo NUMERIC(12,2) DEFAULT 0,
  estoque NUMERIC(12,3) NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC(12,3) DEFAULT 0,
  unidade TEXT NOT NULL DEFAULT 'UN',
  imagem_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prod_select_auth" ON public.produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "prod_write_staff" ON public.produtos FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER produtos_touch BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX produtos_sku_idx ON public.produtos(sku);
CREATE INDEX produtos_barras_idx ON public.produtos(codigo_barras);

-- ============ CLIENTES ============
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  documento TEXT,
  endereco JSONB,
  limite_credito NUMERIC(12,2) DEFAULT 0,
  saldo_fiado NUMERIC(12,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cli_select_auth" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "cli_write_staff" ON public.clientes FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()) OR public.has_role(auth.uid(),'vendedor'))
  WITH CHECK (public.is_staff(auth.uid()) OR public.has_role(auth.uid(),'vendedor'));
CREATE TRIGGER clientes_touch BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ PEDIDOS ============
CREATE SEQUENCE public.pedidos_numero_seq START 1000;
CREATE TABLE public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE DEFAULT ('P' || lpad(nextval('public.pedidos_numero_seq')::text, 5, '0')),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  vendedor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  operador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  origem public.pedido_origem NOT NULL DEFAULT 'balcao',
  status public.pedido_status NOT NULL DEFAULT 'pendente',
  pagamento public.pagamento_tipo,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- Vendedor vê só os próprios; staff vê tudo
CREATE POLICY "ped_select_scope" ON public.pedidos FOR SELECT TO authenticated USING (
  public.is_staff(auth.uid()) OR vendedor_id = auth.uid()
);
CREATE POLICY "ped_insert_scope" ON public.pedidos FOR INSERT TO authenticated WITH CHECK (
  public.is_staff(auth.uid()) OR (public.has_role(auth.uid(),'vendedor') AND vendedor_id = auth.uid())
);
CREATE POLICY "ped_update_scope" ON public.pedidos FOR UPDATE TO authenticated USING (
  public.is_staff(auth.uid()) OR (public.has_role(auth.uid(),'vendedor') AND vendedor_id = auth.uid() AND status IN ('pendente'))
);
CREATE POLICY "ped_delete_admin" ON public.pedidos FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(),'admin')
);

CREATE TRIGGER pedidos_touch BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX pedidos_status_idx ON public.pedidos(status);
CREATE INDEX pedidos_vendedor_idx ON public.pedidos(vendedor_id);
CREATE INDEX pedidos_created_idx ON public.pedidos(created_at DESC);

-- Itens
CREATE TABLE public.pedido_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  qtd NUMERIC(12,3) NOT NULL DEFAULT 1,
  preco_unit NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pi_select_scope" ON public.pedido_itens FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id AND (public.is_staff(auth.uid()) OR p.vendedor_id = auth.uid()))
);
CREATE POLICY "pi_write_scope" ON public.pedido_itens FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id AND (public.is_staff(auth.uid()) OR p.vendedor_id = auth.uid()))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_id AND (public.is_staff(auth.uid()) OR p.vendedor_id = auth.uid()))
);

-- ============ CAIXA ============
CREATE TABLE public.caixa_sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id UUID NOT NULL REFERENCES auth.users(id),
  abertura TIMESTAMPTZ NOT NULL DEFAULT now(),
  fechamento TIMESTAMPTZ,
  valor_inicial NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_final NUMERIC(12,2),
  status public.caixa_status NOT NULL DEFAULT 'aberto',
  observacoes TEXT
);
ALTER TABLE public.caixa_sessoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cx_select_staff" ON public.caixa_sessoes FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "cx_write_staff" ON public.caixa_sessoes FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.caixa_movimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id UUID NOT NULL REFERENCES public.caixa_sessoes(id) ON DELETE CASCADE,
  tipo public.caixa_mov_tipo NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.caixa_movimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cxm_select_staff" ON public.caixa_movimentos FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "cxm_write_staff" ON public.caixa_movimentos FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============ DESPESAS / CONTAS ============
CREATE TABLE public.despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  categoria TEXT,
  vencimento DATE,
  pago BOOLEAN NOT NULL DEFAULT false,
  pago_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "desp_staff" ON public.despesas FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.contas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo public.conta_tipo NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  vencimento DATE NOT NULL,
  status public.conta_status NOT NULL DEFAULT 'pendente',
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ct_staff" ON public.contas FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============ NFE ============
CREATE TABLE public.nfe_entradas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT,
  chave TEXT,
  fornecedor TEXT,
  valor_total NUMERIC(12,2) DEFAULT 0,
  xml_url TEXT,
  status public.nfe_status NOT NULL DEFAULT 'importado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmado_em TIMESTAMPTZ,
  confirmado_por UUID REFERENCES auth.users(id)
);
ALTER TABLE public.nfe_entradas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nfe_staff" ON public.nfe_entradas FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.nfe_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nfe_id UUID NOT NULL REFERENCES public.nfe_entradas(id) ON DELETE CASCADE,
  codigo_xml TEXT,
  ean_xml TEXT,
  descricao_xml TEXT NOT NULL,
  qtd NUMERIC(12,3) NOT NULL DEFAULT 0,
  valor_unit NUMERIC(12,4) NOT NULL DEFAULT 0,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  unidade TEXT,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  divergencia TEXT
);
ALTER TABLE public.nfe_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nfei_staff" ON public.nfe_itens FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============ ESTOQUE MOV ============
CREATE TABLE public.estoque_movimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  tipo public.estoque_mov_tipo NOT NULL,
  qtd NUMERIC(12,3) NOT NULL,
  motivo TEXT,
  referencia_id UUID,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.estoque_movimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "em_select_staff" ON public.estoque_movimentos FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "em_write_staff" ON public.estoque_movimentos FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============ FIDELIDADE ============
CREATE TABLE public.fidelidade_pontos (
  cliente_id UUID PRIMARY KEY REFERENCES public.clientes(id) ON DELETE CASCADE,
  pontos INTEGER NOT NULL DEFAULT 0,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fidelidade_pontos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fp_staff" ON public.fidelidade_pontos FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============ AUDIT LOGS ============
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL,
  entidade_id UUID,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_select_admin" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente'));
CREATE POLICY "audit_insert_any_auth" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedido_itens;

-- Fix search_path on trigger functions
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Revoke execute from anon/public on internal security definer functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public, authenticated;
-- Keep grant to authenticated for has_role/is_staff so RLS works
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

-- Seed admin user admin@loja.com / admin12
DO $$
DECLARE
  v_user_id uuid;
  v_existing uuid;
BEGIN
  SELECT id INTO v_existing FROM auth.users WHERE email = 'admin@loja.com' LIMIT 1;

  IF v_existing IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated',
      'admin@loja.com',
      crypt('admin12', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"nome":"Administrador"}'::jsonb,
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'admin@loja.com', 'email_verified', true),
      'email', v_user_id::text, now(), now(), now()
    );
  ELSE
    v_user_id := v_existing;
    -- Reset password to admin12
    UPDATE auth.users
       SET encrypted_password = crypt('admin12', gen_salt('bf')),
           email_confirmed_at = COALESCE(email_confirmed_at, now()),
           updated_at = now()
     WHERE id = v_user_id;
  END IF;

  INSERT INTO public.profiles (id, nome, email)
  VALUES (v_user_id, 'Administrador', 'admin@loja.com')
  ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, email = EXCLUDED.email;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;

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

CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  prefix text NOT NULL UNIQUE,
  key_hash text NOT NULL UNIQUE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_admin_all" ON public.api_keys
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX api_keys_prefix_idx ON public.api_keys (prefix);
CREATE TABLE public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_chave TEXT NOT NULL,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_images_nome_chave ON public.product_images (nome_chave);
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY pimg_select_auth ON public.product_images FOR SELECT TO authenticated USING (true);
CREATE POLICY pimg_write_staff ON public.product_images FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));-- App settings (singleton row para configurações globais do PDV)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id text PRIMARY KEY DEFAULT 'main',
  pdv_ativo boolean NOT NULL DEFAULT true,
  metodos_pagamento jsonb NOT NULL DEFAULT '{"pix":true,"credito":true,"debito":true,"dinheiro":true,"fiado":true}'::jsonb,
  pix_qr_url text,
  pix_chave text,
  empresa_razao text,
  empresa_cnpj text,
  empresa_telefone text,
  empresa_email text,
  empresa_endereco text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

INSERT INTO public.app_settings (id) VALUES ('main') ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_settings_select_auth ON public.app_settings;
CREATE POLICY app_settings_select_auth ON public.app_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS app_settings_write_staff ON public.app_settings;
CREATE POLICY app_settings_write_staff ON public.app_settings FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE OR REPLACE TRIGGER trg_app_settings_touch
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Bucket público para o QR Code PIX
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdv-assets', 'pdv-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "pdv_assets_public_read" ON storage.objects;
CREATE POLICY "pdv_assets_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'pdv-assets');

DROP POLICY IF EXISTS "pdv_assets_staff_write" ON storage.objects;
CREATE POLICY "pdv_assets_staff_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pdv-assets' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "pdv_assets_staff_update" ON storage.objects;
CREATE POLICY "pdv_assets_staff_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'pdv-assets' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "pdv_assets_staff_delete" ON storage.objects;
CREATE POLICY "pdv_assets_staff_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'pdv-assets' AND public.is_staff(auth.uid()));
-- 1) clientes: novos campos
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS nome_fantasia text,
  ADD COLUMN IF NOT EXISTS ie text,
  ADD COLUMN IF NOT EXISTS tipo_pessoa text NOT NULL DEFAULT 'PF',
  ADD COLUMN IF NOT EXISTS vendedor_id uuid;

-- 2) enum pagamento: adicionar valores novos (idempotente)
DO $$ BEGIN
  ALTER TYPE public.pagamento ADD VALUE IF NOT EXISTS 'pix';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.pagamento ADD VALUE IF NOT EXISTS 'dinheiro';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.pagamento ADD VALUE IF NOT EXISTS 'debito';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.pagamento ADD VALUE IF NOT EXISTS 'credito';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.pagamento ADD VALUE IF NOT EXISTS 'fiado';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.pagamento ADD VALUE IF NOT EXISTS 'promissoria';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.pagamento ADD VALUE IF NOT EXISTS 'cheque';
EXCEPTION WHEN others THEN NULL; END $$;

-- 3) enum pedido_status: adicionar faturamento
DO $$ BEGIN
  ALTER TYPE public.pedido_status ADD VALUE IF NOT EXISTS 'faturamento';
EXCEPTION WHEN others THEN NULL; END $$;

-- 4) faturamentos
CREATE SEQUENCE IF NOT EXISTS public.faturamentos_numero_seq;

CREATE TABLE IF NOT EXISTS public.faturamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL DEFAULT ('F' || lpad(nextval('faturamentos_numero_seq')::text, 5, '0')),
  total numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.faturamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fat_staff ON public.faturamentos;
CREATE POLICY fat_staff ON public.faturamentos
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.faturamento_pedidos (
  faturamento_id uuid NOT NULL REFERENCES public.faturamentos(id) ON DELETE CASCADE,
  pedido_id uuid NOT NULL,
  PRIMARY KEY (faturamento_id, pedido_id)
);

ALTER TABLE public.faturamento_pedidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fatp_staff ON public.faturamento_pedidos;
CREATE POLICY fatp_staff ON public.faturamento_pedidos
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));
ALTER TYPE public.pagamento_tipo ADD VALUE IF NOT EXISTS 'nota_promissoria';
ALTER TYPE public.pagamento_tipo ADD VALUE IF NOT EXISTS 'cheque';
CREATE UNIQUE INDEX IF NOT EXISTS ux_produtos_codigo_barras
  ON public.produtos(codigo_barras) WHERE codigo_barras IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.gtin_global (
  gtin TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  marca TEXT,
  categoria_sugerida TEXT,
  unidade TEXT,
  imagem_url TEXT,
  fonte TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.gtin_global TO authenticated;
GRANT ALL ON public.gtin_global TO service_role;

ALTER TABLE public.gtin_global ENABLE ROW LEVEL SECURITY;

CREATE POLICY gtin_read_auth ON public.gtin_global
  FOR SELECT TO authenticated USING (true);

-- 1) Novo valor de enum para status "encerrado"
ALTER TYPE public.pedido_status ADD VALUE IF NOT EXISTS 'encerrado';

-- 2) Colunas de pagamento em pedidos
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS total_pago numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS restante   numeric NOT NULL DEFAULT 0;

-- 3) Multi-embalagem em produtos
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS embalagens jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 4) Embalagem em itens do pedido
ALTER TABLE public.pedido_itens
  ADD COLUMN IF NOT EXISTS embalagem_tipo text NOT NULL DEFAULT 'UN',
  ADD COLUMN IF NOT EXISTS qtd_un_por_embalagem numeric NOT NULL DEFAULT 1;

-- 5) Tabela pedido_pagamentos
CREATE TABLE IF NOT EXISTS public.pedido_pagamentos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id   uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  forma       text NOT NULL,
  condicao    text,
  vencimento  date,
  valor       numeric NOT NULL DEFAULT 0,
  observacao  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid
);

CREATE INDEX IF NOT EXISTS pedido_pagamentos_pedido_idx
  ON public.pedido_pagamentos (pedido_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedido_pagamentos TO authenticated;
GRANT ALL ON public.pedido_pagamentos TO service_role;

ALTER TABLE public.pedido_pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pp_select_scope" ON public.pedido_pagamentos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = pedido_pagamentos.pedido_id
      AND (public.is_staff(auth.uid()) OR p.vendedor_id = auth.uid())
  ));

CREATE POLICY "pp_write_scope" ON public.pedido_pagamentos
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = pedido_pagamentos.pedido_id
      AND (public.is_staff(auth.uid()) OR p.vendedor_id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = pedido_pagamentos.pedido_id
      AND (public.is_staff(auth.uid()) OR p.vendedor_id = auth.uid())
  ));

-- 6) Trigger que recalcula total_pago e restante do pedido
CREATE OR REPLACE FUNCTION public.recalc_pedido_pagamentos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido_id uuid;
  v_total numeric;
  v_pago  numeric;
BEGIN
  v_pedido_id := COALESCE(NEW.pedido_id, OLD.pedido_id);
  SELECT COALESCE(SUM(valor), 0) INTO v_pago
    FROM public.pedido_pagamentos WHERE pedido_id = v_pedido_id;
  SELECT total INTO v_total FROM public.pedidos WHERE id = v_pedido_id;
  UPDATE public.pedidos
     SET total_pago = v_pago,
         restante   = GREATEST(0, COALESCE(v_total, 0) - v_pago),
         updated_at = now()
   WHERE id = v_pedido_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_pedido_pagamentos ON public.pedido_pagamentos;
CREATE TRIGGER trg_recalc_pedido_pagamentos
AFTER INSERT OR UPDATE OR DELETE ON public.pedido_pagamentos
FOR EACH ROW EXECUTE FUNCTION public.recalc_pedido_pagamentos();

-- 7) Também recalcular quando o total do pedido muda
CREATE OR REPLACE FUNCTION public.recalc_pedido_restante()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.total IS DISTINCT FROM OLD.total THEN
    NEW.restante := GREATEST(0, COALESCE(NEW.total, 0) - COALESCE(NEW.total_pago, 0));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_pedido_restante ON public.pedidos;
CREATE TRIGGER trg_recalc_pedido_restante
BEFORE UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.recalc_pedido_restante();

REVOKE EXECUTE ON FUNCTION public.recalc_pedido_pagamentos() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_pedido_restante() FROM PUBLIC, anon, authenticated;

-- 1) Peso por unidade no produto
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS peso_kg numeric NOT NULL DEFAULT 0;

-- 2) tenant_slug no perfil
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tenant_slug text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_tenant_slug_uidx
  ON public.profiles(tenant_slug) WHERE tenant_slug IS NOT NULL;

-- 3) Tabela tenants
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (length(slug) BETWEEN 4 AND 12 AND slug ~ '^[a-z0-9]+$'),
  nome text,
  supabase_url text NOT NULL,
  supabase_anon_key text NOT NULL,
  user_id uuid NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenants_admin_all ON public.tenants;
CREATE POLICY tenants_admin_all ON public.tenants
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS tenants_owner_select ON public.tenants;
CREATE POLICY tenants_owner_select ON public.tenants
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 4) Permissões por menu
CREATE TABLE IF NOT EXISTS public.user_permissions (
  user_id uuid NOT NULL,
  menu text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, menu)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS uperm_admin_all ON public.user_permissions;
CREATE POLICY uperm_admin_all ON public.user_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS uperm_self_select ON public.user_permissions;
CREATE POLICY uperm_self_select ON public.user_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 1. FORNECEDORES
CREATE TABLE public.fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text NOT NULL,
  nome_fantasia text,
  cpf_cnpj text,
  ie text,
  cidade text,
  estado text,
  telefone text,
  email text,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO authenticated;
GRANT ALL ON public.fornecedores TO service_role;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY forn_select_auth ON public.fornecedores FOR SELECT TO authenticated USING (true);
CREATE POLICY forn_write_staff ON public.fornecedores FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_fornecedores_updated BEFORE UPDATE ON public.fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. PATRIMONIO
CREATE TABLE public.patrimonio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  categoria text,
  valor numeric NOT NULL DEFAULT 0,
  data_aquisicao date,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patrimonio TO authenticated;
GRANT ALL ON public.patrimonio TO service_role;
ALTER TABLE public.patrimonio ENABLE ROW LEVEL SECURITY;
CREATE POLICY patr_staff ON public.patrimonio FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_patrimonio_updated BEFORE UPDATE ON public.patrimonio
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. PRODUTOS: fornecedor + flag fiscal
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tem_nota_fiscal boolean NOT NULL DEFAULT false;

-- 4. CONTAS: anexo + categoria
ALTER TABLE public.contas
  ADD COLUMN IF NOT EXISTS anexo_url text,
  ADD COLUMN IF NOT EXISTS categoria text;

-- 5. APP SETTINGS: IE
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS empresa_ie text;

-- 6. PEDIDOS: dados de NF-e emitida
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS nfe_numero text,
  ADD COLUMN IF NOT EXISTS nfe_chave text,
  ADD COLUMN IF NOT EXISTS nfe_emitida_em timestamptz;

-- 7. TRIGGER de baixa/estorno automático de estoque por pedido_itens
CREATE OR REPLACE FUNCTION public.apply_estoque_from_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_qtd_un numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT status::text INTO v_status FROM public.pedidos WHERE id = NEW.pedido_id;
    IF v_status IN ('cancelado') THEN
      RETURN NEW;
    END IF;
    v_qtd_un := COALESCE(NEW.qtd, 0) * COALESCE(NEW.qtd_un_por_embalagem, 1);
    UPDATE public.produtos
       SET estoque = estoque - v_qtd_un, updated_at = now()
     WHERE id = NEW.produto_id;
    INSERT INTO public.estoque_movimentos (produto_id, tipo, qtd, motivo, referencia_id)
      VALUES (NEW.produto_id, 'saida', v_qtd_un, 'Pedido', NEW.pedido_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT status::text INTO v_status FROM public.pedidos WHERE id = OLD.pedido_id;
    IF v_status IN ('cancelado') THEN
      RETURN OLD;
    END IF;
    v_qtd_un := COALESCE(OLD.qtd, 0) * COALESCE(OLD.qtd_un_por_embalagem, 1);
    UPDATE public.produtos
       SET estoque = estoque + v_qtd_un, updated_at = now()
     WHERE id = OLD.produto_id;
    INSERT INTO public.estoque_movimentos (produto_id, tipo, qtd, motivo, referencia_id)
      VALUES (OLD.produto_id, 'entrada', v_qtd_un, 'Estorno pedido', OLD.pedido_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_pedido_itens_estoque ON public.pedido_itens;
CREATE TRIGGER trg_pedido_itens_estoque
  AFTER INSERT OR DELETE ON public.pedido_itens
  FOR EACH ROW EXECUTE FUNCTION public.apply_estoque_from_item();

-- 8. TRIGGER de cancelamento de pedido devolve estoque
CREATE OR REPLACE FUNCTION public.handle_pedido_cancelamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_qtd_un numeric;
BEGIN
  IF NEW.status::text = 'cancelado' AND OLD.status::text <> 'cancelado' THEN
    FOR r IN SELECT produto_id, qtd, qtd_un_por_embalagem FROM public.pedido_itens WHERE pedido_id = NEW.id LOOP
      v_qtd_un := COALESCE(r.qtd, 0) * COALESCE(r.qtd_un_por_embalagem, 1);
      UPDATE public.produtos SET estoque = estoque + v_qtd_un, updated_at = now() WHERE id = r.produto_id;
      INSERT INTO public.estoque_movimentos (produto_id, tipo, qtd, motivo, referencia_id)
        VALUES (r.produto_id, 'entrada', v_qtd_un, 'Cancelamento pedido', NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_pedido_cancelamento ON public.pedidos;
CREATE TRIGGER trg_pedido_cancelamento
  AFTER UPDATE OF status ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.handle_pedido_cancelamento();

REVOKE EXECUTE ON FUNCTION public.apply_estoque_from_item() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_pedido_cancelamento() FROM PUBLIC, anon, authenticated;
