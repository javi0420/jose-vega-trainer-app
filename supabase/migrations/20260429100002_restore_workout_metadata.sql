-- Migration: Restore missing workout metadata (target_rest_time)
-- Purpose: Fix data loss in workout summaries

-- 1. Add missing column to block_exercises
ALTER TABLE public.block_exercises ADD COLUMN IF NOT EXISTS target_rest_time INTEGER;

-- 2. Update the atomic save function to include target_rest_time
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
  -- Insert the main workout record
  INSERT INTO public.workouts (user_id, name, date, duration_seconds, status, feedback_notes)
  VALUES (p_user_id, p_name, p_date, p_duration, p_status, p_feedback_notes)
  RETURNING id INTO v_workout_id;

  IF p_blocks IS NULL OR jsonb_array_length(p_blocks) = 0 THEN
    RETURN v_workout_id;
  END IF;

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
      (ex->>'exercise_id')::TEXT        AS exercise_id,
      ex->>'custom_exercise_name'       AS custom_name,
      ex->>'position'                   AS position,
      ex->>'notes'                      AS notes,
      (ex->>'target_rest_time')::INT    AS target_rest_time, -- METADATA RESTORED
      ex->'sets'                        AS sets
    FROM inserted_blocks ib
    JOIN blocks_staged bs ON ib.blk_id = bs.blk_id
    CROSS JOIN jsonb_array_elements(bs.exercises) ex
  ),
  inserted_exercises AS (
    INSERT INTO public.block_exercises (id, block_id, exercise_id, custom_exercise_name, position, notes, target_rest_time)
    SELECT ex_id, blk_id, exercise_id, custom_name, position, notes, target_rest_time
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
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '30s';
