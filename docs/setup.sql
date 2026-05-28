-- ============================================================
-- LyneCloud · Schema completo (tenants Supabase)
-- Cole este SQL no SQL Editor do projeto Supabase do cliente e EXECUTE.
-- Idempotente: pode rodar em projeto vazio. Não roda em projeto que já
-- tem outras tabelas conflitantes — limpe antes se necessário.
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

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'gerente',
    'operador',
    'vendedor'
);


--
-- Name: caixa_mov_tipo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.caixa_mov_tipo AS ENUM (
    'sangria',
    'suprimento',
    'venda',
    'despesa'
);


--
-- Name: caixa_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.caixa_status AS ENUM (
    'aberto',
    'fechado'
);


--
-- Name: conta_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.conta_status AS ENUM (
    'pendente',
    'pago',
    'atrasado',
    'cancelado'
);


--
-- Name: conta_tipo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.conta_tipo AS ENUM (
    'pagar',
    'receber'
);


--
-- Name: estoque_mov_tipo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estoque_mov_tipo AS ENUM (
    'entrada',
    'saida',
    'ajuste',
    'perda'
);


--
-- Name: nfe_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.nfe_status AS ENUM (
    'importado',
    'conferindo',
    'confirmado'
);


--
-- Name: pagamento_tipo; Type: TYPE; Schema: public; Owner: -
--

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


--
-- Name: pedido_origem; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.pedido_origem AS ENUM (
    'balcao',
    'pdv',
    'vendedor',
    'delivery'
);


--
-- Name: pedido_status; Type: TYPE; Schema: public; Owner: -
--

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


--
-- Name: apply_estoque_from_item(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_estoque_from_item() RETURNS trigger
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

CREATE FUNCTION public.guard_pedido_faturado() RETURNS trigger
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

CREATE FUNCTION public.handle_new_user() RETURNS trigger
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

CREATE FUNCTION public.handle_pedido_cancelamento() RETURNS trigger
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

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;


--
-- Name: is_staff(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_staff(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role IN ('admin','gerente','operador')) $$;


--
-- Name: notify_estoque_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_estoque_change() RETURNS trigger
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

CREATE FUNCTION public.notify_pedido_event() RETURNS trigger
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

CREATE FUNCTION public.recalc_pedido_pagamentos() RETURNS trigger
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

CREATE FUNCTION public.recalc_pedido_restante() RETURNS trigger
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

CREATE FUNCTION public.touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;




--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_keys (
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

CREATE TABLE public.app_logs (
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

CREATE TABLE public.app_settings (
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

CREATE TABLE public.audit_logs (
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

CREATE TABLE public.backups_log (
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

CREATE TABLE public.caixa_movimentos (
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

CREATE TABLE public.caixa_sessoes (
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

CREATE TABLE public.categorias (
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

CREATE TABLE public.clientes (
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

CREATE TABLE public.contas (
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

CREATE TABLE public.despesas (
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

CREATE TABLE public.estoque_movimentos (
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

CREATE TABLE public.faturamento_pedidos (
    faturamento_id uuid NOT NULL,
    pedido_id uuid NOT NULL
);


--
-- Name: faturamentos_numero_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.faturamentos_numero_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: faturamentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.faturamentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    numero text DEFAULT ('F'::text || lpad((nextval('public.faturamentos_numero_seq'::regclass))::text, 5, '0'::text)) NOT NULL,
    total numeric DEFAULT 0 NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fidelidade_pontos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fidelidade_pontos (
    cliente_id uuid NOT NULL,
    pontos integer DEFAULT 0 NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fornecedores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fornecedores (
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

CREATE TABLE public.gtin_global (
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

CREATE TABLE public.nfe_entradas (
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

CREATE TABLE public.nfe_itens (
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

CREATE TABLE public.nfe_webhook_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    evento text NOT NULL,
    payload jsonb NOT NULL,
    pedido_id uuid,
    recebido_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notificacoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notificacoes (
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

CREATE TABLE public.patrimonio (
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

CREATE TABLE public.pedido_itens (
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

CREATE TABLE public.pedido_pagamentos (
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

CREATE SEQUENCE public.pedidos_numero_seq
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pedidos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pedidos (
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

CREATE TABLE public.product_images (
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

CREATE TABLE public.produtos (
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

CREATE TABLE public.profiles (
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

CREATE TABLE public.tenants (
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

CREATE TABLE public.user_permissions (
    user_id uuid NOT NULL,
    menu text NOT NULL,
    allowed boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: api_keys api_keys_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_key_hash_key UNIQUE (key_hash);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_prefix_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_prefix_key UNIQUE (prefix);


--
-- Name: app_logs app_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_logs
    ADD CONSTRAINT app_logs_pkey PRIMARY KEY (id);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: backups_log backups_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backups_log
    ADD CONSTRAINT backups_log_pkey PRIMARY KEY (id);


--
-- Name: caixa_movimentos caixa_movimentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caixa_movimentos
    ADD CONSTRAINT caixa_movimentos_pkey PRIMARY KEY (id);


--
-- Name: caixa_sessoes caixa_sessoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caixa_sessoes
    ADD CONSTRAINT caixa_sessoes_pkey PRIMARY KEY (id);


--
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: contas contas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contas
    ADD CONSTRAINT contas_pkey PRIMARY KEY (id);


--
-- Name: despesas despesas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.despesas
    ADD CONSTRAINT despesas_pkey PRIMARY KEY (id);


--
-- Name: estoque_movimentos estoque_movimentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estoque_movimentos
    ADD CONSTRAINT estoque_movimentos_pkey PRIMARY KEY (id);


--
-- Name: faturamento_pedidos faturamento_pedidos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faturamento_pedidos
    ADD CONSTRAINT faturamento_pedidos_pkey PRIMARY KEY (faturamento_id, pedido_id);


--
-- Name: faturamentos faturamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faturamentos
    ADD CONSTRAINT faturamentos_pkey PRIMARY KEY (id);


--
-- Name: fidelidade_pontos fidelidade_pontos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fidelidade_pontos
    ADD CONSTRAINT fidelidade_pontos_pkey PRIMARY KEY (cliente_id);


--
-- Name: fornecedores fornecedores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fornecedores
    ADD CONSTRAINT fornecedores_pkey PRIMARY KEY (id);


--
-- Name: gtin_global gtin_global_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gtin_global
    ADD CONSTRAINT gtin_global_pkey PRIMARY KEY (gtin);


--
-- Name: nfe_entradas nfe_entradas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nfe_entradas
    ADD CONSTRAINT nfe_entradas_pkey PRIMARY KEY (id);


--
-- Name: nfe_itens nfe_itens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nfe_itens
    ADD CONSTRAINT nfe_itens_pkey PRIMARY KEY (id);


--
-- Name: nfe_webhook_events nfe_webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nfe_webhook_events
    ADD CONSTRAINT nfe_webhook_events_pkey PRIMARY KEY (id);


--
-- Name: notificacoes notificacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacoes
    ADD CONSTRAINT notificacoes_pkey PRIMARY KEY (id);


--
-- Name: patrimonio patrimonio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patrimonio
    ADD CONSTRAINT patrimonio_pkey PRIMARY KEY (id);


--
-- Name: pedido_itens pedido_itens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedido_itens
    ADD CONSTRAINT pedido_itens_pkey PRIMARY KEY (id);


--
-- Name: pedido_pagamentos pedido_pagamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedido_pagamentos
    ADD CONSTRAINT pedido_pagamentos_pkey PRIMARY KEY (id);


--
-- Name: pedidos pedidos_numero_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_numero_key UNIQUE (numero);


--
-- Name: pedidos pedidos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_pkey PRIMARY KEY (id);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- Name: produtos produtos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produtos
    ADD CONSTRAINT produtos_pkey PRIMARY KEY (id);


--
-- Name: produtos produtos_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produtos
    ADD CONSTRAINT produtos_sku_key UNIQUE (sku);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_key UNIQUE (slug);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (user_id, menu);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: api_keys_prefix_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX api_keys_prefix_idx ON public.api_keys USING btree (prefix);


--
-- Name: app_logs_cat_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX app_logs_cat_idx ON public.app_logs USING btree (categoria, created_at DESC);


--
-- Name: idx_product_images_nome_chave; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_images_nome_chave ON public.product_images USING btree (nome_chave);


--
-- Name: notificacoes_dedupe_open; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX notificacoes_dedupe_open ON public.notificacoes USING btree (dedupe_key) WHERE ((dedupe_key IS NOT NULL) AND (lida_em IS NULL));


--
-- Name: notificacoes_open_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notificacoes_open_idx ON public.notificacoes USING btree (created_at DESC) WHERE (lida_em IS NULL);


--
-- Name: notificacoes_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notificacoes_user_idx ON public.notificacoes USING btree (user_id, created_at DESC);


--
-- Name: pedido_pagamentos_pedido_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pedido_pagamentos_pedido_idx ON public.pedido_pagamentos USING btree (pedido_id);


--
-- Name: pedidos_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pedidos_created_idx ON public.pedidos USING btree (created_at DESC);


--
-- Name: pedidos_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pedidos_status_idx ON public.pedidos USING btree (status);


--
-- Name: pedidos_vendedor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pedidos_vendedor_idx ON public.pedidos USING btree (vendedor_id);


--
-- Name: produtos_barras_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX produtos_barras_idx ON public.produtos USING btree (codigo_barras);


--
-- Name: produtos_sku_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX produtos_sku_idx ON public.produtos USING btree (sku);


--
-- Name: profiles_tenant_slug_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX profiles_tenant_slug_uidx ON public.profiles USING btree (tenant_slug) WHERE (tenant_slug IS NOT NULL);


--
-- Name: ux_produtos_codigo_barras; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_produtos_codigo_barras ON public.produtos USING btree (codigo_barras) WHERE (codigo_barras IS NOT NULL);


--
-- Name: clientes clientes_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER clientes_touch BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: pedidos pedidos_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER pedidos_touch BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: produtos produtos_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER produtos_touch BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: profiles profiles_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: app_settings trg_app_settings_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_app_settings_touch BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: fornecedores trg_fornecedores_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_fornecedores_updated BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: pedidos trg_guard_pedido_faturado; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_guard_pedido_faturado BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.guard_pedido_faturado();


--
-- Name: produtos trg_notify_estoque; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_estoque AFTER UPDATE OF estoque ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.notify_estoque_change();


--
-- Name: pedidos trg_notify_pedido_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_pedido_ins AFTER INSERT ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.notify_pedido_event();


--
-- Name: pedidos trg_notify_pedido_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_pedido_upd AFTER UPDATE OF status ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.notify_pedido_event();


--
-- Name: patrimonio trg_patrimonio_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_patrimonio_updated BEFORE UPDATE ON public.patrimonio FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: pedidos trg_pedido_cancelamento; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pedido_cancelamento AFTER UPDATE OF status ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.handle_pedido_cancelamento();


--
-- Name: pedido_itens trg_pedido_itens_estoque; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pedido_itens_estoque AFTER INSERT OR DELETE ON public.pedido_itens FOR EACH ROW EXECUTE FUNCTION public.apply_estoque_from_item();


--
-- Name: pedido_pagamentos trg_recalc_pedido_pagamentos; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_recalc_pedido_pagamentos AFTER INSERT OR DELETE OR UPDATE ON public.pedido_pagamentos FOR EACH ROW EXECUTE FUNCTION public.recalc_pedido_pagamentos();


--
-- Name: pedidos trg_recalc_pedido_restante; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_recalc_pedido_restante BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.recalc_pedido_restante();


--
-- Name: api_keys api_keys_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: caixa_movimentos caixa_movimentos_sessao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caixa_movimentos
    ADD CONSTRAINT caixa_movimentos_sessao_id_fkey FOREIGN KEY (sessao_id) REFERENCES public.caixa_sessoes(id) ON DELETE CASCADE;


--
-- Name: caixa_sessoes caixa_sessoes_operador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.caixa_sessoes
    ADD CONSTRAINT caixa_sessoes_operador_id_fkey FOREIGN KEY (operador_id) REFERENCES auth.users(id);


--
-- Name: contas contas_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contas
    ADD CONSTRAINT contas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;


--
-- Name: estoque_movimentos estoque_movimentos_produto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estoque_movimentos
    ADD CONSTRAINT estoque_movimentos_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES public.produtos(id);


--
-- Name: estoque_movimentos estoque_movimentos_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estoque_movimentos
    ADD CONSTRAINT estoque_movimentos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: faturamento_pedidos faturamento_pedidos_faturamento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.faturamento_pedidos
    ADD CONSTRAINT faturamento_pedidos_faturamento_id_fkey FOREIGN KEY (faturamento_id) REFERENCES public.faturamentos(id) ON DELETE CASCADE;


--
-- Name: fidelidade_pontos fidelidade_pontos_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fidelidade_pontos
    ADD CONSTRAINT fidelidade_pontos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: nfe_entradas nfe_entradas_confirmado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nfe_entradas
    ADD CONSTRAINT nfe_entradas_confirmado_por_fkey FOREIGN KEY (confirmado_por) REFERENCES auth.users(id);


--
-- Name: nfe_itens nfe_itens_nfe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nfe_itens
    ADD CONSTRAINT nfe_itens_nfe_id_fkey FOREIGN KEY (nfe_id) REFERENCES public.nfe_entradas(id) ON DELETE CASCADE;


--
-- Name: nfe_itens nfe_itens_produto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nfe_itens
    ADD CONSTRAINT nfe_itens_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES public.produtos(id) ON DELETE SET NULL;


--
-- Name: pedido_itens pedido_itens_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedido_itens
    ADD CONSTRAINT pedido_itens_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE CASCADE;


--
-- Name: pedido_itens pedido_itens_produto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedido_itens
    ADD CONSTRAINT pedido_itens_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES public.produtos(id);


--
-- Name: pedido_pagamentos pedido_pagamentos_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedido_pagamentos
    ADD CONSTRAINT pedido_pagamentos_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE CASCADE;


--
-- Name: pedidos pedidos_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;


--
-- Name: pedidos pedidos_operador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_operador_id_fkey FOREIGN KEY (operador_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: pedidos pedidos_vendedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: produtos produtos_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produtos
    ADD CONSTRAINT produtos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON DELETE SET NULL;


--
-- Name: produtos produtos_fornecedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produtos
    ADD CONSTRAINT produtos_fornecedor_id_fkey FOREIGN KEY (fornecedor_id) REFERENCES public.fornecedores(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: api_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: api_keys api_keys_admin_all; Type: POLICY; Schema: public; Owner: -
--

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

CREATE POLICY app_settings_select_auth ON public.app_settings FOR SELECT TO authenticated USING (true);


--
-- Name: app_settings app_settings_write_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_settings_write_staff ON public.app_settings TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: audit_logs audit_insert_any_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_insert_any_auth ON public.audit_logs FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs audit_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_select_admin ON public.audit_logs FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'gerente'::public.app_role)));


--
-- Name: backups_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.backups_log ENABLE ROW LEVEL SECURITY;

--
-- Name: backups_log bklog_select_staff; Type: POLICY; Schema: public; Owner: -
--

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

CREATE POLICY cat_select_auth ON public.categorias FOR SELECT TO authenticated USING (true);


--
-- Name: categorias cat_write_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cat_write_staff ON public.categorias TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: categorias; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

--
-- Name: clientes cli_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cli_select_auth ON public.clientes FOR SELECT TO authenticated USING (true);


--
-- Name: clientes cli_write_staff; Type: POLICY; Schema: public; Owner: -
--

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

CREATE POLICY ct_staff ON public.contas TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: caixa_sessoes cx_select_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cx_select_staff ON public.caixa_sessoes FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));


--
-- Name: caixa_sessoes cx_write_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cx_write_staff ON public.caixa_sessoes TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: caixa_movimentos cxm_select_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cxm_select_staff ON public.caixa_movimentos FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));


--
-- Name: caixa_movimentos cxm_write_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cxm_write_staff ON public.caixa_movimentos TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: despesas desp_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY desp_staff ON public.despesas TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: despesas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

--
-- Name: estoque_movimentos em_select_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY em_select_staff ON public.estoque_movimentos FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));


--
-- Name: estoque_movimentos em_write_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY em_write_staff ON public.estoque_movimentos TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: estoque_movimentos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.estoque_movimentos ENABLE ROW LEVEL SECURITY;

--
-- Name: faturamentos fat_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fat_staff ON public.faturamentos TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: faturamento_pedidos fatp_staff; Type: POLICY; Schema: public; Owner: -
--

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

CREATE POLICY forn_select_auth ON public.fornecedores FOR SELECT TO authenticated USING (true);


--
-- Name: fornecedores forn_write_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY forn_write_staff ON public.fornecedores TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: fornecedores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

--
-- Name: fidelidade_pontos fp_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fp_staff ON public.fidelidade_pontos TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: gtin_global; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gtin_global ENABLE ROW LEVEL SECURITY;

--
-- Name: gtin_global gtin_read_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gtin_read_auth ON public.gtin_global FOR SELECT TO authenticated USING (true);


--
-- Name: app_logs logs_insert_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY logs_insert_auth ON public.app_logs FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: app_logs logs_select_staff; Type: POLICY; Schema: public; Owner: -
--

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

CREATE POLICY nfe_staff ON public.nfe_entradas TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: nfe_webhook_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nfe_webhook_events ENABLE ROW LEVEL SECURITY;

--
-- Name: nfe_itens nfei_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nfei_staff ON public.nfe_itens TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: nfe_webhook_events nfew_insert_service; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nfew_insert_service ON public.nfe_webhook_events FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: nfe_webhook_events nfew_select_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY nfew_select_staff ON public.nfe_webhook_events FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));


--
-- Name: notificacoes notif_insert_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notif_insert_staff ON public.notificacoes FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: notificacoes notif_select_own_or_broadcast; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notif_select_own_or_broadcast ON public.notificacoes FOR SELECT TO authenticated USING (((user_id IS NULL) OR (user_id = auth.uid()) OR public.is_staff(auth.uid())));


--
-- Name: notificacoes notif_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notif_update_own ON public.notificacoes FOR UPDATE TO authenticated USING (((user_id = auth.uid()) OR public.is_staff(auth.uid()))) WITH CHECK (((user_id = auth.uid()) OR public.is_staff(auth.uid())));


--
-- Name: notificacoes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

--
-- Name: patrimonio patr_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY patr_staff ON public.patrimonio TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: patrimonio; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patrimonio ENABLE ROW LEVEL SECURITY;

--
-- Name: pedidos ped_delete_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ped_delete_admin ON public.pedidos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: pedidos ped_insert_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ped_insert_scope ON public.pedidos FOR INSERT TO authenticated WITH CHECK ((public.is_staff(auth.uid()) OR (public.has_role(auth.uid(), 'vendedor'::public.app_role) AND (vendedor_id = auth.uid()))));


--
-- Name: pedidos ped_select_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ped_select_scope ON public.pedidos FOR SELECT TO authenticated USING ((public.is_staff(auth.uid()) OR (vendedor_id = auth.uid())));


--
-- Name: pedidos ped_update_scope; Type: POLICY; Schema: public; Owner: -
--

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

CREATE POLICY pi_select_scope ON public.pedido_itens FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.pedidos p
  WHERE ((p.id = pedido_itens.pedido_id) AND (public.is_staff(auth.uid()) OR (p.vendedor_id = auth.uid()))))));


--
-- Name: pedido_itens pi_write_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pi_write_scope ON public.pedido_itens TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.pedidos p
  WHERE ((p.id = pedido_itens.pedido_id) AND (public.is_staff(auth.uid()) OR (p.vendedor_id = auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.pedidos p
  WHERE ((p.id = pedido_itens.pedido_id) AND (public.is_staff(auth.uid()) OR (p.vendedor_id = auth.uid()))))));


--
-- Name: product_images pimg_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pimg_select_auth ON public.product_images FOR SELECT TO authenticated USING (true);


--
-- Name: product_images pimg_write_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pimg_write_staff ON public.product_images TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));


--
-- Name: pedido_pagamentos pp_select_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pp_select_scope ON public.pedido_pagamentos FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.pedidos p
  WHERE ((p.id = pedido_pagamentos.pedido_id) AND (public.is_staff(auth.uid()) OR (p.vendedor_id = auth.uid()))))));


--
-- Name: pedido_pagamentos pp_write_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pp_write_scope ON public.pedido_pagamentos TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.pedidos p
  WHERE ((p.id = pedido_pagamentos.pedido_id) AND (public.is_staff(auth.uid()) OR (p.vendedor_id = auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.pedidos p
  WHERE ((p.id = pedido_pagamentos.pedido_id) AND (public.is_staff(auth.uid()) OR (p.vendedor_id = auth.uid()))))));


--
-- Name: produtos prod_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prod_select_auth ON public.produtos FOR SELECT TO authenticated USING (true);


--
-- Name: produtos prod_write_staff; Type: POLICY; Schema: public; Owner: -
--

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

CREATE POLICY profiles_admin_all ON public.profiles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles profiles_select_all_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_select_all_auth ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: profiles profiles_update_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid()));


--
-- Name: user_roles roles_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY roles_admin_write ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles roles_select_self_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY roles_select_self_or_admin ON public.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: tenants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

--
-- Name: tenants tenants_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenants_admin_all ON public.tenants TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tenants tenants_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tenants_owner_select ON public.tenants FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_permissions uperm_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY uperm_admin_all ON public.user_permissions TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_permissions uperm_self_select; Type: POLICY; Schema: public; Owner: -
--

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
GRANT USAGE ON SCHEMA public TO sandbox_exec;


--
-- Name: FUNCTION apply_estoque_from_item(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.apply_estoque_from_item() FROM PUBLIC;
GRANT ALL ON FUNCTION public.apply_estoque_from_item() TO service_role;
GRANT ALL ON FUNCTION public.apply_estoque_from_item() TO sandbox_exec;


--
-- Name: FUNCTION guard_pedido_faturado(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.guard_pedido_faturado() TO anon;
GRANT ALL ON FUNCTION public.guard_pedido_faturado() TO authenticated;
GRANT ALL ON FUNCTION public.guard_pedido_faturado() TO service_role;
GRANT ALL ON FUNCTION public.guard_pedido_faturado() TO sandbox_exec;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;
GRANT ALL ON FUNCTION public.handle_new_user() TO sandbox_exec;


--
-- Name: FUNCTION handle_pedido_cancelamento(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.handle_pedido_cancelamento() FROM PUBLIC;
GRANT ALL ON FUNCTION public.handle_pedido_cancelamento() TO service_role;
GRANT ALL ON FUNCTION public.handle_pedido_cancelamento() TO sandbox_exec;


--
-- Name: FUNCTION has_role(_user_id uuid, _role public.app_role); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) FROM PUBLIC;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO authenticated;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO service_role;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO sandbox_exec;


--
-- Name: FUNCTION is_staff(_user_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.is_staff(_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_staff(_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_staff(_user_id uuid) TO service_role;
GRANT ALL ON FUNCTION public.is_staff(_user_id uuid) TO sandbox_exec;


--
-- Name: FUNCTION notify_estoque_change(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.notify_estoque_change() FROM PUBLIC;
GRANT ALL ON FUNCTION public.notify_estoque_change() TO service_role;
GRANT ALL ON FUNCTION public.notify_estoque_change() TO sandbox_exec;


--
-- Name: FUNCTION notify_pedido_event(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.notify_pedido_event() FROM PUBLIC;
GRANT ALL ON FUNCTION public.notify_pedido_event() TO service_role;
GRANT ALL ON FUNCTION public.notify_pedido_event() TO sandbox_exec;


--
-- Name: FUNCTION recalc_pedido_pagamentos(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.recalc_pedido_pagamentos() FROM PUBLIC;
GRANT ALL ON FUNCTION public.recalc_pedido_pagamentos() TO service_role;
GRANT ALL ON FUNCTION public.recalc_pedido_pagamentos() TO sandbox_exec;


--
-- Name: FUNCTION recalc_pedido_restante(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.recalc_pedido_restante() FROM PUBLIC;
GRANT ALL ON FUNCTION public.recalc_pedido_restante() TO service_role;
GRANT ALL ON FUNCTION public.recalc_pedido_restante() TO sandbox_exec;


--
-- Name: FUNCTION touch_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.touch_updated_at() TO anon;
GRANT ALL ON FUNCTION public.touch_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.touch_updated_at() TO service_role;
GRANT ALL ON FUNCTION public.touch_updated_at() TO sandbox_exec;


--
-- Name: TABLE api_keys; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.api_keys TO anon;
GRANT ALL ON TABLE public.api_keys TO authenticated;
GRANT ALL ON TABLE public.api_keys TO service_role;
GRANT SELECT,INSERT ON TABLE public.api_keys TO sandbox_exec;


--
-- Name: TABLE app_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.app_logs TO anon;
GRANT ALL ON TABLE public.app_logs TO authenticated;
GRANT ALL ON TABLE public.app_logs TO service_role;
GRANT SELECT,INSERT ON TABLE public.app_logs TO sandbox_exec;


--
-- Name: TABLE app_settings; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.app_settings TO anon;
GRANT ALL ON TABLE public.app_settings TO authenticated;
GRANT ALL ON TABLE public.app_settings TO service_role;
GRANT SELECT,INSERT ON TABLE public.app_settings TO sandbox_exec;


--
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_logs TO anon;
GRANT ALL ON TABLE public.audit_logs TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;
GRANT SELECT,INSERT ON TABLE public.audit_logs TO sandbox_exec;


--
-- Name: TABLE backups_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.backups_log TO anon;
GRANT ALL ON TABLE public.backups_log TO authenticated;
GRANT ALL ON TABLE public.backups_log TO service_role;
GRANT SELECT,INSERT ON TABLE public.backups_log TO sandbox_exec;


--
-- Name: TABLE caixa_movimentos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.caixa_movimentos TO anon;
GRANT ALL ON TABLE public.caixa_movimentos TO authenticated;
GRANT ALL ON TABLE public.caixa_movimentos TO service_role;
GRANT SELECT,INSERT ON TABLE public.caixa_movimentos TO sandbox_exec;


--
-- Name: TABLE caixa_sessoes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.caixa_sessoes TO anon;
GRANT ALL ON TABLE public.caixa_sessoes TO authenticated;
GRANT ALL ON TABLE public.caixa_sessoes TO service_role;
GRANT SELECT,INSERT ON TABLE public.caixa_sessoes TO sandbox_exec;


--
-- Name: TABLE categorias; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.categorias TO anon;
GRANT ALL ON TABLE public.categorias TO authenticated;
GRANT ALL ON TABLE public.categorias TO service_role;
GRANT SELECT,INSERT ON TABLE public.categorias TO sandbox_exec;


--
-- Name: TABLE clientes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.clientes TO anon;
GRANT ALL ON TABLE public.clientes TO authenticated;
GRANT ALL ON TABLE public.clientes TO service_role;
GRANT SELECT,INSERT ON TABLE public.clientes TO sandbox_exec;


--
-- Name: TABLE contas; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.contas TO anon;
GRANT ALL ON TABLE public.contas TO authenticated;
GRANT ALL ON TABLE public.contas TO service_role;
GRANT SELECT,INSERT ON TABLE public.contas TO sandbox_exec;


--
-- Name: TABLE despesas; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.despesas TO anon;
GRANT ALL ON TABLE public.despesas TO authenticated;
GRANT ALL ON TABLE public.despesas TO service_role;
GRANT SELECT,INSERT ON TABLE public.despesas TO sandbox_exec;


--
-- Name: TABLE estoque_movimentos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.estoque_movimentos TO anon;
GRANT ALL ON TABLE public.estoque_movimentos TO authenticated;
GRANT ALL ON TABLE public.estoque_movimentos TO service_role;
GRANT SELECT,INSERT ON TABLE public.estoque_movimentos TO sandbox_exec;


--
-- Name: TABLE faturamento_pedidos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.faturamento_pedidos TO anon;
GRANT ALL ON TABLE public.faturamento_pedidos TO authenticated;
GRANT ALL ON TABLE public.faturamento_pedidos TO service_role;
GRANT SELECT,INSERT ON TABLE public.faturamento_pedidos TO sandbox_exec;


--
-- Name: SEQUENCE faturamentos_numero_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.faturamentos_numero_seq TO anon;
GRANT ALL ON SEQUENCE public.faturamentos_numero_seq TO authenticated;
GRANT ALL ON SEQUENCE public.faturamentos_numero_seq TO service_role;
GRANT SELECT,USAGE ON SEQUENCE public.faturamentos_numero_seq TO sandbox_exec;


--
-- Name: TABLE faturamentos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.faturamentos TO anon;
GRANT ALL ON TABLE public.faturamentos TO authenticated;
GRANT ALL ON TABLE public.faturamentos TO service_role;
GRANT SELECT,INSERT ON TABLE public.faturamentos TO sandbox_exec;


--
-- Name: TABLE fidelidade_pontos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.fidelidade_pontos TO anon;
GRANT ALL ON TABLE public.fidelidade_pontos TO authenticated;
GRANT ALL ON TABLE public.fidelidade_pontos TO service_role;
GRANT SELECT,INSERT ON TABLE public.fidelidade_pontos TO sandbox_exec;


--
-- Name: TABLE fornecedores; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.fornecedores TO anon;
GRANT ALL ON TABLE public.fornecedores TO authenticated;
GRANT ALL ON TABLE public.fornecedores TO service_role;
GRANT SELECT,INSERT ON TABLE public.fornecedores TO sandbox_exec;


--
-- Name: TABLE gtin_global; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.gtin_global TO anon;
GRANT ALL ON TABLE public.gtin_global TO authenticated;
GRANT ALL ON TABLE public.gtin_global TO service_role;
GRANT SELECT,INSERT ON TABLE public.gtin_global TO sandbox_exec;


--
-- Name: TABLE nfe_entradas; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.nfe_entradas TO anon;
GRANT ALL ON TABLE public.nfe_entradas TO authenticated;
GRANT ALL ON TABLE public.nfe_entradas TO service_role;
GRANT SELECT,INSERT ON TABLE public.nfe_entradas TO sandbox_exec;


--
-- Name: TABLE nfe_itens; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.nfe_itens TO anon;
GRANT ALL ON TABLE public.nfe_itens TO authenticated;
GRANT ALL ON TABLE public.nfe_itens TO service_role;
GRANT SELECT,INSERT ON TABLE public.nfe_itens TO sandbox_exec;


--
-- Name: TABLE nfe_webhook_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.nfe_webhook_events TO anon;
GRANT ALL ON TABLE public.nfe_webhook_events TO authenticated;
GRANT ALL ON TABLE public.nfe_webhook_events TO service_role;
GRANT SELECT,INSERT ON TABLE public.nfe_webhook_events TO sandbox_exec;


--
-- Name: TABLE notificacoes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notificacoes TO anon;
GRANT ALL ON TABLE public.notificacoes TO authenticated;
GRANT ALL ON TABLE public.notificacoes TO service_role;
GRANT SELECT,INSERT ON TABLE public.notificacoes TO sandbox_exec;


--
-- Name: TABLE patrimonio; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.patrimonio TO anon;
GRANT ALL ON TABLE public.patrimonio TO authenticated;
GRANT ALL ON TABLE public.patrimonio TO service_role;
GRANT SELECT,INSERT ON TABLE public.patrimonio TO sandbox_exec;


--
-- Name: TABLE pedido_itens; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pedido_itens TO anon;
GRANT ALL ON TABLE public.pedido_itens TO authenticated;
GRANT ALL ON TABLE public.pedido_itens TO service_role;
GRANT SELECT,INSERT ON TABLE public.pedido_itens TO sandbox_exec;


--
-- Name: TABLE pedido_pagamentos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pedido_pagamentos TO anon;
GRANT ALL ON TABLE public.pedido_pagamentos TO authenticated;
GRANT ALL ON TABLE public.pedido_pagamentos TO service_role;
GRANT SELECT,INSERT ON TABLE public.pedido_pagamentos TO sandbox_exec;


--
-- Name: SEQUENCE pedidos_numero_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.pedidos_numero_seq TO anon;
GRANT ALL ON SEQUENCE public.pedidos_numero_seq TO authenticated;
GRANT ALL ON SEQUENCE public.pedidos_numero_seq TO service_role;
GRANT SELECT,USAGE ON SEQUENCE public.pedidos_numero_seq TO sandbox_exec;


--
-- Name: TABLE pedidos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pedidos TO anon;
GRANT ALL ON TABLE public.pedidos TO authenticated;
GRANT ALL ON TABLE public.pedidos TO service_role;
GRANT SELECT,INSERT ON TABLE public.pedidos TO sandbox_exec;


--
-- Name: TABLE product_images; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.product_images TO anon;
GRANT ALL ON TABLE public.product_images TO authenticated;
GRANT ALL ON TABLE public.product_images TO service_role;
GRANT SELECT,INSERT ON TABLE public.product_images TO sandbox_exec;


--
-- Name: TABLE produtos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.produtos TO anon;
GRANT ALL ON TABLE public.produtos TO authenticated;
GRANT ALL ON TABLE public.produtos TO service_role;
GRANT SELECT,INSERT ON TABLE public.produtos TO sandbox_exec;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT SELECT,INSERT ON TABLE public.profiles TO sandbox_exec;


--
-- Name: TABLE tenants; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tenants TO anon;
GRANT ALL ON TABLE public.tenants TO authenticated;
GRANT ALL ON TABLE public.tenants TO service_role;
GRANT SELECT,INSERT ON TABLE public.tenants TO sandbox_exec;


--
-- Name: TABLE user_permissions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_permissions TO anon;
GRANT ALL ON TABLE public.user_permissions TO authenticated;
GRANT ALL ON TABLE public.user_permissions TO service_role;
GRANT SELECT,INSERT ON TABLE public.user_permissions TO sandbox_exec;


--
-- Name: TABLE user_roles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_roles TO anon;
GRANT ALL ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;
GRANT SELECT,INSERT ON TABLE public.user_roles TO sandbox_exec;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,USAGE ON SEQUENCES TO sandbox_exec;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO sandbox_exec;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT ON TABLES TO sandbox_exec;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--


