-- 1) tenants: armazenar service_role_key (server-only, nunca exposta ao browser)
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS supabase_service_role_key text;

-- 2) profiles: rastrear qual admin criou cada usuário (para isolar listas)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_by_admin uuid;

-- Backfill: usuários existentes ficam atribuídos ao super-admin (admin@loja.com)
DO $$
DECLARE
  v_super uuid;
BEGIN
  SELECT id INTO v_super FROM auth.users WHERE lower(email) = 'admin@loja.com' LIMIT 1;
  IF v_super IS NOT NULL THEN
    UPDATE public.profiles
       SET created_by_admin = v_super
     WHERE created_by_admin IS NULL
       AND id <> v_super;
  END IF;
END $$;

-- 3) handle_new_user: ao criar conta, marcar quem é o "dono administrativo"
-- (passa pelo raw_user_meta_data.created_by_admin se fornecido).
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_created_by uuid;
BEGIN
  BEGIN
    v_created_by := NULLIF(NEW.raw_user_meta_data->>'created_by_admin','')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_created_by := NULL;
  END;

  INSERT INTO public.profiles (id, nome, email, created_by_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)),
    NEW.email,
    v_created_by
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'operador') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $function$;