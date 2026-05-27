
-- 1) Peso por unidade no produto
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS peso_kg numeric NOT NULL DEFAULT 0;

-- 2) tenant_slug no perfil
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tenant_slug text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_tenant_slug_uidx
  ON public.profiles(tenant_slug) WHERE tenant_slug IS NOT NULL;

-- 3) Tabela tenants
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (length(slug) BETWEEN 4 AND 12 AND slug ~ '^[a-z0-9]+$'),
  nome text,
  supabase_url text NOT NULL,
  supabase_anon_key text NOT NULL,
  user_id uuid NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenants_admin_all ON public.tenants;
CREATE POLICY tenants_admin_all ON public.tenants
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS tenants_owner_select ON public.tenants;
CREATE POLICY tenants_owner_select ON public.tenants
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 4) Permissões por menu
CREATE TABLE IF NOT EXISTS public.user_permissions (
  user_id uuid NOT NULL,
  menu text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, menu)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS uperm_admin_all ON public.user_permissions;
CREATE POLICY uperm_admin_all ON public.user_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS uperm_self_select ON public.user_permissions;
CREATE POLICY uperm_self_select ON public.user_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
