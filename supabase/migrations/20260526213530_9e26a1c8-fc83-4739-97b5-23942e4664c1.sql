
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
