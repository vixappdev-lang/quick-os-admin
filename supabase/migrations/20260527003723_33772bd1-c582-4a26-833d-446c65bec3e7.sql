
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
