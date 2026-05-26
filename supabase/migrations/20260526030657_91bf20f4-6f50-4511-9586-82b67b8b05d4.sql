
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
