
ALTER TABLE public.app_logs ADD COLUMN IF NOT EXISTS ip text;
ALTER TABLE public.app_logs ADD COLUMN IF NOT EXISTS user_agent text;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS scopes text[] DEFAULT ARRAY['read','write'];
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS usage_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS descricao text;
