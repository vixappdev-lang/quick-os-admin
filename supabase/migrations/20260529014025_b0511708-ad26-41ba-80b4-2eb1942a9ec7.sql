
-- Tabela para guardar o state efêmero do fluxo OAuth Supabase
CREATE TABLE IF NOT EXISTS public.supabase_oauth_states (
  state text PRIMARY KEY,
  super_admin_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  slug text,
  nome text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.supabase_oauth_states TO service_role;
-- Sem grants para anon/authenticated: acesso só pelo backend (service_role).

ALTER TABLE public.supabase_oauth_states ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy: nenhum usuário consegue acessar via PostgREST.

-- Project ref opcional em tenants para sabermos como chamar a Management API depois
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS project_ref text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS oauth_access_token text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS oauth_refresh_token text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS oauth_expires_at timestamptz;
