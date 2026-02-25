-- Add columns to routine_exercises to support "watermark" placeholders from previous workouts
ALTER TABLE public.routine_exercises 
ADD COLUMN IF NOT EXISTS target_weight DECIMAL,
ADD COLUMN IF NOT EXISTS target_reps INTEGER;

-- Fix RPC to correctly copy from workout to routine with these values
CREATE OR REPLACE FUNCTION public.create_routine_from_workout(
    p_workout_id UUID,
    p_routine_name TEXT,
    p_user_id UUID
) RETURNS UUID AS $$
DECLARE
    v_routine_id UUID;
    v_block RECORD;
    v_new_block_id UUID;
    v_exercise RECORD;
    v_now TIMESTAMP WITH TIME ZONE := now();
BEGIN
    -- 1. Crear la rutina
    INSERT INTO public.routines (user_id, name, created_at, updated_at)
    VALUES (p_user_id, p_routine_name, v_now, v_now)
    RETURNING id INTO v_routine_id;

    -- 2. Copiar bloques
    FOR v_block IN SELECT * FROM public.workout_blocks WHERE workout_id = p_workout_id LOOP
        -- Insertar bloque en la rutina (Note: removed user_id and created_at as they are not in schema)
        INSERT INTO public.routine_blocks (routine_id, order_index)
        VALUES (v_routine_id, v_block.order_index)
        RETURNING id INTO v_new_block_id;

        -- 3. Copiar ejercicios del bloque
        FOR v_exercise IN SELECT * FROM public.block_exercises WHERE block_id = v_block.id LOOP
            -- Calcular promedios/máximos de series para target_weight/reps
            -- (Usa el mejor set completado)
            DECLARE
                v_target_weight DECIMAL;
                v_target_reps INTEGER;
            BEGIN
                SELECT weight, reps INTO v_target_weight, v_target_reps
                FROM public.sets
                WHERE block_exercise_id = v_exercise.id AND completed = true
                ORDER BY (COALESCE(weight, 0) * COALESCE(reps, 0)) DESC LIMIT 1;

                INSERT INTO public.routine_exercises (
                    block_id, exercise_id, custom_exercise_name, position, 
                    notes, target_weight, target_reps
                )
                VALUES (
                    v_new_block_id, v_exercise.exercise_id, v_exercise.custom_exercise_name,
                    v_exercise.position, v_exercise.notes, v_target_weight, v_target_reps
                );
            END;
        END LOOP;
    END LOOP;

    RETURN v_routine_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
