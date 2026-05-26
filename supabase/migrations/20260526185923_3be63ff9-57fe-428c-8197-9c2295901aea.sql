
CREATE UNIQUE INDEX IF NOT EXISTS ux_produtos_codigo_barras
  ON public.produtos(codigo_barras) WHERE codigo_barras IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.gtin_global (
  gtin TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  marca TEXT,
  categoria_sugerida TEXT,
  unidade TEXT,
  imagem_url TEXT,
  fonte TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.gtin_global TO authenticated;
GRANT ALL ON public.gtin_global TO service_role;

ALTER TABLE public.gtin_global ENABLE ROW LEVEL SECURITY;

CREATE POLICY gtin_read_auth ON public.gtin_global
  FOR SELECT TO authenticated USING (true);
