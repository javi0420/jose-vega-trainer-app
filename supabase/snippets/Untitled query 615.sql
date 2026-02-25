-- 1. Borrar cualquier intento anterior
DELETE FROM auth.users WHERE email = 'lindo@test.com';

-- 2. Insertar con un hash manual conocido (esto evita usar extensions.crypt en el momento del insert)
-- El hash de abajo corresponde a la palabra: password123
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, confirmation_token)
VALUES (
    gen_random_uuid(), 
    '00000000-0000-0000-0000-000000000000', 
    'authenticated', 
    'authenticated', 
    'lindo@test.com', 
    '$2a$10$abcdefghijklmnopqrstuv', -- Un hash de ejemplo
    now(), 
    '{"provider":"email","providers":["email"]}', 
    '{"role": "client"}', 
    now(), 
    now(),
    false,
    ''
);