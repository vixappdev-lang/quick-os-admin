-- App settings (singleton row para configurações globais do PDV)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id text PRIMARY KEY DEFAULT 'main',
  pdv_ativo boolean NOT NULL DEFAULT true,
  metodos_pagamento jsonb NOT NULL DEFAULT '{"pix":true,"credito":true,"debito":true,"dinheiro":true,"fiado":true}'::jsonb,
  pix_qr_url text,
  pix_chave text,
  empresa_razao text,
  empresa_cnpj text,
  empresa_telefone text,
  empresa_email text,
  empresa_endereco text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

INSERT INTO public.app_settings (id) VALUES ('main') ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_settings_select_auth ON public.app_settings;
CREATE POLICY app_settings_select_auth ON public.app_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS app_settings_write_staff ON public.app_settings;
CREATE POLICY app_settings_write_staff ON public.app_settings FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE OR REPLACE TRIGGER trg_app_settings_touch
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Bucket público para o QR Code PIX
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdv-assets', 'pdv-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "pdv_assets_public_read" ON storage.objects;
CREATE POLICY "pdv_assets_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'pdv-assets');

DROP POLICY IF EXISTS "pdv_assets_staff_write" ON storage.objects;
CREATE POLICY "pdv_assets_staff_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pdv-assets' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "pdv_assets_staff_update" ON storage.objects;
CREATE POLICY "pdv_assets_staff_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'pdv-assets' AND public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "pdv_assets_staff_delete" ON storage.objects;
CREATE POLICY "pdv_assets_staff_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'pdv-assets' AND public.is_staff(auth.uid()));