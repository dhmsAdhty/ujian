-- Script untuk membuat User Dummy di Supabase Auth
-- Jalankan ini di SQL Editor Supabase (aman dijalankan berulang / idempotent)

-- Catatan: Password untuk semua akun di bawah adalah: password123
-- Pastikan ekstensi pgcrypto aktif (biasanya sudah aktif di Supabase)
--
-- Penting: GoTrue membutuhkan kolom token di auth.users berupa string kosong (''),
-- bukan NULL. Tanpa ini, login mengembalikan: "Database error querying schema"
-- Lihat: https://github.com/supabase/auth/issues/1940

DO $$
DECLARE
  hashed_pw TEXT := crypt('password123', gen_salt('bf'));
  ts TIMESTAMPTZ := now();
  admin_id UUID;
  guru_id UUID;
  siswa_id UUID;
BEGIN
  -- 1. Admin
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@cbt.com' LIMIT 1;
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
      'admin@cbt.com',
      hashed_pw,
      ts,
      '{"full_name": "Administrator Utama", "role": "admin"}',
      '{"provider":"email","providers":["email"]}',
      'authenticated',
      'authenticated',
      ts, ts, ts,
      '', '', '', ''
    );
  ELSE
    UPDATE auth.users SET
      raw_user_meta_data = '{"full_name": "Administrator Utama", "role": "admin"}',
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
      format('{"sub":"%s","email":"%s"}', admin_id, 'admin@cbt.com')::jsonb,
      'email',
      admin_id,
      ts, ts, ts
    );
  END IF;

  -- 2. Guru
  SELECT id INTO guru_id FROM auth.users WHERE email = 'guru@cbt.com' LIMIT 1;
  IF guru_id IS NULL THEN
    guru_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, raw_app_meta_data, aud, role,
      created_at, updated_at, last_sign_in_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    )
    VALUES (
      guru_id,
      '00000000-0000-0000-0000-000000000000',
      'guru@cbt.com',
      hashed_pw,
      ts,
      '{"full_name": "Bpk. Guru Senior", "role": "guru"}',
      '{"provider":"email","providers":["email"]}',
      'authenticated',
      'authenticated',
      ts, ts, ts,
      '', '', '', ''
    );
  ELSE
    UPDATE auth.users SET
      raw_user_meta_data = '{"full_name": "Bpk. Guru Senior", "role": "guru"}',
      raw_app_meta_data = '{"provider":"email","providers":["email"]}',
      confirmation_token = COALESCE(confirmation_token, ''),
      email_change = COALESCE(email_change, ''),
      email_change_token_new = COALESCE(email_change_token_new, ''),
      recovery_token = COALESCE(recovery_token, '')
    WHERE id = guru_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.identities WHERE user_id = guru_id AND provider = 'email'
  ) THEN
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      guru_id,
      format('{"sub":"%s","email":"%s"}', guru_id, 'guru@cbt.com')::jsonb,
      'email',
      guru_id,
      ts, ts, ts
    );
  END IF;

  -- 3. Siswa
  SELECT id INTO siswa_id FROM auth.users WHERE email = 'siswa@cbt.com' LIMIT 1;
  IF siswa_id IS NULL THEN
    siswa_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, raw_app_meta_data, aud, role,
      created_at, updated_at, last_sign_in_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    )
    VALUES (
      siswa_id,
      '00000000-0000-0000-0000-000000000000',
      'siswa@cbt.com',
      hashed_pw,
      ts,
      '{"full_name": "Siswa Teladan", "role": "siswa"}',
      '{"provider":"email","providers":["email"]}',
      'authenticated',
      'authenticated',
      ts, ts, ts,
      '', '', '', ''
    );
  ELSE
    UPDATE auth.users SET
      raw_user_meta_data = '{"full_name": "Siswa Teladan", "role": "siswa"}',
      raw_app_meta_data = '{"provider":"email","providers":["email"]}',
      confirmation_token = COALESCE(confirmation_token, ''),
      email_change = COALESCE(email_change, ''),
      email_change_token_new = COALESCE(email_change_token_new, ''),
      recovery_token = COALESCE(recovery_token, '')
    WHERE id = siswa_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.identities WHERE user_id = siswa_id AND provider = 'email'
  ) THEN
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      siswa_id,
      format('{"sub":"%s","email":"%s"}', siswa_id, 'siswa@cbt.com')::jsonb,
      'email',
      siswa_id,
      ts, ts, ts
    );
  END IF;

END $$;

-- ---------------------------------------------------------------------------
-- Perbaikan saja (tanpa mengubah password): jika user sudah ada dari seed lama
-- dengan token NULL, Anda bisa jalankan ini sekali:
--
-- UPDATE auth.users SET
--   confirmation_token = COALESCE(confirmation_token, ''),
--   email_change = COALESCE(email_change, ''),
--   email_change_token_new = COALESCE(email_change_token_new, ''),
--   recovery_token = COALESCE(recovery_token, '')
-- WHERE confirmation_token IS NULL
--    OR email_change IS NULL
--    OR email_change_token_new IS NULL
--    OR recovery_token IS NULL;
-- ---------------------------------------------------------------------------
