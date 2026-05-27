
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS nfeio_api_key text;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS nfeio_company_id text;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS nfeio_environment text DEFAULT 'Development';
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS nfeio_webhook_secret text;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS nfeio_webhook_events jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS nfeio_validated_at timestamptz;

CREATE TABLE IF NOT EXISTS public.nfe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento text NOT NULL,
  payload jsonb NOT NULL,
  pedido_id uuid,
  recebido_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.nfe_webhook_events TO authenticated;
GRANT ALL ON public.nfe_webhook_events TO service_role;
ALTER TABLE public.nfe_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY nfew_select_staff ON public.nfe_webhook_events FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY nfew_insert_service ON public.nfe_webhook_events FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
ALTER PUBLICATION supabase_realtime ADD TABLE public.nfe_webhook_events;

CREATE TABLE IF NOT EXISTS public.app_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria text NOT NULL,
  mensagem text NOT NULL,
  payload jsonb,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.app_logs TO authenticated;
GRANT ALL ON public.app_logs TO service_role;
ALTER TABLE public.app_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY logs_select_staff ON public.app_logs FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY logs_insert_auth ON public.app_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX IF NOT EXISTS app_logs_cat_idx ON public.app_logs (categoria, created_at DESC);
