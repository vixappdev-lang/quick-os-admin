-- ============================================================
-- LyneCloud · Schema completo (tenants Supabase)
-- Cole este SQL no SQL Editor do projeto Supabase do cliente e EXECUTE.
-- Idempotente: pode rodar quantas vezes for necessário (criação + atualização).
-- Seguro em projeto vazio ou já parcialmente migrado.
-- ============================================================
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

DO $idem_app_role$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'admin',
    'gerente',
    'operador',
    'vendedor'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $idem_app_role$;

--
-- Name: caixa_mov_tipo; Type: TYPE; Schema: public; Owner: -
--

DO $idem_caixa_mov_tipo$ BEGIN
  CREATE TYPE public.caixa_mov_tipo AS ENUM (
    'sangria',
    'suprimento',
    'venda',
    'despesa'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $idem_caixa_mov_tipo$;

--
-- Name: caixa_status; Type: TYPE; Schema: public; Owner: -
--

DO $idem_caixa_status$ BEGIN
  CREATE TYPE public.caixa_status AS ENUM (
    'aberto',
    'fechado'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $idem_caixa_status$;

--
-- Name: conta_status; Type: TYPE; Schema: public; Owner: -
--

DO $idem_conta_status$ BEGIN
  CREATE TYPE public.conta_status AS ENUM (
    'pendente',
    'pago',
    'atrasado',
    'cancelado'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $idem_conta_status$;

--
-- Name: conta_tipo; Type: TYPE; Schema: public; Owner: -
--

DO $idem_conta_tipo$ BEGIN
  CREATE TYPE public.conta_tipo AS ENUM (
    'pagar',
    'receber'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $idem_conta_tipo$;

--
-- Name: estoque_mov_tipo; Type: TYPE; Schema: public; Owner: -
--

DO $idem_estoque_mov_tipo$ BEGIN
  CREATE TYPE public.estoque_mov_tipo AS ENUM (
    'entrada',
    'saida',
    'ajuste',
    'perda'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $idem_estoque_mov_tipo$;

--
-- Name: nfe_status; Type: TYPE; Schema: public; Owner: -
--

DO $idem_nfe_status$ BEGIN
  CREATE TYPE public.nfe_status AS ENUM (
    'importado',
    'conferindo',
    'confirmado'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $idem_nfe_status$;

--
-- Name: pagamento_tipo; Type: TYPE; Schema: public; Owner: -
--

DO $idem_pagamento_tipo$ BEGIN
  CREATE TYPE public.pagamento_tipo AS ENUM (
    'pix',
    'credito',
    'debito',
    'dinheiro',
    'fiado',
    'outro',
    'nota_promissoria',
    'cheque'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $idem_pagamento_tipo$;

--
-- Name: pedido_origem; Type: TYPE; Schema: public; Owner: -
--

DO $idem_pedido_origem$ BEGIN
  CREATE TYPE public.pedido_origem AS ENUM (
    'balcao',
    'pdv',
    'vendedor',
    'delivery'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $idem_pedido_origem$;

--
-- Name: pedido_status; Type: TYPE; Schema: public; Owner: -
--

DO $idem_pedido_status$ BEGIN
  CREATE TYPE public.pedido_status AS ENUM (
    'pendente',
    'autorizado',
    'separacao',
    'conferencia',
    'faturamento',
    'concluido',
    'cancelado',
    'encerrado'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $idem_pedido_status$;

--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    prefix text NOT NULL,
    key_hash text NOT NULL,
    created_by uuid,
    ativo boolean DEFAULT true NOT NULL,
    last_used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    scopes text[] DEFAULT ARRAY['read'::text, 'write'::text],
    expires_at timestamp with time zone,
    usage_count integer DEFAULT 0 NOT NULL,
    descricao text
);


--
-- Name: app_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.app_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    categoria text NOT NULL,
    mensagem text NOT NULL,
    payload jsonb,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ip text,
    user_agent text
);


--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.app_settings (
    id text DEFAULT 'main'::text NOT NULL,
    pdv_ativo boolean DEFAULT true NOT NULL,
    metodos_pagamento jsonb DEFAULT '{"pix": true, "debito": true, "credito": true, "dinheiro": true, "nota_promissoria": true}'::jsonb NOT NULL,
    pix_qr_url text,
    pix_chave text,
    empresa_razao text,
    empresa_cnpj text,
    empresa_telefone text,
    empresa_email text,
    empresa_endereco text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    empresa_ie text,
    nfeio_api_key text,
    nfeio_company_id text,
    nfeio_environment text DEFAULT 'Development'::text,
    nfeio_webhook_secret text,
    nfeio_webhook_events jsonb DEFAULT '{}'::jsonb,
    nfeio_validated_at timestamp with time zone,
    nfe_provider text DEFAULT 'nfeio'::text,
    brasilnfe_user_token text,
    brasilnfe_company_token text,
    brasilnfe_environment text DEFAULT 'Production'::text,
    brasilnfe_validated_at timestamp with time zone
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    acao text NOT NULL,
    entidade text NOT NULL,
    entidade_id uuid,
    payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: backups_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.backups_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    status text DEFAULT 'success'::text NOT NULL,
    tamanho_bytes bigint,
    storage_path text,
    observacao text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: caixa_movimentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.caixa_movimentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sessao_id uuid NOT NULL,
    tipo public.caixa_mov_tipo NOT NULL,
    valor numeric(12,2) NOT NULL,
    descricao text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: caixa_sessoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.caixa_sessoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operador_id uuid NOT NULL,
    abertura timestamp with time zone DEFAULT now() NOT NULL,
    fechamento timestamp with time zone,
    valor_inicial numeric(12,2) DEFAULT 0 NOT NULL,
    valor_final numeric(12,2),
    status public.caixa_status DEFAULT 'aberto'::public.caixa_status NOT NULL,
    observacoes text
);


--
-- Name: categorias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.categorias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    cor text DEFAULT '#3b82f6'::text,
    icone text,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: clientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.clientes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    telefone text,
    email text,
    documento text,
    endereco jsonb,
    limite_credito numeric(12,2) DEFAULT 0,
    saldo_fiado numeric(12,2) DEFAULT 0 NOT NULL,
    observacoes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    nome_fantasia text,
    ie text,
    tipo_pessoa text DEFAULT 'PF'::text NOT NULL,
    vendedor_id uuid
);


--
-- Name: contas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.contas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tipo public.conta_tipo NOT NULL,
    descricao text NOT NULL,
    valor numeric(12,2) NOT NULL,
    vencimento date NOT NULL,
    status public.conta_status DEFAULT 'pendente'::public.conta_status NOT NULL,
    cliente_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    anexo_url text,
    categoria text
);


--
-- Name: despesas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.despesas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    descricao text NOT NULL,
    valor numeric(12,2) NOT NULL,
    categoria text,
    vencimento date,
    pago boolean DEFAULT false NOT NULL,
    pago_em timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: estoque_movimentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.estoque_movimentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    produto_id uuid NOT NULL,
    tipo public.estoque_mov_tipo NOT NULL,
    qtd numeric(12,3) NOT NULL,
    motivo text,
    referencia_id uuid,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: faturamento_pedidos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.faturamento_pedidos (
    faturamento_id uuid NOT NULL,
    pedido_id uuid NOT NULL
);


--
-- Name: faturamentos_numero_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.faturamentos_numero_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: faturamentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.faturamentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero text DEFAULT ('F'::text || lpad((nextval('public.faturamentos_numero_seq'::regclass))::text, 5, '0'::text)) NOT NULL,
    total numeric DEFAULT 0 NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fidelidade_pontos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.fidelidade_pontos (
    cliente_id uuid NOT NULL,
    pontos integer DEFAULT 0 NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fornecedores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.fornecedores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    razao_social text NOT NULL,
    nome_fantasia text,
    cpf_cnpj text,
    ie text,
    cidade text,
    estado text,
    telefone text,
    email text,
    observacoes text,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    cep text,
    endereco text,
    numero text,
    bairro text,
    complemento text,
    contato_nome text,
    whatsapp text,
    site text,
    condicoes text
);


--
-- Name: gtin_global; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.gtin_global (
    gtin text NOT NULL,
    nome text NOT NULL,
    marca text,
    categoria_sugerida text,
    unidade text,
    imagem_url text,
    fonte text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: nfe_entradas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.nfe_entradas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero text,
    chave text,
    fornecedor text,
    valor_total numeric(12,2) DEFAULT 0,
    xml_url text,
    status public.nfe_status DEFAULT 'importado'::public.nfe_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    confirmado_em timestamp with time zone,
    confirmado_por uuid
);


--
-- Name: nfe_itens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.nfe_itens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nfe_id uuid NOT NULL,
    codigo_xml text,
    ean_xml text,
    descricao_xml text NOT NULL,
    qtd numeric(12,3) DEFAULT 0 NOT NULL,
    valor_unit numeric(12,4) DEFAULT 0 NOT NULL,
    valor_total numeric(12,2) DEFAULT 0 NOT NULL,
    unidade text,
    produto_id uuid,
    divergencia text
);


--
-- Name: nfe_webhook_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.nfe_webhook_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    evento text NOT NULL,
    payload jsonb NOT NULL,
    pedido_id uuid,
    recebido_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notificacoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.notificacoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    tipo text NOT NULL,
    severidade text DEFAULT 'info'::text NOT NULL,
    titulo text NOT NULL,
    mensagem text NOT NULL,
    payload jsonb,
    dedupe_key text,
    lida_em timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: patrimonio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.patrimonio (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    categoria text,
    valor numeric DEFAULT 0 NOT NULL,
    data_aquisicao date,
    observacoes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pedido_itens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.pedido_itens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pedido_id uuid NOT NULL,
    produto_id uuid NOT NULL,
    qtd numeric(12,3) DEFAULT 1 NOT NULL,
    preco_unit numeric(12,2) DEFAULT 0 NOT NULL,
    desconto numeric(12,2) DEFAULT 0 NOT NULL,
    total numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    embalagem_tipo text DEFAULT 'UN'::text NOT NULL,
    qtd_un_por_embalagem numeric DEFAULT 1 NOT NULL
);


--
-- Name: pedido_pagamentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.pedido_pagamentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pedido_id uuid NOT NULL,
    forma text NOT NULL,
    condicao text,
    vencimento date,
    valor numeric DEFAULT 0 NOT NULL,
    observacao text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: pedidos_numero_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE IF NOT EXISTS public.pedidos_numero_seq
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pedidos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.pedidos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero text DEFAULT ('P'::text || lpad((nextval('public.pedidos_numero_seq'::regclass))::text, 5, '0'::text)) NOT NULL,
    cliente_id uuid,
    vendedor_id uuid,
    operador_id uuid,
    origem public.pedido_origem DEFAULT 'balcao'::public.pedido_origem NOT NULL,
    status public.pedido_status DEFAULT 'pendente'::public.pedido_status NOT NULL,
    pagamento public.pagamento_tipo,
    subtotal numeric(12,2) DEFAULT 0 NOT NULL,
    desconto numeric(12,2) DEFAULT 0 NOT NULL,
    total numeric(12,2) DEFAULT 0 NOT NULL,
    observacoes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    total_pago numeric DEFAULT 0 NOT NULL,
    restante numeric DEFAULT 0 NOT NULL,
    nfe_numero text,
    nfe_chave text,
    nfe_emitida_em timestamp with time zone,
    faturado_em timestamp with time zone,
    nfe_id text,
    nfe_pdf_url text,
    nfe_xml_url text,
    nfe_status text,
    tipo_operacao text DEFAULT 'saida'::text NOT NULL,
    fornecedor_id uuid,
    faturado boolean DEFAULT false NOT NULL,
    CONSTRAINT pedidos_tipo_operacao_chk CHECK ((tipo_operacao = ANY (ARRAY['saida'::text, 'entrada'::text])))
);


--
-- Name: product_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.product_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome_chave text NOT NULL,
    nome text NOT NULL,
    url text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: produtos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.produtos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sku text NOT NULL,
    codigo_barras text,
    nome text NOT NULL,
    categoria_id uuid,
    preco_venda numeric(12,2) DEFAULT 0 NOT NULL,
    preco_custo numeric(12,2) DEFAULT 0,
    estoque numeric(12,3) DEFAULT 0 NOT NULL,
    estoque_minimo numeric(12,3) DEFAULT 0,
    unidade text DEFAULT 'UN'::text NOT NULL,
    imagem_url text,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    embalagens jsonb DEFAULT '[]'::jsonb NOT NULL,
    peso_kg numeric DEFAULT 0 NOT NULL,
    fornecedor_id uuid,
    tem_nota_fiscal boolean DEFAULT false NOT NULL,
    unidade_embalagem text DEFAULT 'UN'::text NOT NULL,
    fator_unidade numeric DEFAULT 1 NOT NULL,
    estoque_fiscal numeric DEFAULT 0 NOT NULL,
    CONSTRAINT produtos_fator_unidade_positivo CHECK ((fator_unidade >= (1)::numeric))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    nome text NOT NULL,
    email text,
    telefone text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_slug text,
    onboarding_completed_at timestamp with time zone
);


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    nome text,
    supabase_url text NOT NULL,
    supabase_anon_key text NOT NULL,
    user_id uuid NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tenants_slug_check CHECK ((((length(slug) >= 4) AND (length(slug) <= 12)) AND (slug ~ '^[a-z0-9]+$'::text)))
);


--
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.user_permissions (
    user_id uuid NOT NULL,
    menu text NOT NULL,
    allowed boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);











-- === LYNECLOUD: COLUNAS FALTANTES (INÍCIO) ===
-- Completa bancos já existentes/parciais antes de criar constraints, funções, triggers e policies.
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS prefix text;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS key_hash text;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS last_used_at timestamp with time zone;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS scopes text[] DEFAULT ARRAY['read'::text, 'write'::text];
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS usage_count integer DEFAULT 0;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE public.app_logs ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.app_logs ADD COLUMN IF NOT EXISTS categoria text;
ALTER TABLE public.app_logs ADD COLUMN IF NOT EXISTS mensagem text;
ALTER TABLE public.app_logs ADD COLUMN IF NOT EXISTS payload jsonb;
ALTER TABLE public.app_logs ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.app_logs ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.app_logs ADD COLUMN IF NOT EXISTS ip text;
ALTER TABLE public.app_logs ADD COLUMN IF NOT EXISTS user_agent text;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS id text DEFAULT 'main'::text;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS pdv_ativo boolean DEFAULT true;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS metodos_pagamento jsonb DEFAULT '{"pix": true, "debito": true, "credito": true, "dinheiro": true, "nota_promissoria": true}'::jsonb;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS pix_qr_url text;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS pix_chave text;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS empresa_razao text;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS empresa_cnpj text;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS empresa_telefone text;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS empresa_email text;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS empresa_endereco text;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS empresa_ie text;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS nfeio_api_key text;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS nfeio_company_id text;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS nfeio_environment text DEFAULT 'Development'::text;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS nfeio_webhook_secret text;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS nfeio_webhook_events jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS nfeio_validated_at timestamp with time zone;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS nfe_provider text DEFAULT 'nfeio'::text;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS brasilnfe_user_token text;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS brasilnfe_company_token text;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS brasilnfe_environment text DEFAULT 'Production'::text;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS brasilnfe_validated_at timestamp with time zone;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS acao text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entidade text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entidade_id uuid;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS payload jsonb;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.backups_log ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.backups_log ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.backups_log ADD COLUMN IF NOT EXISTS status text DEFAULT 'success'::text;
ALTER TABLE public.backups_log ADD COLUMN IF NOT EXISTS tamanho_bytes bigint;
ALTER TABLE public.backups_log ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE public.backups_log ADD COLUMN IF NOT EXISTS observacao text;
ALTER TABLE public.backups_log ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.caixa_movimentos ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.caixa_movimentos ADD COLUMN IF NOT EXISTS sessao_id uuid;
ALTER TABLE public.caixa_movimentos ADD COLUMN IF NOT EXISTS tipo public.caixa_mov_tipo;
ALTER TABLE public.caixa_movimentos ADD COLUMN IF NOT EXISTS valor numeric(12,2);
ALTER TABLE public.caixa_movimentos ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE public.caixa_movimentos ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.caixa_sessoes ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.caixa_sessoes ADD COLUMN IF NOT EXISTS operador_id uuid;
ALTER TABLE public.caixa_sessoes ADD COLUMN IF NOT EXISTS abertura timestamp with time zone DEFAULT now();
ALTER TABLE public.caixa_sessoes ADD COLUMN IF NOT EXISTS fechamento timestamp with time zone;
ALTER TABLE public.caixa_sessoes ADD COLUMN IF NOT EXISTS valor_inicial numeric(12,2) DEFAULT 0;
ALTER TABLE public.caixa_sessoes ADD COLUMN IF NOT EXISTS valor_final numeric(12,2);
ALTER TABLE public.caixa_sessoes ADD COLUMN IF NOT EXISTS status public.caixa_status DEFAULT 'aberto'::public.caixa_status;
ALTER TABLE public.caixa_sessoes ADD COLUMN IF NOT EXISTS observacoes text;
ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS cor text DEFAULT '#3b82f6'::text;
ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS icone text;
ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS documento text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS endereco jsonb;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS limite_credito numeric(12,2) DEFAULT 0;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS saldo_fiado numeric(12,2) DEFAULT 0;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS observacoes text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS nome_fantasia text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS ie text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS tipo_pessoa text DEFAULT 'PF'::text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS vendedor_id uuid;
ALTER TABLE public.contas ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.contas ADD COLUMN IF NOT EXISTS tipo public.conta_tipo;
ALTER TABLE public.contas ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE public.contas ADD COLUMN IF NOT EXISTS valor numeric(12,2);
ALTER TABLE public.contas ADD COLUMN IF NOT EXISTS vencimento date;
ALTER TABLE public.contas ADD COLUMN IF NOT EXISTS status public.conta_status DEFAULT 'pendente'::public.conta_status;
ALTER TABLE public.contas ADD COLUMN IF NOT EXISTS cliente_id uuid;
ALTER TABLE public.contas ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.contas ADD COLUMN IF NOT EXISTS anexo_url text;
ALTER TABLE public.contas ADD COLUMN IF NOT EXISTS categoria text;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS valor numeric(12,2);
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS categoria text;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS vencimento date;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS pago boolean DEFAULT false;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS pago_em timestamp with time zone;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.estoque_movimentos ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.estoque_movimentos ADD COLUMN IF NOT EXISTS produto_id uuid;
ALTER TABLE public.estoque_movimentos ADD COLUMN IF NOT EXISTS tipo public.estoque_mov_tipo;
ALTER TABLE public.estoque_movimentos ADD COLUMN IF NOT EXISTS qtd numeric(12,3);
ALTER TABLE public.estoque_movimentos ADD COLUMN IF NOT EXISTS motivo text;
ALTER TABLE public.estoque_movimentos ADD COLUMN IF NOT EXISTS referencia_id uuid;
ALTER TABLE public.estoque_movimentos ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.estoque_movimentos ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.faturamento_pedidos ADD COLUMN IF NOT EXISTS faturamento_id uuid;
ALTER TABLE public.faturamento_pedidos ADD COLUMN IF NOT EXISTS pedido_id uuid;
ALTER TABLE public.faturamentos ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.faturamentos ADD COLUMN IF NOT EXISTS numero text DEFAULT ('F'::text || lpad((nextval('public.faturamentos_numero_seq'::regclass))::text, 5, '0'::text));
ALTER TABLE public.faturamentos ADD COLUMN IF NOT EXISTS total numeric DEFAULT 0;
ALTER TABLE public.faturamentos ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.faturamentos ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.fidelidade_pontos ADD COLUMN IF NOT EXISTS cliente_id uuid;
ALTER TABLE public.fidelidade_pontos ADD COLUMN IF NOT EXISTS pontos integer DEFAULT 0;
ALTER TABLE public.fidelidade_pontos ADD COLUMN IF NOT EXISTS atualizado_em timestamp with time zone DEFAULT now();
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS razao_social text;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS nome_fantasia text;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS cpf_cnpj text;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS ie text;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS cidade text;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS estado text;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS observacoes text;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS cep text;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS endereco text;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS numero text;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS bairro text;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS complemento text;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS contato_nome text;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS site text;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS condicoes text;
ALTER TABLE public.gtin_global ADD COLUMN IF NOT EXISTS gtin text;
ALTER TABLE public.gtin_global ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.gtin_global ADD COLUMN IF NOT EXISTS marca text;
ALTER TABLE public.gtin_global ADD COLUMN IF NOT EXISTS categoria_sugerida text;
ALTER TABLE public.gtin_global ADD COLUMN IF NOT EXISTS unidade text;
ALTER TABLE public.gtin_global ADD COLUMN IF NOT EXISTS imagem_url text;
ALTER TABLE public.gtin_global ADD COLUMN IF NOT EXISTS fonte text;
ALTER TABLE public.gtin_global ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.nfe_entradas ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.nfe_entradas ADD COLUMN IF NOT EXISTS numero text;
ALTER TABLE public.nfe_entradas ADD COLUMN IF NOT EXISTS chave text;
ALTER TABLE public.nfe_entradas ADD COLUMN IF NOT EXISTS fornecedor text;
ALTER TABLE public.nfe_entradas ADD COLUMN IF NOT EXISTS valor_total numeric(12,2) DEFAULT 0;
ALTER TABLE public.nfe_entradas ADD COLUMN IF NOT EXISTS xml_url text;
ALTER TABLE public.nfe_entradas ADD COLUMN IF NOT EXISTS status public.nfe_status DEFAULT 'importado'::public.nfe_status;
ALTER TABLE public.nfe_entradas ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.nfe_entradas ADD COLUMN IF NOT EXISTS confirmado_em timestamp with time zone;
ALTER TABLE public.nfe_entradas ADD COLUMN IF NOT EXISTS confirmado_por uuid;
ALTER TABLE public.nfe_itens ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.nfe_itens ADD COLUMN IF NOT EXISTS nfe_id uuid;
ALTER TABLE public.nfe_itens ADD COLUMN IF NOT EXISTS codigo_xml text;
ALTER TABLE public.nfe_itens ADD COLUMN IF NOT EXISTS ean_xml text;
ALTER TABLE public.nfe_itens ADD COLUMN IF NOT EXISTS descricao_xml text;
ALTER TABLE public.nfe_itens ADD COLUMN IF NOT EXISTS qtd numeric(12,3) DEFAULT 0;
ALTER TABLE public.nfe_itens ADD COLUMN IF NOT EXISTS valor_unit numeric(12,4) DEFAULT 0;
ALTER TABLE public.nfe_itens ADD COLUMN IF NOT EXISTS valor_total numeric(12,2) DEFAULT 0;
ALTER TABLE public.nfe_itens ADD COLUMN IF NOT EXISTS unidade text;
ALTER TABLE public.nfe_itens ADD COLUMN IF NOT EXISTS produto_id uuid;
ALTER TABLE public.nfe_itens ADD COLUMN IF NOT EXISTS divergencia text;
ALTER TABLE public.nfe_webhook_events ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.nfe_webhook_events ADD COLUMN IF NOT EXISTS evento text;
ALTER TABLE public.nfe_webhook_events ADD COLUMN IF NOT EXISTS payload jsonb;
ALTER TABLE public.nfe_webhook_events ADD COLUMN IF NOT EXISTS pedido_id uuid;
ALTER TABLE public.nfe_webhook_events ADD COLUMN IF NOT EXISTS recebido_em timestamp with time zone DEFAULT now();
ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS tipo text;
ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS severidade text DEFAULT 'info'::text;
ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS titulo text;
ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS mensagem text;
ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS payload jsonb;
ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS dedupe_key text;
ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS lida_em timestamp with time zone;
ALTER TABLE public.notificacoes ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.patrimonio ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.patrimonio ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.patrimonio ADD COLUMN IF NOT EXISTS categoria text;
ALTER TABLE public.patrimonio ADD COLUMN IF NOT EXISTS valor numeric DEFAULT 0;
ALTER TABLE public.patrimonio ADD COLUMN IF NOT EXISTS data_aquisicao date;
ALTER TABLE public.patrimonio ADD COLUMN IF NOT EXISTS observacoes text;
ALTER TABLE public.patrimonio ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.patrimonio ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();
ALTER TABLE public.pedido_itens ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.pedido_itens ADD COLUMN IF NOT EXISTS pedido_id uuid;
ALTER TABLE public.pedido_itens ADD COLUMN IF NOT EXISTS produto_id uuid;
ALTER TABLE public.pedido_itens ADD COLUMN IF NOT EXISTS qtd numeric(12,3) DEFAULT 1;
ALTER TABLE public.pedido_itens ADD COLUMN IF NOT EXISTS preco_unit numeric(12,2) DEFAULT 0;
ALTER TABLE public.pedido_itens ADD COLUMN IF NOT EXISTS desconto numeric(12,2) DEFAULT 0;
ALTER TABLE public.pedido_itens ADD COLUMN IF NOT EXISTS total numeric(12,2) DEFAULT 0;
ALTER TABLE public.pedido_itens ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.pedido_itens ADD COLUMN IF NOT EXISTS embalagem_tipo text DEFAULT 'UN'::text;
ALTER TABLE public.pedido_itens ADD COLUMN IF NOT EXISTS qtd_un_por_embalagem numeric DEFAULT 1;
ALTER TABLE public.pedido_pagamentos ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.pedido_pagamentos ADD COLUMN IF NOT EXISTS pedido_id uuid;
ALTER TABLE public.pedido_pagamentos ADD COLUMN IF NOT EXISTS forma text;
ALTER TABLE public.pedido_pagamentos ADD COLUMN IF NOT EXISTS condicao text;
ALTER TABLE public.pedido_pagamentos ADD COLUMN IF NOT EXISTS vencimento date;
ALTER TABLE public.pedido_pagamentos ADD COLUMN IF NOT EXISTS valor numeric DEFAULT 0;
ALTER TABLE public.pedido_pagamentos ADD COLUMN IF NOT EXISTS observacao text;
ALTER TABLE public.pedido_pagamentos ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.pedido_pagamentos ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS numero text DEFAULT ('P'::text || lpad((nextval('public.pedidos_numero_seq'::regclass))::text, 5, '0'::text));
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS cliente_id uuid;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS vendedor_id uuid;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS operador_id uuid;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS origem public.pedido_origem DEFAULT 'balcao'::public.pedido_origem;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS status public.pedido_status DEFAULT 'pendente'::public.pedido_status;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS pagamento public.pagamento_tipo;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS subtotal numeric(12,2) DEFAULT 0;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS desconto numeric(12,2) DEFAULT 0;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS total numeric(12,2) DEFAULT 0;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS observacoes text;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS total_pago numeric DEFAULT 0;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS restante numeric DEFAULT 0;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS nfe_numero text;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS nfe_chave text;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS nfe_emitida_em timestamp with time zone;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS faturado_em timestamp with time zone;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS nfe_id text;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS nfe_pdf_url text;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS nfe_xml_url text;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS nfe_status text;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS tipo_operacao text DEFAULT 'saida'::text;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS fornecedor_id uuid;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS faturado boolean DEFAULT false;
DO $idem$ BEGIN
  ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_tipo_operacao_chk CHECK ((tipo_operacao = ANY (ARRAY['saida'::text, 'entrada'::text])));
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;
ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS nome_chave text;
ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS codigo_barras text;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS categoria_id uuid;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS preco_venda numeric(12,2) DEFAULT 0;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS preco_custo numeric(12,2) DEFAULT 0;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS estoque numeric(12,3) DEFAULT 0;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS estoque_minimo numeric(12,3) DEFAULT 0;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS unidade text DEFAULT 'UN'::text;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS imagem_url text;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS embalagens jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS peso_kg numeric DEFAULT 0;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS fornecedor_id uuid;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS tem_nota_fiscal boolean DEFAULT false;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS unidade_embalagem text DEFAULT 'UN'::text;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS fator_unidade numeric DEFAULT 1;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS estoque_fiscal numeric DEFAULT 0;
DO $idem$ BEGIN
  ALTER TABLE public.produtos ADD CONSTRAINT produtos_fator_unidade_positivo CHECK ((fator_unidade >= (1)::numeric));
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_slug text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamp with time zone;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS supabase_url text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS supabase_anon_key text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
DO $idem$ BEGIN
  ALTER TABLE public.tenants ADD CONSTRAINT tenants_slug_check CHECK ((((length(slug) >= 4) AND (length(slug) <= 12)) AND (slug ~ '^[a-z0-9]+$'::text)));
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS menu text;
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS allowed boolean DEFAULT true;
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS role public.app_role;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
-- === LYNECLOUD: COLUNAS FALTANTES (FIM) ===


--
-- Name: api_keys api_keys_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.api_keys ADD CONSTRAINT api_keys_key_hash_key UNIQUE (key_hash);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.api_keys ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: api_keys api_keys_prefix_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.api_keys ADD CONSTRAINT api_keys_prefix_key UNIQUE (prefix);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: app_logs app_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.app_logs ADD CONSTRAINT app_logs_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: backups_log backups_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.backups_log ADD CONSTRAINT backups_log_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: caixa_movimentos caixa_movimentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.caixa_movimentos ADD CONSTRAINT caixa_movimentos_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: caixa_sessoes caixa_sessoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.caixa_sessoes ADD CONSTRAINT caixa_sessoes_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.categorias ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.clientes ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: contas contas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.contas ADD CONSTRAINT contas_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: despesas despesas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.despesas ADD CONSTRAINT despesas_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: estoque_movimentos estoque_movimentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.estoque_movimentos ADD CONSTRAINT estoque_movimentos_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: faturamento_pedidos faturamento_pedidos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.faturamento_pedidos ADD CONSTRAINT faturamento_pedidos_pkey PRIMARY KEY (faturamento_id, pedido_id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: faturamentos faturamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.faturamentos ADD CONSTRAINT faturamentos_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: fidelidade_pontos fidelidade_pontos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.fidelidade_pontos ADD CONSTRAINT fidelidade_pontos_pkey PRIMARY KEY (cliente_id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: fornecedores fornecedores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.fornecedores ADD CONSTRAINT fornecedores_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: gtin_global gtin_global_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.gtin_global ADD CONSTRAINT gtin_global_pkey PRIMARY KEY (gtin);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: nfe_entradas nfe_entradas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.nfe_entradas ADD CONSTRAINT nfe_entradas_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: nfe_itens nfe_itens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.nfe_itens ADD CONSTRAINT nfe_itens_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: nfe_webhook_events nfe_webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.nfe_webhook_events ADD CONSTRAINT nfe_webhook_events_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: notificacoes notificacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.notificacoes ADD CONSTRAINT notificacoes_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: patrimonio patrimonio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.patrimonio ADD CONSTRAINT patrimonio_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: pedido_itens pedido_itens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.pedido_itens ADD CONSTRAINT pedido_itens_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: pedido_pagamentos pedido_pagamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.pedido_pagamentos ADD CONSTRAINT pedido_pagamentos_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: pedidos pedidos_numero_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_numero_key UNIQUE (numero);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: pedidos pedidos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.product_images ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: produtos produtos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.produtos ADD CONSTRAINT produtos_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: produtos produtos_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.produtos ADD CONSTRAINT produtos_sku_key UNIQUE (sku);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.tenants ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: tenants tenants_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.tenants ADD CONSTRAINT tenants_slug_key UNIQUE (slug);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.user_permissions ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (user_id, menu);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: api_keys_prefix_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS api_keys_prefix_idx ON public.api_keys USING btree (prefix);


--
-- Name: app_logs_cat_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS app_logs_cat_idx ON public.app_logs USING btree (categoria, created_at DESC);


--
-- Name: idx_product_images_nome_chave; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_product_images_nome_chave ON public.product_images USING btree (nome_chave);


--
-- Name: notificacoes_dedupe_open; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS notificacoes_dedupe_open ON public.notificacoes USING btree (dedupe_key) WHERE ((dedupe_key IS NOT NULL) AND (lida_em IS NULL));


--
-- Name: notificacoes_open_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS notificacoes_open_idx ON public.notificacoes USING btree (created_at DESC) WHERE (lida_em IS NULL);


--
-- Name: notificacoes_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS notificacoes_user_idx ON public.notificacoes USING btree (user_id, created_at DESC);


--
-- Name: pedido_pagamentos_pedido_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS pedido_pagamentos_pedido_idx ON public.pedido_pagamentos USING btree (pedido_id);


--
-- Name: pedidos_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS pedidos_created_idx ON public.pedidos USING btree (created_at DESC);


--
-- Name: pedidos_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS pedidos_status_idx ON public.pedidos USING btree (status);


--
-- Name: pedidos_vendedor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS pedidos_vendedor_idx ON public.pedidos USING btree (vendedor_id);


--
-- Name: produtos_barras_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS produtos_barras_idx ON public.produtos USING btree (codigo_barras);


--
-- Name: produtos_sku_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS produtos_sku_idx ON public.produtos USING btree (sku);


--
-- Name: profiles_tenant_slug_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS profiles_tenant_slug_uidx ON public.profiles USING btree (tenant_slug) WHERE (tenant_slug IS NOT NULL);


--
-- Name: ux_produtos_codigo_barras; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS ux_produtos_codigo_barras ON public.produtos USING btree (codigo_barras) WHERE (codigo_barras IS NOT NULL);



























--
-- Name: apply_estoque_from_item(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.apply_estoque_from_item() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_status text;
  v_tipo text;
  v_qtd_un numeric;
  v_tem_nf boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT status::text, COALESCE(tipo_operacao,'saida')
      INTO v_status, v_tipo
      FROM public.pedidos WHERE id = NEW.pedido_id;
    IF v_status = 'cancelado' THEN RETURN NEW; END IF;
    v_qtd_un := COALESCE(NEW.qtd,0) * COALESCE(NEW.qtd_un_por_embalagem,1);

    IF v_tipo = 'entrada' THEN
      SELECT COALESCE(tem_nota_fiscal,false) INTO v_tem_nf FROM public.produtos WHERE id = NEW.produto_id;
      UPDATE public.produtos
         SET estoque = estoque + v_qtd_un,
             estoque_fiscal = estoque_fiscal + CASE WHEN v_tem_nf THEN v_qtd_un ELSE 0 END,
             updated_at = now()
       WHERE id = NEW.produto_id;
      INSERT INTO public.estoque_movimentos (produto_id, tipo, qtd, motivo, referencia_id)
        VALUES (NEW.produto_id, 'entrada', v_qtd_un, 'Entrada de pedido', NEW.pedido_id);
    ELSE
      UPDATE public.produtos
         SET estoque = estoque - v_qtd_un,
             estoque_fiscal = GREATEST(0, estoque_fiscal - v_qtd_un),
             updated_at = now()
       WHERE id = NEW.produto_id;
      INSERT INTO public.estoque_movimentos (produto_id, tipo, qtd, motivo, referencia_id)
        VALUES (NEW.produto_id, 'saida', v_qtd_un, 'Pedido', NEW.pedido_id);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    SELECT status::text, COALESCE(tipo_operacao,'saida')
      INTO v_status, v_tipo
      FROM public.pedidos WHERE id = OLD.pedido_id;
    IF v_status = 'cancelado' THEN RETURN OLD; END IF;
    v_qtd_un := COALESCE(OLD.qtd,0) * COALESCE(OLD.qtd_un_por_embalagem,1);

    IF v_tipo = 'entrada' THEN
      SELECT COALESCE(tem_nota_fiscal,false) INTO v_tem_nf FROM public.produtos WHERE id = OLD.produto_id;
      UPDATE public.produtos
         SET estoque = estoque - v_qtd_un,
             estoque_fiscal = GREATEST(0, estoque_fiscal - CASE WHEN v_tem_nf THEN v_qtd_un ELSE 0 END),
             updated_at = now()
       WHERE id = OLD.produto_id;
      INSERT INTO public.estoque_movimentos (produto_id, tipo, qtd, motivo, referencia_id)
        VALUES (OLD.produto_id, 'saida', v_qtd_un, 'Estorno entrada', OLD.pedido_id);
    ELSE
      UPDATE public.produtos
         SET estoque = estoque + v_qtd_un, updated_at = now()
       WHERE id = OLD.produto_id;
      INSERT INTO public.estoque_movimentos (produto_id, tipo, qtd, motivo, referencia_id)
        VALUES (OLD.produto_id, 'entrada', v_qtd_un, 'Estorno pedido', OLD.pedido_id);
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;





--
-- Name: guard_pedido_faturado(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.guard_pedido_faturado() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF OLD.faturado = true AND NEW.faturado = false THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Pedido faturado não pode ser revertido';
    END IF;
  END IF;
  IF NEW.faturado = true AND (OLD.faturado IS DISTINCT FROM true) THEN
    NEW.faturado_em := COALESCE(NEW.faturado_em, now());
  END IF;
  RETURN NEW;
END;
$$;





--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), NEW.email);
  -- Default role: operador
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'operador') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;





--
-- Name: handle_pedido_cancelamento(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.handle_pedido_cancelamento() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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





--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;





--
-- Name: is_staff(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role IN ('admin','gerente','operador')) $$;





--
-- Name: notify_estoque_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.notify_estoque_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_min numeric := COALESCE(NEW.estoque_minimo, 0);
BEGIN
  IF NEW.estoque <= 0 AND COALESCE(OLD.estoque, 0) > 0 THEN
    INSERT INTO public.notificacoes (tipo, severidade, titulo, mensagem, payload, dedupe_key)
    VALUES (
      'estoque_zerado', 'critico',
      'Produto em ruptura',
      NEW.nome || ' está com estoque zerado.',
      jsonb_build_object('produto_id', NEW.id, 'nome', NEW.nome),
      'estoque_zerado:' || NEW.id::text
    )
    ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL AND lida_em IS NULL DO NOTHING;
  ELSIF v_min > 0 AND NEW.estoque > 0 AND NEW.estoque < v_min
        AND (OLD.estoque IS NULL OR OLD.estoque >= v_min) THEN
    INSERT INTO public.notificacoes (tipo, severidade, titulo, mensagem, payload, dedupe_key)
    VALUES (
      'estoque_baixo', 'aviso',
      'Estoque baixo',
      NEW.nome || ' abaixo do mínimo (' || NEW.estoque || ' / ' || v_min || ').',
      jsonb_build_object('produto_id', NEW.id, 'nome', NEW.nome),
      'estoque_baixo:' || NEW.id::text
    )
    ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL AND lida_em IS NULL DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;





--
-- Name: notify_pedido_event(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.notify_pedido_event() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notificacoes (tipo, severidade, titulo, mensagem, payload)
    VALUES (
      'pedido_novo', 'info',
      'Novo pedido ' || NEW.numero,
      'Total R$ ' || COALESCE(NEW.total, 0)::text,
      jsonb_build_object('pedido_id', NEW.id, 'numero', NEW.numero)
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status::text = 'cancelado' AND OLD.status::text <> 'cancelado' THEN
    INSERT INTO public.notificacoes (tipo, severidade, titulo, mensagem, payload)
    VALUES (
      'pedido_cancelado', 'aviso',
      'Pedido ' || NEW.numero || ' cancelado',
      'Estoque foi estornado.',
      jsonb_build_object('pedido_id', NEW.id, 'numero', NEW.numero)
    );
  END IF;
  RETURN NEW;
END;
$_$;





--
-- Name: recalc_pedido_pagamentos(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.recalc_pedido_pagamentos() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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





--
-- Name: recalc_pedido_restante(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.recalc_pedido_restante() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.total IS DISTINCT FROM OLD.total THEN
    NEW.restante := GREATEST(0, COALESCE(NEW.total, 0) - COALESCE(NEW.total_pago, 0));
  END IF;
  RETURN NEW;
END;
$$;





--
-- Name: touch_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;







--
-- Name: clientes clientes_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS clientes_touch ON public.clientes;
CREATE TRIGGER clientes_touch BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: pedidos pedidos_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS pedidos_touch ON public.pedidos;
CREATE TRIGGER pedidos_touch BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: produtos produtos_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS produtos_touch ON public.produtos;
CREATE TRIGGER produtos_touch BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: profiles profiles_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS profiles_touch ON public.profiles;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: app_settings trg_app_settings_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_app_settings_touch ON public.app_settings;
CREATE TRIGGER trg_app_settings_touch BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: fornecedores trg_fornecedores_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_fornecedores_updated ON public.fornecedores;
CREATE TRIGGER trg_fornecedores_updated BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: pedidos trg_guard_pedido_faturado; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_guard_pedido_faturado ON public.pedidos;
CREATE TRIGGER trg_guard_pedido_faturado BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.guard_pedido_faturado();


--
-- Name: produtos trg_notify_estoque; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_notify_estoque ON public.produtos;
CREATE TRIGGER trg_notify_estoque AFTER UPDATE OF estoque ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.notify_estoque_change();


--
-- Name: pedidos trg_notify_pedido_ins; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_notify_pedido_ins ON public.pedidos;
CREATE TRIGGER trg_notify_pedido_ins AFTER INSERT ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.notify_pedido_event();


--
-- Name: pedidos trg_notify_pedido_upd; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_notify_pedido_upd ON public.pedidos;
CREATE TRIGGER trg_notify_pedido_upd AFTER UPDATE OF status ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.notify_pedido_event();


--
-- Name: patrimonio trg_patrimonio_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_patrimonio_updated ON public.patrimonio;
CREATE TRIGGER trg_patrimonio_updated BEFORE UPDATE ON public.patrimonio FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: pedidos trg_pedido_cancelamento; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_pedido_cancelamento ON public.pedidos;
CREATE TRIGGER trg_pedido_cancelamento AFTER UPDATE OF status ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.handle_pedido_cancelamento();


--
-- Name: pedido_itens trg_pedido_itens_estoque; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_pedido_itens_estoque ON public.pedido_itens;
CREATE TRIGGER trg_pedido_itens_estoque AFTER INSERT OR DELETE ON public.pedido_itens FOR EACH ROW EXECUTE FUNCTION public.apply_estoque_from_item();


--
-- Name: pedido_pagamentos trg_recalc_pedido_pagamentos; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_recalc_pedido_pagamentos ON public.pedido_pagamentos;
CREATE TRIGGER trg_recalc_pedido_pagamentos AFTER INSERT OR DELETE OR UPDATE ON public.pedido_pagamentos FOR EACH ROW EXECUTE FUNCTION public.recalc_pedido_pagamentos();


--
-- Name: pedidos trg_recalc_pedido_restante; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_recalc_pedido_restante ON public.pedidos;
CREATE TRIGGER trg_recalc_pedido_restante BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.recalc_pedido_restante();


--
-- Name: api_keys api_keys_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.api_keys ADD CONSTRAINT api_keys_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: caixa_movimentos caixa_movimentos_sessao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.caixa_movimentos ADD CONSTRAINT caixa_movimentos_sessao_id_fkey FOREIGN KEY (sessao_id) REFERENCES public.caixa_sessoes(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: caixa_sessoes caixa_sessoes_operador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.caixa_sessoes ADD CONSTRAINT caixa_sessoes_operador_id_fkey FOREIGN KEY (operador_id) REFERENCES auth.users(id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: contas contas_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.contas ADD CONSTRAINT contas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: estoque_movimentos estoque_movimentos_produto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.estoque_movimentos ADD CONSTRAINT estoque_movimentos_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES public.produtos(id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: estoque_movimentos estoque_movimentos_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.estoque_movimentos ADD CONSTRAINT estoque_movimentos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: faturamento_pedidos faturamento_pedidos_faturamento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.faturamento_pedidos ADD CONSTRAINT faturamento_pedidos_faturamento_id_fkey FOREIGN KEY (faturamento_id) REFERENCES public.faturamentos(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: fidelidade_pontos fidelidade_pontos_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.fidelidade_pontos ADD CONSTRAINT fidelidade_pontos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: nfe_entradas nfe_entradas_confirmado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.nfe_entradas ADD CONSTRAINT nfe_entradas_confirmado_por_fkey FOREIGN KEY (confirmado_por) REFERENCES auth.users(id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: nfe_itens nfe_itens_nfe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.nfe_itens ADD CONSTRAINT nfe_itens_nfe_id_fkey FOREIGN KEY (nfe_id) REFERENCES public.nfe_entradas(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: nfe_itens nfe_itens_produto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.nfe_itens ADD CONSTRAINT nfe_itens_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES public.produtos(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: pedido_itens pedido_itens_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.pedido_itens ADD CONSTRAINT pedido_itens_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: pedido_itens pedido_itens_produto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.pedido_itens ADD CONSTRAINT pedido_itens_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES public.produtos(id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: pedido_pagamentos pedido_pagamentos_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.pedido_pagamentos ADD CONSTRAINT pedido_pagamentos_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: pedidos pedidos_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: pedidos pedidos_operador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_operador_id_fkey FOREIGN KEY (operador_id) REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: pedidos pedidos_vendedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.pedidos ADD CONSTRAINT pedidos_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: produtos produtos_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.produtos ADD CONSTRAINT produtos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: produtos produtos_fornecedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.produtos ADD CONSTRAINT produtos_fornecedor_id_fkey FOREIGN KEY (fornecedor_id) REFERENCES public.fornecedores(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $idem$ BEGIN
  ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; END $idem$;


--
-- Name: api_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: api_keys api_keys_admin_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS api_keys_admin_all ON public.api_keys;
CREATE POLICY api_keys_admin_all ON public.api_keys TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: app_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: app_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: app_settings app_settings_select_auth; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS app_settings_select_auth ON public.app_settings;
CREATE POLICY app_settings_select_auth ON public.app_settings FOR SELECT TO authenticated USING (true);


--
-- Name: app_settings app_settings_write_staff; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS app_settings_write_staff ON public.app_settings;
CREATE POLICY app_settings_write_staff ON public.app_settings TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: audit_logs audit_insert_any_auth; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS audit_insert_any_auth ON public.audit_logs;
CREATE POLICY audit_insert_any_auth ON public.audit_logs FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs audit_select_admin; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS audit_select_admin ON public.audit_logs;
CREATE POLICY audit_select_admin ON public.audit_logs FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'gerente'::public.app_role)));


--
-- Name: backups_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.backups_log ENABLE ROW LEVEL SECURITY;

--
-- Name: backups_log bklog_select_staff; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS bklog_select_staff ON public.backups_log;
CREATE POLICY bklog_select_staff ON public.backups_log FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));


--
-- Name: caixa_movimentos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.caixa_movimentos ENABLE ROW LEVEL SECURITY;

--
-- Name: caixa_sessoes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.caixa_sessoes ENABLE ROW LEVEL SECURITY;

--
-- Name: categorias cat_select_auth; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS cat_select_auth ON public.categorias;
CREATE POLICY cat_select_auth ON public.categorias FOR SELECT TO authenticated USING (true);


--
-- Name: categorias cat_write_staff; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS cat_write_staff ON public.categorias;
CREATE POLICY cat_write_staff ON public.categorias TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: categorias; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

--
-- Name: clientes cli_select_auth; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS cli_select_auth ON public.clientes;
CREATE POLICY cli_select_auth ON public.clientes FOR SELECT TO authenticated USING (true);


--
-- Name: clientes cli_write_staff; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS cli_write_staff ON public.clientes;
CREATE POLICY cli_write_staff ON public.clientes TO authenticated USING ((public.is_staff(auth.uid()) OR public.has_role(auth.uid(), 'vendedor'::public.app_role))) WITH CHECK ((public.is_staff(auth.uid()) OR public.has_role(auth.uid(), 'vendedor'::public.app_role)));


--
-- Name: clientes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

--
-- Name: contas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contas ENABLE ROW LEVEL SECURITY;

--
-- Name: contas ct_staff; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS ct_staff ON public.contas;
CREATE POLICY ct_staff ON public.contas TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: caixa_sessoes cx_select_staff; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS cx_select_staff ON public.caixa_sessoes;
CREATE POLICY cx_select_staff ON public.caixa_sessoes FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));


--
-- Name: caixa_sessoes cx_write_staff; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS cx_write_staff ON public.caixa_sessoes;
CREATE POLICY cx_write_staff ON public.caixa_sessoes TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: caixa_movimentos cxm_select_staff; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS cxm_select_staff ON public.caixa_movimentos;
CREATE POLICY cxm_select_staff ON public.caixa_movimentos FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));


--
-- Name: caixa_movimentos cxm_write_staff; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS cxm_write_staff ON public.caixa_movimentos;
CREATE POLICY cxm_write_staff ON public.caixa_movimentos TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: despesas desp_staff; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS desp_staff ON public.despesas;
CREATE POLICY desp_staff ON public.despesas TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: despesas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

--
-- Name: estoque_movimentos em_select_staff; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS em_select_staff ON public.estoque_movimentos;
CREATE POLICY em_select_staff ON public.estoque_movimentos FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));


--
-- Name: estoque_movimentos em_write_staff; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS em_write_staff ON public.estoque_movimentos;
CREATE POLICY em_write_staff ON public.estoque_movimentos TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: estoque_movimentos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.estoque_movimentos ENABLE ROW LEVEL SECURITY;

--
-- Name: faturamentos fat_staff; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS fat_staff ON public.faturamentos;
CREATE POLICY fat_staff ON public.faturamentos TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: faturamento_pedidos fatp_staff; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS fatp_staff ON public.faturamento_pedidos;
CREATE POLICY fatp_staff ON public.faturamento_pedidos TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: faturamento_pedidos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.faturamento_pedidos ENABLE ROW LEVEL SECURITY;

--
-- Name: faturamentos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.faturamentos ENABLE ROW LEVEL SECURITY;

--
-- Name: fidelidade_pontos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fidelidade_pontos ENABLE ROW LEVEL SECURITY;

--
-- Name: fornecedores forn_select_auth; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS forn_select_auth ON public.fornecedores;
CREATE POLICY forn_select_auth ON public.fornecedores FOR SELECT TO authenticated USING (true);


--
-- Name: fornecedores forn_write_staff; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS forn_write_staff ON public.fornecedores;
CREATE POLICY forn_write_staff ON public.fornecedores TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: fornecedores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

--
-- Name: fidelidade_pontos fp_staff; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS fp_staff ON public.fidelidade_pontos;
CREATE POLICY fp_staff ON public.fidelidade_pontos TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: gtin_global; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gtin_global ENABLE ROW LEVEL SECURITY;

--
-- Name: gtin_global gtin_read_auth; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS gtin_read_auth ON public.gtin_global;
CREATE POLICY gtin_read_auth ON public.gtin_global FOR SELECT TO authenticated USING (true);


--
-- Name: app_logs logs_insert_auth; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS logs_insert_auth ON public.app_logs;
CREATE POLICY logs_insert_auth ON public.app_logs FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: app_logs logs_select_staff; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS logs_select_staff ON public.app_logs;
CREATE POLICY logs_select_staff ON public.app_logs FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));


--
-- Name: nfe_entradas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nfe_entradas ENABLE ROW LEVEL SECURITY;

--
-- Name: nfe_itens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nfe_itens ENABLE ROW LEVEL SECURITY;

--
-- Name: nfe_entradas nfe_staff; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS nfe_staff ON public.nfe_entradas;
CREATE POLICY nfe_staff ON public.nfe_entradas TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: nfe_webhook_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nfe_webhook_events ENABLE ROW LEVEL SECURITY;

--
-- Name: nfe_itens nfei_staff; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS nfei_staff ON public.nfe_itens;
CREATE POLICY nfei_staff ON public.nfe_itens TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: nfe_webhook_events nfew_insert_service; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS nfew_insert_service ON public.nfe_webhook_events;
CREATE POLICY nfew_insert_service ON public.nfe_webhook_events FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: nfe_webhook_events nfew_select_staff; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS nfew_select_staff ON public.nfe_webhook_events;
CREATE POLICY nfew_select_staff ON public.nfe_webhook_events FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));


--
-- Name: notificacoes notif_insert_staff; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS notif_insert_staff ON public.notificacoes;
CREATE POLICY notif_insert_staff ON public.notificacoes FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: notificacoes notif_select_own_or_broadcast; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS notif_select_own_or_broadcast ON public.notificacoes;
CREATE POLICY notif_select_own_or_broadcast ON public.notificacoes FOR SELECT TO authenticated USING (((user_id IS NULL) OR (user_id = auth.uid()) OR public.is_staff(auth.uid())));


--
-- Name: notificacoes notif_update_own; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS notif_update_own ON public.notificacoes;
CREATE POLICY notif_update_own ON public.notificacoes FOR UPDATE TO authenticated USING (((user_id = auth.uid()) OR public.is_staff(auth.uid()))) WITH CHECK (((user_id = auth.uid()) OR public.is_staff(auth.uid())));


--
-- Name: notificacoes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

--
-- Name: patrimonio patr_staff; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS patr_staff ON public.patrimonio;
CREATE POLICY patr_staff ON public.patrimonio TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: patrimonio; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patrimonio ENABLE ROW LEVEL SECURITY;

--
-- Name: pedidos ped_delete_admin; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS ped_delete_admin ON public.pedidos;
CREATE POLICY ped_delete_admin ON public.pedidos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: pedidos ped_insert_scope; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS ped_insert_scope ON public.pedidos;
CREATE POLICY ped_insert_scope ON public.pedidos FOR INSERT TO authenticated WITH CHECK ((public.is_staff(auth.uid()) OR (public.has_role(auth.uid(), 'vendedor'::public.app_role) AND (vendedor_id = auth.uid()))));


--
-- Name: pedidos ped_select_scope; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS ped_select_scope ON public.pedidos;
CREATE POLICY ped_select_scope ON public.pedidos FOR SELECT TO authenticated USING ((public.is_staff(auth.uid()) OR (vendedor_id = auth.uid())));


--
-- Name: pedidos ped_update_scope; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS ped_update_scope ON public.pedidos;
CREATE POLICY ped_update_scope ON public.pedidos FOR UPDATE TO authenticated USING ((public.is_staff(auth.uid()) OR (public.has_role(auth.uid(), 'vendedor'::public.app_role) AND (vendedor_id = auth.uid()) AND (status = 'pendente'::public.pedido_status))));


--
-- Name: pedido_itens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;

--
-- Name: pedido_pagamentos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pedido_pagamentos ENABLE ROW LEVEL SECURITY;

--
-- Name: pedidos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

--
-- Name: pedido_itens pi_select_scope; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS pi_select_scope ON public.pedido_itens;
CREATE POLICY pi_select_scope ON public.pedido_itens FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.pedidos p
  WHERE ((p.id = pedido_itens.pedido_id) AND (public.is_staff(auth.uid()) OR (p.vendedor_id = auth.uid()))))));


--
-- Name: pedido_itens pi_write_scope; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS pi_write_scope ON public.pedido_itens;
CREATE POLICY pi_write_scope ON public.pedido_itens TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.pedidos p
  WHERE ((p.id = pedido_itens.pedido_id) AND (public.is_staff(auth.uid()) OR (p.vendedor_id = auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.pedidos p
  WHERE ((p.id = pedido_itens.pedido_id) AND (public.is_staff(auth.uid()) OR (p.vendedor_id = auth.uid()))))));


--
-- Name: product_images pimg_select_auth; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS pimg_select_auth ON public.product_images;
CREATE POLICY pimg_select_auth ON public.product_images FOR SELECT TO authenticated USING (true);


--
-- Name: product_images pimg_write_staff; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS pimg_write_staff ON public.product_images;
CREATE POLICY pimg_write_staff ON public.product_images TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: pedido_pagamentos pp_select_scope; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS pp_select_scope ON public.pedido_pagamentos;
CREATE POLICY pp_select_scope ON public.pedido_pagamentos FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.pedidos p
  WHERE ((p.id = pedido_pagamentos.pedido_id) AND (public.is_staff(auth.uid()) OR (p.vendedor_id = auth.uid()))))));


--
-- Name: pedido_pagamentos pp_write_scope; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS pp_write_scope ON public.pedido_pagamentos;
CREATE POLICY pp_write_scope ON public.pedido_pagamentos TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.pedidos p
  WHERE ((p.id = pedido_pagamentos.pedido_id) AND (public.is_staff(auth.uid()) OR (p.vendedor_id = auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.pedidos p
  WHERE ((p.id = pedido_pagamentos.pedido_id) AND (public.is_staff(auth.uid()) OR (p.vendedor_id = auth.uid()))))));


--
-- Name: produtos prod_select_auth; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS prod_select_auth ON public.produtos;
CREATE POLICY prod_select_auth ON public.produtos FOR SELECT TO authenticated USING (true);


--
-- Name: produtos prod_write_staff; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS prod_write_staff ON public.produtos;
CREATE POLICY prod_write_staff ON public.produtos TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: product_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

--
-- Name: produtos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_admin_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
CREATE POLICY profiles_admin_all ON public.profiles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles profiles_select_all_auth; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS profiles_select_all_auth ON public.profiles;
CREATE POLICY profiles_select_all_auth ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: profiles profiles_update_self; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid()));


--
-- Name: user_roles roles_admin_write; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS roles_admin_write ON public.user_roles;
CREATE POLICY roles_admin_write ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles roles_select_self_or_admin; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS roles_select_self_or_admin ON public.user_roles;
CREATE POLICY roles_select_self_or_admin ON public.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: tenants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

--
-- Name: tenants tenants_admin_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS tenants_admin_all ON public.tenants;
CREATE POLICY tenants_admin_all ON public.tenants TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tenants tenants_owner_select; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS tenants_owner_select ON public.tenants;
CREATE POLICY tenants_owner_select ON public.tenants FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_permissions uperm_admin_all; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS uperm_admin_all ON public.user_permissions;
CREATE POLICY uperm_admin_all ON public.user_permissions TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_permissions uperm_self_select; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS uperm_self_select ON public.user_permissions;
CREATE POLICY uperm_self_select ON public.user_permissions FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION apply_estoque_from_item(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.apply_estoque_from_item() FROM PUBLIC;
GRANT ALL ON FUNCTION public.apply_estoque_from_item() TO service_role;


--
-- Name: FUNCTION guard_pedido_faturado(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.guard_pedido_faturado() TO anon;
GRANT ALL ON FUNCTION public.guard_pedido_faturado() TO authenticated;
GRANT ALL ON FUNCTION public.guard_pedido_faturado() TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION handle_pedido_cancelamento(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.handle_pedido_cancelamento() FROM PUBLIC;
GRANT ALL ON FUNCTION public.handle_pedido_cancelamento() TO service_role;


--
-- Name: FUNCTION has_role(_user_id uuid, _role public.app_role); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) FROM PUBLIC;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO authenticated;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO service_role;


--
-- Name: FUNCTION is_staff(_user_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.is_staff(_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_staff(_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_staff(_user_id uuid) TO service_role;


--
-- Name: FUNCTION notify_estoque_change(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.notify_estoque_change() FROM PUBLIC;
GRANT ALL ON FUNCTION public.notify_estoque_change() TO service_role;


--
-- Name: FUNCTION notify_pedido_event(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.notify_pedido_event() FROM PUBLIC;
GRANT ALL ON FUNCTION public.notify_pedido_event() TO service_role;


--
-- Name: FUNCTION recalc_pedido_pagamentos(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.recalc_pedido_pagamentos() FROM PUBLIC;
GRANT ALL ON FUNCTION public.recalc_pedido_pagamentos() TO service_role;


--
-- Name: FUNCTION recalc_pedido_restante(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.recalc_pedido_restante() FROM PUBLIC;
GRANT ALL ON FUNCTION public.recalc_pedido_restante() TO service_role;


--
-- Name: FUNCTION touch_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.touch_updated_at() TO anon;
GRANT ALL ON FUNCTION public.touch_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.touch_updated_at() TO service_role;


--
-- Name: TABLE api_keys; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.api_keys TO anon;
GRANT ALL ON TABLE public.api_keys TO authenticated;
GRANT ALL ON TABLE public.api_keys TO service_role;


--
-- Name: TABLE app_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.app_logs TO anon;
GRANT ALL ON TABLE public.app_logs TO authenticated;
GRANT ALL ON TABLE public.app_logs TO service_role;


--
-- Name: TABLE app_settings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.app_settings TO anon;
GRANT ALL ON TABLE public.app_settings TO authenticated;
GRANT ALL ON TABLE public.app_settings TO service_role;


--
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_logs TO anon;
GRANT ALL ON TABLE public.audit_logs TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;


--
-- Name: TABLE backups_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.backups_log TO anon;
GRANT ALL ON TABLE public.backups_log TO authenticated;
GRANT ALL ON TABLE public.backups_log TO service_role;


--
-- Name: TABLE caixa_movimentos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.caixa_movimentos TO anon;
GRANT ALL ON TABLE public.caixa_movimentos TO authenticated;
GRANT ALL ON TABLE public.caixa_movimentos TO service_role;


--
-- Name: TABLE caixa_sessoes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.caixa_sessoes TO anon;
GRANT ALL ON TABLE public.caixa_sessoes TO authenticated;
GRANT ALL ON TABLE public.caixa_sessoes TO service_role;


--
-- Name: TABLE categorias; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.categorias TO anon;
GRANT ALL ON TABLE public.categorias TO authenticated;
GRANT ALL ON TABLE public.categorias TO service_role;


--
-- Name: TABLE clientes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.clientes TO anon;
GRANT ALL ON TABLE public.clientes TO authenticated;
GRANT ALL ON TABLE public.clientes TO service_role;


--
-- Name: TABLE contas; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.contas TO anon;
GRANT ALL ON TABLE public.contas TO authenticated;
GRANT ALL ON TABLE public.contas TO service_role;


--
-- Name: TABLE despesas; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.despesas TO anon;
GRANT ALL ON TABLE public.despesas TO authenticated;
GRANT ALL ON TABLE public.despesas TO service_role;


--
-- Name: TABLE estoque_movimentos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.estoque_movimentos TO anon;
GRANT ALL ON TABLE public.estoque_movimentos TO authenticated;
GRANT ALL ON TABLE public.estoque_movimentos TO service_role;


--
-- Name: TABLE faturamento_pedidos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.faturamento_pedidos TO anon;
GRANT ALL ON TABLE public.faturamento_pedidos TO authenticated;
GRANT ALL ON TABLE public.faturamento_pedidos TO service_role;


--
-- Name: SEQUENCE faturamentos_numero_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.faturamentos_numero_seq TO anon;
GRANT ALL ON SEQUENCE public.faturamentos_numero_seq TO authenticated;
GRANT ALL ON SEQUENCE public.faturamentos_numero_seq TO service_role;


--
-- Name: TABLE faturamentos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.faturamentos TO anon;
GRANT ALL ON TABLE public.faturamentos TO authenticated;
GRANT ALL ON TABLE public.faturamentos TO service_role;


--
-- Name: TABLE fidelidade_pontos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.fidelidade_pontos TO anon;
GRANT ALL ON TABLE public.fidelidade_pontos TO authenticated;
GRANT ALL ON TABLE public.fidelidade_pontos TO service_role;


--
-- Name: TABLE fornecedores; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.fornecedores TO anon;
GRANT ALL ON TABLE public.fornecedores TO authenticated;
GRANT ALL ON TABLE public.fornecedores TO service_role;


--
-- Name: TABLE gtin_global; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.gtin_global TO anon;
GRANT ALL ON TABLE public.gtin_global TO authenticated;
GRANT ALL ON TABLE public.gtin_global TO service_role;


--
-- Name: TABLE nfe_entradas; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.nfe_entradas TO anon;
GRANT ALL ON TABLE public.nfe_entradas TO authenticated;
GRANT ALL ON TABLE public.nfe_entradas TO service_role;


--
-- Name: TABLE nfe_itens; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.nfe_itens TO anon;
GRANT ALL ON TABLE public.nfe_itens TO authenticated;
GRANT ALL ON TABLE public.nfe_itens TO service_role;


--
-- Name: TABLE nfe_webhook_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.nfe_webhook_events TO anon;
GRANT ALL ON TABLE public.nfe_webhook_events TO authenticated;
GRANT ALL ON TABLE public.nfe_webhook_events TO service_role;


--
-- Name: TABLE notificacoes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notificacoes TO anon;
GRANT ALL ON TABLE public.notificacoes TO authenticated;
GRANT ALL ON TABLE public.notificacoes TO service_role;


--
-- Name: TABLE patrimonio; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.patrimonio TO anon;
GRANT ALL ON TABLE public.patrimonio TO authenticated;
GRANT ALL ON TABLE public.patrimonio TO service_role;


--
-- Name: TABLE pedido_itens; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pedido_itens TO anon;
GRANT ALL ON TABLE public.pedido_itens TO authenticated;
GRANT ALL ON TABLE public.pedido_itens TO service_role;


--
-- Name: TABLE pedido_pagamentos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pedido_pagamentos TO anon;
GRANT ALL ON TABLE public.pedido_pagamentos TO authenticated;
GRANT ALL ON TABLE public.pedido_pagamentos TO service_role;


--
-- Name: SEQUENCE pedidos_numero_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.pedidos_numero_seq TO anon;
GRANT ALL ON SEQUENCE public.pedidos_numero_seq TO authenticated;
GRANT ALL ON SEQUENCE public.pedidos_numero_seq TO service_role;


--
-- Name: TABLE pedidos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pedidos TO anon;
GRANT ALL ON TABLE public.pedidos TO authenticated;
GRANT ALL ON TABLE public.pedidos TO service_role;


--
-- Name: TABLE product_images; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.product_images TO anon;
GRANT ALL ON TABLE public.product_images TO authenticated;
GRANT ALL ON TABLE public.product_images TO service_role;


--
-- Name: TABLE produtos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.produtos TO anon;
GRANT ALL ON TABLE public.produtos TO authenticated;
GRANT ALL ON TABLE public.produtos TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE tenants; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tenants TO anon;
GRANT ALL ON TABLE public.tenants TO authenticated;
GRANT ALL ON TABLE public.tenants TO service_role;


--
-- Name: TABLE user_permissions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_permissions TO anon;
GRANT ALL ON TABLE public.user_permissions TO authenticated;
GRANT ALL ON TABLE public.user_permissions TO service_role;


--
-- Name: TABLE user_roles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_roles TO anon;
GRANT ALL ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;








--
-- PostgreSQL database dump complete
--


