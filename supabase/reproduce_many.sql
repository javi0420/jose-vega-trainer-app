-- Mock 200 clients for Trainer (11111111-1111-1111-1111-111111111111)
DO $$
DECLARE
    trainer_id UUID := '11111111-1111-1111-1111-111111111111';
    client_id UUID;
    i INT;
BEGIN
    FOR i IN 1..200 LOOP
        client_id := gen_random_uuid();
        
        -- Create Profile
        INSERT INTO public.profiles (id, full_name, email, role, accepted_terms, accepted_at)
        VALUES (
            client_id,
            'Mock Client ' || i,
            'mock' || i || '@test.com',
            'client',
            true,
            now()
        );

        -- Link to Trainer
        INSERT INTO public.trainer_clients (trainer_id, client_id)
        VALUES (trainer_id, client_id);

        -- Create a workout for some of them
        IF i % 5 = 0 THEN
            INSERT INTO public.workouts (user_id, name, date, workout_type, is_template)
            VALUES (
                client_id,
                'Workout ' || i,
                now() - (i || ' hours')::interval,
                'Fuerza',
                false
            );
        END IF;
    END LOOP;
END $$;
