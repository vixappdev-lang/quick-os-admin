
-- Seed admin user admin@loja.com / admin12
DO $$
DECLARE
  v_user_id uuid;
  v_existing uuid;
BEGIN
  SELECT id INTO v_existing FROM auth.users WHERE email = 'admin@loja.com' LIMIT 1;

  IF v_existing IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated',
      'admin@loja.com',
      crypt('admin12', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"nome":"Administrador"}'::jsonb,
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'admin@loja.com', 'email_verified', true),
      'email', v_user_id::text, now(), now(), now()
    );
  ELSE
    v_user_id := v_existing;
    -- Reset password to admin12
    UPDATE auth.users
       SET encrypted_password = crypt('admin12', gen_salt('bf')),
           email_confirmed_at = COALESCE(email_confirmed_at, now()),
           updated_at = now()
     WHERE id = v_user_id;
  END IF;

  INSERT INTO public.profiles (id, nome, email)
  VALUES (v_user_id, 'Administrador', 'admin@loja.com')
  ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, email = EXCLUDED.email;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
