-- Seed Data for Fitness App (Robust Version)

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

-- 2. Create Client User (lindo@test.com / JoseVega2026)
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

-- 3. Create Trainer 2 (trainer2@test.com / password123)
-- He will ONLY manage 'Cliente Ajeno'
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'trainer2@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"full_name": "Entrenador Dos", "role": "trainer"}',
    '{"provider": "email", "providers": ["email"]}',
    now(),
    now(),
    '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    '{"sub": "33333333-3333-3333-3333-333333333333", "email": "trainer2@test.com"}',
    'email',
    'trainer2@test.com',
    now(),
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

-- 4. Create Client 2 (cliente2@test.com / password123)
-- This client belongs to Trainer 1, but we will test if Trainer 2 can see it.
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '44444444-4444-4444-4444-444444444444',
    'authenticated',
    'authenticated',
    'cliente2@test.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"full_name": "Segunda Victima", "role": "client"}',
    '{"provider": "email", "providers": ["email"]}',
    now(),
    now(),
    '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) VALUES (
    '44444444-4444-4444-4444-444444444444',
    '44444444-4444-4444-4444-444444444444',
    '{"sub": "44444444-4444-4444-4444-444444444444", "email": "cliente2@test.com"}',
    'email',
    'cliente2@test.com',
    now(),
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;


-- 3. Profiles
INSERT INTO public.profiles (id, full_name, email, role, accepted_terms, accepted_at, updated_at)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Entrenador Local',
    'trainer@test.com',
    'trainer',
    true,
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, full_name, email, role, accepted_terms, accepted_at, updated_at)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'Cliente de Prueba',
    'lindo@test.com',
    'client',
    true,
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, full_name, email, role, accepted_terms, accepted_at, updated_at)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    'Entrenador Dos',
    'trainer2@test.com',
    'trainer',
    true,
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, full_name, email, role, accepted_terms, accepted_at, updated_at)
VALUES (
    '44444444-4444-4444-4444-444444444444',
    'Segunda Victima',
    'cliente2@test.com',
    'client',
    true,
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;


-- 4. Trainer-Client Link
INSERT INTO public.trainer_clients (trainer_id, client_id)
VALUES ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (trainer_id, client_id) DO NOTHING;

-- 4.5 Privacy Bypass (for E2E tests)
UPDATE public.profiles 
SET accepted_terms = true, accepted_at = now()
WHERE id IN (
    '11111111-1111-1111-1111-111111111111', 
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444'
);

-- 5. Exercises (Expanded)
INSERT INTO public.exercises (id, name, muscle_group) VALUES 
('ecececec-ecec-ecec-ecec-ecececececec', 'Sentadilla', 'Piernas'),
('d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1', 'Peso Muerto', 'Espalda'),
('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 'Press Banca', 'Pecho')
ON CONFLICT (id) DO NOTHING;

-- 6. Routines
-- Client's Own Routine
INSERT INTO public.routines (id, name, description, user_id)
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Full Body A',
    'Mi rutina personal de cuerpo completo',
    '22222222-2222-2222-2222-222222222222'
) ON CONFLICT (id) DO NOTHING;

-- Trainer's Master Routine
INSERT INTO public.routines (id, name, description, user_id, created_by_trainer, category)
VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Rutina Fuerza Pro',
    'Rutina avanzada de fuerza máxima',
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'Fuerza'
) ON CONFLICT (id) DO NOTHING;

-- 7. Routine Hierarchy (Full Body A)
INSERT INTO public.routine_blocks (id, routine_id, order_index)
VALUES ('c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.routine_exercises (id, block_id, exercise_id, position, default_sets, default_reps)
VALUES ('e1e1e1e1-e1e1-e1e1-e1e1-e1e1e1e1e1e1', 'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1', 'ecececec-ecec-ecec-ecec-ecececececec', 'A', 3, '10')
ON CONFLICT (id) DO NOTHING;

-- 8. Routine Hierarchy (Rutina Fuerza Pro)
-- Block 1
INSERT INTO public.routine_blocks (id, routine_id, order_index)
VALUES ('d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.routine_exercises (id, block_id, exercise_id, position, default_sets, default_reps)
VALUES ('f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1', 'd1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1', 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 'A', 5, '5')
ON CONFLICT (id) DO NOTHING;

-- Block 2
INSERT INTO public.routine_blocks (id, routine_id, order_index)
VALUES ('d2d2d2d2-d2d2-d2d2-d2d2-d2d2d2d2d2d2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.routine_exercises (id, block_id, exercise_id, position, default_sets, default_reps)
VALUES ('f2f2f2f2-f2f2-f2f2-f2f2-f2f2f2f2f2f2', 'd2d2d2d2-d2d2-d2d2-d2d2-d2d2d2d2d2d2', 'd1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1', 'A', 3, '5')
ON CONFLICT (id) DO NOTHING;

-- 9. Assignments
INSERT INTO public.assigned_routines (routine_id, client_id, assigned_by)
VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111'
) ON CONFLICT DO NOTHING;

-- 6. Sample Workout
INSERT INTO public.workouts (user_id, name, date, workout_type, is_template)
VALUES ('22222222-2222-2222-2222-222222222222', 'Entrenamiento de Prueba', now(), 'Fuerza', false)
ON CONFLICT DO NOTHING;