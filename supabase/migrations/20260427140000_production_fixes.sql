-- =====================================================
-- Migration: Production Sync Fixes
-- Fecha: 2026-04-27
-- Incluye:
--   1. save_full_workout optimizado (Batch CTEs)
--   2. create_routine_from_workout (Fix notes carryover)
-- =====================================================

-- 1. SAVE_FULL_WORKOUT (Optimized version from Production)
CREATE OR REPLACE FUNCTION public.save_full_workout(
  p_user_id UUID,
  p_name TEXT,
  p_date TIMESTAMPTZ,
  p_duration INT,
  p_status TEXT,
  p_blocks JSONB,
  p_feedback_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_workout_id UUID;
BEGIN
  -- Insert main workout
  INSERT INTO public.workouts (user_id, name, date, duration_seconds, status, feedback_notes)
  VALUES (p_user_id, p_name, p_date, p_duration, p_status, p_feedback_notes)
  RETURNING id INTO v_workout_id;

  IF p_blocks IS NULL OR jsonb_array_length(p_blocks) = 0 THEN
    RETURN v_workout_id;
  END IF;

  -- Batch insert with chained CTEs
  WITH
  blocks_staged AS (
    SELECT
      gen_random_uuid()         AS blk_id,
      (bl->>'order_index')::INT AS order_index,
      bl->>'type'               AS blk_type,
      bl->'exercises'           AS exercises
    FROM jsonb_array_elements(p_blocks) bl
  ),
  inserted_blocks AS (
    INSERT INTO public.workout_blocks (id, workout_id, order_index, type)
    SELECT blk_id, v_workout_id, order_index, blk_type
    FROM blocks_staged
    RETURNING id AS blk_id
  ),
  exercises_staged AS (
    SELECT
      ib.blk_id                        AS blk_id,
      gen_random_uuid()                 AS ex_id,
      (ex->>'exercise_id')::UUID        AS exercise_id,
      ex->>'custom_exercise_name'       AS custom_name,
      ex->>'position'                   AS position,
      ex->>'notes'                      AS notes,
      ex->'sets'                        AS sets
    FROM inserted_blocks ib
    JOIN blocks_staged bs ON ib.blk_id = bs.blk_id
    CROSS JOIN jsonb_array_elements(bs.exercises) ex
  ),
  inserted_exercises AS (
    INSERT INTO public.block_exercises (id, block_id, exercise_id, custom_exercise_name, position, notes)
    SELECT ex_id, blk_id, exercise_id, custom_name, position, notes
    FROM exercises_staged
    RETURNING id AS ex_id
  )
  INSERT INTO public.sets (block_exercise_id, round_index, weight, reps, rpe, rest_seconds, tempo, completed)
  SELECT
    ie.ex_id,
    (s->>'setNumber')::INT,
    CASE WHEN s->>'weight' = ''       OR s->>'weight' IS NULL       THEN 0    ELSE (s->>'weight')::NUMERIC       END,
    CASE WHEN s->>'reps' = ''         OR s->>'reps' IS NULL         THEN 0    ELSE (s->>'reps')::NUMERIC         END,
    CASE WHEN s->>'rpe' = ''          OR s->>'rpe' IS NULL          THEN NULL ELSE (s->>'rpe')::NUMERIC          END,
    CASE WHEN s->>'rest_seconds' = '' OR s->>'rest_seconds' IS NULL THEN NULL ELSE (s->>'rest_seconds')::INT     END,
    s->>'tempo',
    (s->>'completed')::BOOLEAN
  FROM inserted_exercises ie
  JOIN exercises_staged es ON ie.ex_id = es.ex_id
  CROSS JOIN jsonb_array_elements(es.sets) s
  WHERE es.sets IS NOT NULL AND jsonb_array_length(es.sets) > 0;

  RETURN v_workout_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'save_full_workout failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '30s';

-- 2. CREATE_ROUTINE_FROM_WORKOUT (Fix notes carryover)
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
    INSERT INTO public.routines (user_id, name, created_at, updated_at)
    VALUES (p_user_id, p_routine_name, v_now, v_now)
    RETURNING id INTO v_routine_id;

    FOR v_block IN SELECT * FROM public.workout_blocks WHERE workout_id = p_workout_id LOOP
        INSERT INTO public.routine_blocks (routine_id, order_index)
        VALUES (v_routine_id, v_block.order_index)
        RETURNING id INTO v_new_block_id;

        FOR v_exercise IN SELECT * FROM public.block_exercises WHERE block_id = v_block.id LOOP
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
                    v_exercise.position, NULL, v_target_weight, v_target_reps
                );
            END;
        END LOOP;
    END LOOP;

    RETURN v_routine_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Permissions
GRANT EXECUTE ON FUNCTION public.save_full_workout(UUID, TEXT, TIMESTAMPTZ, INT, TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_full_workout(UUID, TEXT, TIMESTAMPTZ, INT, TEXT, JSONB, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_routine_from_workout(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_routine_from_workout(UUID, TEXT, UUID) TO service_role;
