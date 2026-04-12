-- Satu akun admin saja — jalankan di SQL Editor Supabase (idempotent / aman diulang)
--
-- 1) Ubah tiga nilai di bawah ini sesuai keinginan Anda, lalu jalankan skrip.
-- 2) Setelah sukses, login di aplikasi dengan email & password tersebut.

DO $$
DECLARE
  admin_email    TEXT := 'admin@cbt.com';       -- ubah ke email admin Anda
  admin_password TEXT := 'password123';         -- ubah ke password yang kuat
  admin_name     TEXT := 'Administrator';      -- nama tampilan
  hashed_pw      TEXT := crypt(admin_password, gen_salt('bf'));
  ts             TIMESTAMPTZ := now();
  admin_id       UUID;
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE email = admin_email LIMIT 1;

  IF admin_id IS NULL THEN
    admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, raw_app_meta_data, aud, role,
      created_at, updated_at, last_sign_in_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    )
    VALUES (
      admin_id,
      '00000000-0000-0000-0000-000000000000',
      admin_email,
      hashed_pw,
      ts,
      jsonb_build_object('full_name', admin_name, 'role', 'admin'),
      '{"provider":"email","providers":["email"]}',
      'authenticated',
      'authenticated',
      ts, ts, ts,
      '', '', '', ''
    );
  ELSE
    UPDATE auth.users SET
      encrypted_password = hashed_pw,
      raw_user_meta_data = jsonb_build_object('full_name', admin_name, 'role', 'admin'),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}',
      confirmation_token = COALESCE(confirmation_token, ''),
      email_change = COALESCE(email_change, ''),
      email_change_token_new = COALESCE(email_change_token_new, ''),
      recovery_token = COALESCE(recovery_token, '')
    WHERE id = admin_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.identities WHERE user_id = admin_id AND provider = 'email'
  ) THEN
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      admin_id,
      format('{"sub":"%s","email":"%s"}', admin_id, admin_email)::jsonb,
      'email',
      admin_id,
      ts, ts, ts
    );
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (admin_id, admin_email, admin_name, 'admin')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = 'admin';
END $$;
