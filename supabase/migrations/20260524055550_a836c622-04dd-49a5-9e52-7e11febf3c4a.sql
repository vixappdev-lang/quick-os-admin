
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
