-- RPC for atomic routine cloning
-- Deep copies a routine, its blocks, and its exercises.

CREATE OR REPLACE FUNCTION public.duplicate_routine(p_routine_id UUID, p_new_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_new_routine_id UUID;
    v_block RECORD;
    v_new_block_id UUID;
    v_exercise RECORD;
BEGIN
    -- 1. Insert new routine
    INSERT INTO public.routines (
        user_id,
        name,
        description,
        is_public,
        created_by_trainer
    )
    SELECT
        user_id,
        p_new_name,
        description,
        is_public,
        created_by_trainer
    FROM public.routines
    WHERE id = p_routine_id
    RETURNING id INTO v_new_routine_id;

    -- 2. Loop through and copy blocks
    FOR v_block IN (
        SELECT * FROM public.routine_blocks
        WHERE routine_id = p_routine_id
        ORDER BY order_index
    ) LOOP
        INSERT INTO public.routine_blocks (
            routine_id,
            order_index
        ) VALUES (
            v_new_routine_id,
            v_block.order_index
        ) RETURNING id INTO v_new_block_id;

        -- 3. Loop through and copy exercises for this block
        FOR v_exercise IN (
            SELECT * FROM public.routine_exercises
            WHERE block_id = v_block.id
            ORDER BY position
        ) LOOP
            INSERT INTO public.routine_exercises (
                block_id,
                exercise_id,
                custom_exercise_name,
                position,
                notes,
                default_sets,
                default_reps,
                default_rpe
            ) VALUES (
                v_new_block_id,
                v_exercise.exercise_id,
                v_exercise.custom_exercise_name,
                v_exercise.position,
                v_exercise.notes,
                v_exercise.default_sets,
                v_exercise.default_reps,
                v_exercise.default_rpe
            );
        END LOOP;
    END LOOP;

    RETURN v_new_routine_id;
END;
$$;
