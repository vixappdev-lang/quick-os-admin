-- =========================================================
-- NOTIFICACOES
-- =========================================================
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  tipo text NOT NULL,
  severidade text NOT NULL DEFAULT 'info',
  titulo text NOT NULL,
  mensagem text NOT NULL,
  payload jsonb,
  dedupe_key text,
  lida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS notificacoes_dedupe_open
  ON public.notificacoes (dedupe_key)
  WHERE dedupe_key IS NOT NULL AND lida_em IS NULL;

CREATE INDEX IF NOT EXISTS notificacoes_user_idx ON public.notificacoes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notificacoes_open_idx ON public.notificacoes (created_at DESC) WHERE lida_em IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.notificacoes TO authenticated;
GRANT ALL ON public.notificacoes TO service_role;

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_select_own_or_broadcast"
  ON public.notificacoes FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY "notif_update_own"
  ON public.notificacoes FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE POLICY "notif_insert_staff"
  ON public.notificacoes FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

-- =========================================================
-- BACKUPS LOG
-- =========================================================
CREATE TABLE IF NOT EXISTS public.backups_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  status text NOT NULL DEFAULT 'success',
  tamanho_bytes bigint,
  storage_path text,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.backups_log TO authenticated;
GRANT ALL ON public.backups_log TO service_role;

ALTER TABLE public.backups_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bklog_select_staff"
  ON public.backups_log FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- Bucket privado para backups
INSERT INTO storage.buckets (id, name, public)
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "backups_select_staff"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'backups' AND public.is_staff(auth.uid()));

-- =========================================================
-- TRIGGERS DE NOTIFICACAO
-- =========================================================
CREATE OR REPLACE FUNCTION public.notify_estoque_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS trg_notify_estoque ON public.produtos;
CREATE TRIGGER trg_notify_estoque
  AFTER UPDATE OF estoque ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.notify_estoque_change();

CREATE OR REPLACE FUNCTION public.notify_pedido_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

DROP TRIGGER IF EXISTS trg_notify_pedido_ins ON public.pedidos;
CREATE TRIGGER trg_notify_pedido_ins
  AFTER INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.notify_pedido_event();

DROP TRIGGER IF EXISTS trg_notify_pedido_upd ON public.pedidos;
CREATE TRIGGER trg_notify_pedido_upd
  AFTER UPDATE OF status ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.notify_pedido_event();

-- realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;