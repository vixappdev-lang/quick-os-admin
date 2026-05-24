CREATE TABLE public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_chave TEXT NOT NULL,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_images_nome_chave ON public.product_images (nome_chave);
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY pimg_select_auth ON public.product_images FOR SELECT TO authenticated USING (true);
CREATE POLICY pimg_write_staff ON public.product_images FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));