-- =====================================================================
-- Quick OS — Setup completo do banco (idempotente)
-- Cole este arquivo INTEIRO no SQL Editor de um projeto Supabase novo
-- e clique em RUN. Pode ser executado várias vezes sem erro.
--
-- Cria: extensions, enums, todas as tabelas, sequences, functions,
-- triggers, GRANTs, policies RLS, bucket de storage e usuário admin
-- principal (admin@loja.com / admin12).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- ENUMS ----------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','gerente','operador','vendedor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pedido_status AS ENUM
    ('pendente','autorizado','separacao','conferencia','faturamento','concluido','cancelado','encerrado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pedido_origem AS ENUM ('balcao','delivery','pdv');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.caixa_status AS ENUM ('aberto','fechado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.conta_status AS ENUM ('pendente','pago','vencido','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.conta_tipo AS ENUM ('receber','pagar');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.nfe_status AS ENUM ('importado','confirmado','divergente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.estoque_mov_tipo AS ENUM ('entrada','saida','ajuste','perda');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.caixa_mov_tipo AS ENUM ('suprimento','sangria','venda','outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- SEQUENCES -----------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.pedidos_numero_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.faturamentos_numero_seq START 1;

-- ---------- FUNCTIONS (idempotentes) ---------------------------------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role IN ('admin','gerente','operador'))
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'operador')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

-- ---------- TABLES ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  nome text NOT NULL,
  email text,
  telefone text,
  avatar_url text,
  tenant_slug text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_tenant_slug_uidx ON public.profiles(tenant_slug) WHERE tenant_slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE TABLE IF NOT EXISTS public.user_permissions (
  user_id uuid NOT NULL,
  menu text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, menu)
);

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

CREATE TABLE IF NOT EXISTS public.categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cor text DEFAULT '#3b82f6',
  icone text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL,
  nome text NOT NULL,
  codigo_barras text,
  categoria_id uuid,
  preco_venda numeric NOT NULL DEFAULT 0,
  preco_custo numeric DEFAULT 0,
  estoque numeric NOT NULL DEFAULT 0,
  estoque_minimo numeric DEFAULT 0,
  unidade text NOT NULL DEFAULT 'UN',
  peso_kg numeric NOT NULL DEFAULT 0,
  embalagens jsonb NOT NULL DEFAULT '[]'::jsonb,
  imagem_url text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  nome_fantasia text,
  documento text,
  ie text,
  tipo_pessoa text NOT NULL DEFAULT 'PF',
  email text,
  telefone text,
  endereco jsonb,
  observacoes text,
  vendedor_id uuid,
  limite_credito numeric DEFAULT 0,
  saldo_fiado numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL DEFAULT ('P'||lpad(nextval('public.pedidos_numero_seq')::text,5,'0')),
  cliente_id uuid,
  vendedor_id uuid,
  operador_id uuid,
  origem public.pedido_origem NOT NULL DEFAULT 'balcao',
  status public.pedido_status NOT NULL DEFAULT 'pendente',
  pagamento text,
  subtotal numeric NOT NULL DEFAULT 0,
  desconto numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  total_pago numeric NOT NULL DEFAULT 0,
  restante numeric NOT NULL DEFAULT 0,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pedido_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL,
  produto_id uuid NOT NULL,
  qtd numeric NOT NULL DEFAULT 1,
  preco_unit numeric NOT NULL DEFAULT 0,
  desconto numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  embalagem_tipo text NOT NULL DEFAULT 'UN',
  qtd_un_por_embalagem numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pedido_pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL,
  forma text NOT NULL,
  condicao text,
  vencimento date,
  valor numeric NOT NULL DEFAULT 0,
  observacao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_settings (
  id text PRIMARY KEY DEFAULT 'main',
  empresa_razao text,
  empresa_cnpj text,
  empresa_endereco text,
  empresa_telefone text,
  empresa_email text,
  pix_chave text,
  pix_qr_url text,
  pdv_ativo boolean NOT NULL DEFAULT true,
  metodos_pagamento jsonb NOT NULL DEFAULT '{"pix":true,"dinheiro":true,"debito":true,"credito":true,"fiado":true}'::jsonb,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.app_settings(id) VALUES ('main') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.caixa_sessoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id uuid NOT NULL,
  abertura timestamptz NOT NULL DEFAULT now(),
  fechamento timestamptz,
  valor_inicial numeric NOT NULL DEFAULT 0,
  valor_final numeric,
  status public.caixa_status NOT NULL DEFAULT 'aberto',
  observacoes text
);

CREATE TABLE IF NOT EXISTS public.caixa_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id uuid NOT NULL,
  tipo public.caixa_mov_tipo NOT NULL,
  valor numeric NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  valor numeric NOT NULL,
  vencimento date NOT NULL,
  tipo public.conta_tipo NOT NULL,
  status public.conta_status NOT NULL DEFAULT 'pendente',
  cliente_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.despesas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao text NOT NULL,
  valor numeric NOT NULL,
  categoria text,
  vencimento date,
  pago boolean NOT NULL DEFAULT false,
  pago_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.estoque_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL,
  tipo public.estoque_mov_tipo NOT NULL,
  qtd numeric NOT NULL,
  motivo text,
  referencia_id uuid,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.faturamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL DEFAULT ('F'||lpad(nextval('public.faturamentos_numero_seq')::text,5,'0')),
  total numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.faturamento_pedidos (
  faturamento_id uuid NOT NULL,
  pedido_id uuid NOT NULL,
  PRIMARY KEY (faturamento_id, pedido_id)
);

CREATE TABLE IF NOT EXISTS public.fidelidade_pontos (
  cliente_id uuid PRIMARY KEY,
  pontos integer NOT NULL DEFAULT 0,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nfe_entradas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text, chave text, fornecedor text,
  valor_total numeric DEFAULT 0,
  xml_url text,
  status public.nfe_status NOT NULL DEFAULT 'importado',
  confirmado_por uuid, confirmado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nfe_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nfe_id uuid NOT NULL,
  codigo_xml text, ean_xml text, descricao_xml text NOT NULL,
  qtd numeric NOT NULL DEFAULT 0,
  valor_unit numeric NOT NULL DEFAULT 0,
  valor_total numeric NOT NULL DEFAULT 0,
  unidade text, produto_id uuid, divergencia text
);

CREATE TABLE IF NOT EXISTS public.gtin_global (
  gtin text PRIMARY KEY,
  nome text NOT NULL,
  marca text, unidade text, categoria_sugerida text,
  imagem_url text, fonte text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL, nome_chave text NOT NULL,
  url text NOT NULL, created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL, prefix text NOT NULL, key_hash text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid, last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acao text NOT NULL, entidade text NOT NULL, entidade_id uuid,
  user_id uuid, payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------- TRIGGERS -------------------------------------------------
DROP TRIGGER IF EXISTS produtos_touch ON public.produtos;
CREATE TRIGGER produtos_touch BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS clientes_touch ON public.clientes;
CREATE TRIGGER clientes_touch BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS pedidos_touch ON public.pedidos;
CREATE TRIGGER pedidos_touch BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS profiles_touch ON public.profiles;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- GRANTS ---------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.profiles, public.user_roles, public.user_permissions, public.tenants,
  public.categorias, public.produtos, public.clientes, public.pedidos,
  public.pedido_itens, public.pedido_pagamentos, public.app_settings,
  public.caixa_sessoes, public.caixa_movimentos, public.contas, public.despesas,
  public.estoque_movimentos, public.faturamentos, public.faturamento_pedidos,
  public.fidelidade_pontos, public.nfe_entradas, public.nfe_itens,
  public.gtin_global, public.product_images, public.api_keys, public.audit_logs
TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- ---------- RLS ------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_movimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_movimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faturamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faturamento_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fidelidade_pontos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe_entradas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gtin_global ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper macro de DROP/CREATE policy via DO block
DO $$ BEGIN
  -- profiles
  EXECUTE 'DROP POLICY IF EXISTS profiles_select_all_auth ON public.profiles';
  EXECUTE 'CREATE POLICY profiles_select_all_auth ON public.profiles FOR SELECT TO authenticated USING (true)';
  EXECUTE 'DROP POLICY IF EXISTS profiles_update_self ON public.profiles';
  EXECUTE 'CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid())';
  EXECUTE 'DROP POLICY IF EXISTS profiles_admin_all ON public.profiles';
  EXECUTE 'CREATE POLICY profiles_admin_all ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(),''admin'')) WITH CHECK (public.has_role(auth.uid(),''admin''))';

  -- user_roles
  EXECUTE 'DROP POLICY IF EXISTS roles_select_self_or_admin ON public.user_roles';
  EXECUTE 'CREATE POLICY roles_select_self_or_admin ON public.user_roles FOR SELECT TO authenticated USING ((user_id = auth.uid()) OR public.has_role(auth.uid(),''admin''))';
  EXECUTE 'DROP POLICY IF EXISTS roles_admin_write ON public.user_roles';
  EXECUTE 'CREATE POLICY roles_admin_write ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),''admin'')) WITH CHECK (public.has_role(auth.uid(),''admin''))';

  -- user_permissions
  EXECUTE 'DROP POLICY IF EXISTS uperm_self_select ON public.user_permissions';
  EXECUTE 'CREATE POLICY uperm_self_select ON public.user_permissions FOR SELECT TO authenticated USING (user_id = auth.uid())';
  EXECUTE 'DROP POLICY IF EXISTS uperm_admin_all ON public.user_permissions';
  EXECUTE 'CREATE POLICY uperm_admin_all ON public.user_permissions FOR ALL TO authenticated USING (public.has_role(auth.uid(),''admin'')) WITH CHECK (public.has_role(auth.uid(),''admin''))';

  -- tenants
  EXECUTE 'DROP POLICY IF EXISTS tenants_owner_select ON public.tenants';
  EXECUTE 'CREATE POLICY tenants_owner_select ON public.tenants FOR SELECT TO authenticated USING (user_id = auth.uid())';
  EXECUTE 'DROP POLICY IF EXISTS tenants_admin_all ON public.tenants';
  EXECUTE 'CREATE POLICY tenants_admin_all ON public.tenants FOR ALL TO authenticated USING (public.has_role(auth.uid(),''admin'')) WITH CHECK (public.has_role(auth.uid(),''admin''))';

  -- catalogo (leitura autenticada, escrita staff)
  EXECUTE 'DROP POLICY IF EXISTS cat_select_auth ON public.categorias';
  EXECUTE 'CREATE POLICY cat_select_auth ON public.categorias FOR SELECT TO authenticated USING (true)';
  EXECUTE 'DROP POLICY IF EXISTS cat_write_staff ON public.categorias';
  EXECUTE 'CREATE POLICY cat_write_staff ON public.categorias FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))';

  EXECUTE 'DROP POLICY IF EXISTS prod_select_auth ON public.produtos';
  EXECUTE 'CREATE POLICY prod_select_auth ON public.produtos FOR SELECT TO authenticated USING (true)';
  EXECUTE 'DROP POLICY IF EXISTS prod_write_staff ON public.produtos';
  EXECUTE 'CREATE POLICY prod_write_staff ON public.produtos FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))';

  EXECUTE 'DROP POLICY IF EXISTS cli_select_auth ON public.clientes';
  EXECUTE 'CREATE POLICY cli_select_auth ON public.clientes FOR SELECT TO authenticated USING (true)';
  EXECUTE 'DROP POLICY IF EXISTS cli_write_staff ON public.clientes';
  EXECUTE 'CREATE POLICY cli_write_staff ON public.clientes FOR ALL TO authenticated USING (public.is_staff(auth.uid()) OR public.has_role(auth.uid(),''vendedor'')) WITH CHECK (public.is_staff(auth.uid()) OR public.has_role(auth.uid(),''vendedor''))';

  -- pedidos
  EXECUTE 'DROP POLICY IF EXISTS ped_select_scope ON public.pedidos';
  EXECUTE 'CREATE POLICY ped_select_scope ON public.pedidos FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR vendedor_id = auth.uid())';
  EXECUTE 'DROP POLICY IF EXISTS ped_insert_scope ON public.pedidos';
  EXECUTE 'CREATE POLICY ped_insert_scope ON public.pedidos FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) OR (public.has_role(auth.uid(),''vendedor'') AND vendedor_id = auth.uid()))';
  EXECUTE 'DROP POLICY IF EXISTS ped_update_scope ON public.pedidos';
  EXECUTE 'CREATE POLICY ped_update_scope ON public.pedidos FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()) OR (public.has_role(auth.uid(),''vendedor'') AND vendedor_id = auth.uid() AND status = ''pendente''))';
  EXECUTE 'DROP POLICY IF EXISTS ped_delete_admin ON public.pedidos';
  EXECUTE 'CREATE POLICY ped_delete_admin ON public.pedidos FOR DELETE TO authenticated USING (public.has_role(auth.uid(),''admin''))';

  EXECUTE 'DROP POLICY IF EXISTS pi_select_scope ON public.pedido_itens';
  EXECUTE 'CREATE POLICY pi_select_scope ON public.pedido_itens FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_itens.pedido_id AND (public.is_staff(auth.uid()) OR p.vendedor_id = auth.uid())))';
  EXECUTE 'DROP POLICY IF EXISTS pi_write_scope ON public.pedido_itens';
  EXECUTE 'CREATE POLICY pi_write_scope ON public.pedido_itens FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_itens.pedido_id AND (public.is_staff(auth.uid()) OR p.vendedor_id = auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_itens.pedido_id AND (public.is_staff(auth.uid()) OR p.vendedor_id = auth.uid())))';

  EXECUTE 'DROP POLICY IF EXISTS pp_select_scope ON public.pedido_pagamentos';
  EXECUTE 'CREATE POLICY pp_select_scope ON public.pedido_pagamentos FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_pagamentos.pedido_id AND (public.is_staff(auth.uid()) OR p.vendedor_id = auth.uid())))';
  EXECUTE 'DROP POLICY IF EXISTS pp_write_scope ON public.pedido_pagamentos';
  EXECUTE 'CREATE POLICY pp_write_scope ON public.pedido_pagamentos FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_pagamentos.pedido_id AND (public.is_staff(auth.uid()) OR p.vendedor_id = auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM public.pedidos p WHERE p.id = pedido_pagamentos.pedido_id AND (public.is_staff(auth.uid()) OR p.vendedor_id = auth.uid())))';

  -- app_settings
  EXECUTE 'DROP POLICY IF EXISTS app_settings_select_auth ON public.app_settings';
  EXECUTE 'CREATE POLICY app_settings_select_auth ON public.app_settings FOR SELECT TO authenticated USING (true)';
  EXECUTE 'DROP POLICY IF EXISTS app_settings_write_staff ON public.app_settings';
  EXECUTE 'CREATE POLICY app_settings_write_staff ON public.app_settings FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))';

  -- caixa/contas/despesas/estoque/faturamentos/nfe = staff
  EXECUTE 'DROP POLICY IF EXISTS cx_staff ON public.caixa_sessoes';
  EXECUTE 'CREATE POLICY cx_staff ON public.caixa_sessoes FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))';
  EXECUTE 'DROP POLICY IF EXISTS cxm_staff ON public.caixa_movimentos';
  EXECUTE 'CREATE POLICY cxm_staff ON public.caixa_movimentos FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))';
  EXECUTE 'DROP POLICY IF EXISTS ct_staff ON public.contas';
  EXECUTE 'CREATE POLICY ct_staff ON public.contas FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))';
  EXECUTE 'DROP POLICY IF EXISTS desp_staff ON public.despesas';
  EXECUTE 'CREATE POLICY desp_staff ON public.despesas FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))';
  EXECUTE 'DROP POLICY IF EXISTS em_staff ON public.estoque_movimentos';
  EXECUTE 'CREATE POLICY em_staff ON public.estoque_movimentos FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))';
  EXECUTE 'DROP POLICY IF EXISTS fat_staff ON public.faturamentos';
  EXECUTE 'CREATE POLICY fat_staff ON public.faturamentos FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))';
  EXECUTE 'DROP POLICY IF EXISTS fatp_staff ON public.faturamento_pedidos';
  EXECUTE 'CREATE POLICY fatp_staff ON public.faturamento_pedidos FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))';
  EXECUTE 'DROP POLICY IF EXISTS fp_staff ON public.fidelidade_pontos';
  EXECUTE 'CREATE POLICY fp_staff ON public.fidelidade_pontos FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))';
  EXECUTE 'DROP POLICY IF EXISTS nfe_staff ON public.nfe_entradas';
  EXECUTE 'CREATE POLICY nfe_staff ON public.nfe_entradas FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))';
  EXECUTE 'DROP POLICY IF EXISTS nfei_staff ON public.nfe_itens';
  EXECUTE 'CREATE POLICY nfei_staff ON public.nfe_itens FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))';

  -- gtin global = leitura autenticada
  EXECUTE 'DROP POLICY IF EXISTS gtin_read_auth ON public.gtin_global';
  EXECUTE 'CREATE POLICY gtin_read_auth ON public.gtin_global FOR SELECT TO authenticated USING (true)';

  -- product_images
  EXECUTE 'DROP POLICY IF EXISTS pimg_select_auth ON public.product_images';
  EXECUTE 'CREATE POLICY pimg_select_auth ON public.product_images FOR SELECT TO authenticated USING (true)';
  EXECUTE 'DROP POLICY IF EXISTS pimg_write_staff ON public.product_images';
  EXECUTE 'CREATE POLICY pimg_write_staff ON public.product_images FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))';

  -- api_keys = admin
  EXECUTE 'DROP POLICY IF EXISTS api_keys_admin_all ON public.api_keys';
  EXECUTE 'CREATE POLICY api_keys_admin_all ON public.api_keys FOR ALL TO authenticated USING (public.has_role(auth.uid(),''admin'')) WITH CHECK (public.has_role(auth.uid(),''admin''))';

  -- audit_logs
  EXECUTE 'DROP POLICY IF EXISTS audit_insert_any_auth ON public.audit_logs';
  EXECUTE 'CREATE POLICY audit_insert_any_auth ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())';
  EXECUTE 'DROP POLICY IF EXISTS audit_select_admin ON public.audit_logs';
  EXECUTE 'CREATE POLICY audit_select_admin ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),''admin'') OR public.has_role(auth.uid(),''gerente''))';
END $$;

-- ---------- STORAGE --------------------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES ('pdv-assets','pdv-assets',true)
  ON CONFLICT (id) DO NOTHING;

-- ---------- SEED ADMIN PRINCIPAL ------------------------------------
-- Cria admin@loja.com / admin12 diretamente em auth.users (idempotente)
DO $$
DECLARE
  v_user_id uuid;
  v_existing uuid;
BEGIN
  SELECT id INTO v_existing FROM auth.users WHERE email = 'admin@loja.com';
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
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'admin@loja.com'),
      'email', v_user_id::text, now(), now(), now());
  ELSE
    v_user_id := v_existing;
  END IF;

  -- profile + role admin (idempotente)
  INSERT INTO public.profiles (id, nome, email)
  VALUES (v_user_id, 'Administrador', 'admin@loja.com')
  ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, email = EXCLUDED.email;

  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin');
END $$;

-- ---------- CATEGORIAS PADRÃO ---------------------------------------
INSERT INTO public.categorias (nome, cor) VALUES
  ('Bebidas','#3b82f6'),('Cervejas','#f59e0b'),('Destilados','#8b5cf6'),
  ('Snacks','#ef4444'),('Tabacaria','#64748b'),('Gelados','#06b6d4')
ON CONFLICT DO NOTHING;

-- =====================================================================
-- FIM. Login: admin@loja.com / admin12
-- Imagens dos produtos: gere via "Gerar com IA" no app, ou suba pelo
-- bucket pdv-assets. Imagens base64 atuais não são portáveis via SQL.
-- =====================================================================