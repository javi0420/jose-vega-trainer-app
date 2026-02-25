-- Workaround for seed failure: Insert users via Migration

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create Trainer User (trainer@test.com / password123)
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'trainer@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"full_name": "Entrenador Local", "role": "trainer"}',
    '{"provider": "email", "providers": ["email"]}',
    now(),
    now(),
    '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

-- Identity for Trainer
INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '{"sub": "11111111-1111-1111-1111-111111111111", "email": "trainer@test.com"}',
    'email',
    'trainer@test.com',
    now(),
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;


-- 2. Create Client User (lindo@test.com / IronTrack2025)
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'lindo@test.com',
    crypt('IronTrack2025', gen_salt('bf')),
    now(),
    '{"full_name": "Cliente de Prueba", "role": "client"}',
    '{"provider": "email", "providers": ["email"]}',
    now(),
    now(),
    '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

-- Identity for Client
INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '{"sub": "22222222-2222-2222-2222-222222222222", "email": "lindo@test.com"}',
    'email',
    'lindo@test.com',
    now(),
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;


-- 3. Profiles (Explicit Insert)
INSERT INTO public.profiles (id, full_name, email, role, updated_at)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Entrenador Local',
    'trainer@test.com',
    'trainer',
    now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, full_name, email, role, updated_at)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'Cliente de Prueba',
    'lindo@test.com',
    'client',
    now()
) ON CONFLICT (id) DO NOTHING;


-- 4. Trainer-Client Link
INSERT INTO public.trainer_clients (trainer_id, client_id)
VALUES ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (trainer_id, client_id) DO NOTHING;
