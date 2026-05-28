
-- ============ PRODUTOS: unidade de embalagem, fator e estoque fiscal ============
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS unidade_embalagem text NOT NULL DEFAULT 'UN',
  ADD COLUMN IF NOT EXISTS fator_unidade numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS estoque_fiscal numeric NOT NULL DEFAULT 0;

ALTER TABLE public.produtos
  ADD CONSTRAINT produtos_fator_unidade_positivo CHECK (fator_unidade >= 1);

-- ============ PEDIDOS: tipo operação, fornecedor, faturado ============
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS tipo_operacao text NOT NULL DEFAULT 'saida',
  ADD COLUMN IF NOT EXISTS fornecedor_id uuid,
  ADD COLUMN IF NOT EXISTS faturado boolean NOT NULL DEFAULT false;

ALTER TABLE public.pedidos
  ADD CONSTRAINT pedidos_tipo_operacao_chk CHECK (tipo_operacao IN ('saida','entrada'));

-- ============ FORNECEDORES: remover campos pedidos pelo usuário ============
ALTER TABLE public.fornecedores
  DROP COLUMN IF EXISTS prazo_pagamento,
  DROP COLUMN IF EXISTS banco,
  DROP COLUMN IF EXISTS agencia,
  DROP COLUMN IF EXISTS conta,
  DROP COLUMN IF EXISTS pix;

-- ============ TRIGGER: aplicar estoque levando em conta tipo_operacao ============
CREATE OR REPLACE FUNCTION public.apply_estoque_from_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- ============ TRIGGER: faturado é terminal (exceto admin) ============
CREATE OR REPLACE FUNCTION public.guard_pedido_faturado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS trg_guard_pedido_faturado ON public.pedidos;
CREATE TRIGGER trg_guard_pedido_faturado
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_pedido_faturado();
