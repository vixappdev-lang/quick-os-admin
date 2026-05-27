ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS nfe_provider text DEFAULT 'nfeio',
  ADD COLUMN IF NOT EXISTS brasilnfe_user_token text,
  ADD COLUMN IF NOT EXISTS brasilnfe_company_token text,
  ADD COLUMN IF NOT EXISTS brasilnfe_environment text DEFAULT 'Production',
  ADD COLUMN IF NOT EXISTS brasilnfe_validated_at timestamptz;