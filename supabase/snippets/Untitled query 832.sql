-- Complete test data seeding for E2E tests
-- Creates all necessary routines and assignments for routine-loading.spec.js

BEGIN;

-- Clean up previous test data
DELETE FROM public.routines WHERE id IN (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',  -- Rutina Fuerza Pro
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'   -- Full Body A
);

-- Helper variables (if your user creation flow ensures these exist)
DO $$
DECLARE
    v_trainer_id UUID;
    v_client_id UUID;
BEGIN
    -- Get Trainer and Client IDs
    SELECT id INTO v_trainer_id FROM auth.users WHERE email = 'trainer@test.com' LIMIT 1;
    SELECT id INTO v_client_id FROM auth.users WHERE email = 'lindo@test.com' LIMIT 1;

    IF v_trainer_id IS NULL OR v_client_id IS NULL THEN
        RAISE NOTICE 'Trainer or Client not found. Skipping seed.';
        RETURN;
    END IF;

    -- 1. Create "Rutina Fuerza Pro" (Trainer-owned, assigned to client)
    INSERT INTO public.routines (id, name, user_id, description, is_public, created_at, updated_at)
    VALUES (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'Rutina Fuerza Pro',
        v_trainer_id,
        'Rutina de fuerza para test',
        false,
        NOW(),
        NOW()
    );

    -- 1.1 Blocks for "Rutina Fuerza Pro"
    INSERT INTO public.routine_blocks (id, routine_id, order_index)
    VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1);

    -- 1.2 Exercises for "Rutina Fuerza Pro"
    INSERT INTO public.routine_exercises (id, block_id, exercise_id, position, default_sets, default_reps)
    SELECT gen_random_uuid(), 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', id, 'A', 4, '8'
    FROM public.exercises WHERE LOWER(name) LIKE '%press banca%' LIMIT 1;

    INSERT INTO public.routine_exercises (id, block_id, exercise_id, position, default_sets, default_reps)
    SELECT gen_random_uuid(), 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', id, 'B', 3, '5'
    FROM public.exercises WHERE LOWER(name) LIKE '%peso muerto%' LIMIT 1;

    -- 2. Create "Full Body A" (Client-owned)
    INSERT INTO public.routines (id, name, user_id, description, is_public, created_at, updated_at)
    VALUES (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'Full Body A',
        v_client_id,
        'Rutina de cuerpo completo',
        false,
        NOW(),
        NOW()
    );

    -- 2.1 Blocks for "Full Body A"
    INSERT INTO public.routine_blocks (id, routine_id, order_index)
    VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1);

    -- 2.2 Exercise for "Full Body A": Sentadilla
    INSERT INTO public.routine_exercises (id, block_id, exercise_id, position, default_sets, default_reps)
    SELECT 
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        id,
        'A',
        3,
        '8-12'
    FROM public.exercises WHERE LOWER(name) LIKE '%sentadilla%' LIMIT 1;

    -- 3. Assign "Rutina Fuerza Pro" to Client
    INSERT INTO public.assigned_routines (client_id, routine_id, assigned_by, created_at)
    VALUES (v_client_id, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', v_trainer_id, NOW())
    ON CONFLICT DO NOTHING;

END $$;

COMMIT;
