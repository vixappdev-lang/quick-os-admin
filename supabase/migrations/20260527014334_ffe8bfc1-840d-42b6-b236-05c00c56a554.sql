
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS faturado_em timestamptz;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS nfe_id text;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS nfe_pdf_url text;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS nfe_xml_url text;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS nfe_status text;

DROP POLICY IF EXISTS logs_insert_auth ON public.app_logs;
CREATE POLICY logs_insert_auth ON public.app_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- atualiza default de métodos sem fiado
ALTER TABLE public.app_settings ALTER COLUMN metodos_pagamento SET DEFAULT '{"pix": true, "credito": true, "debito": true, "dinheiro": true, "nota_promissoria": true}'::jsonb;
