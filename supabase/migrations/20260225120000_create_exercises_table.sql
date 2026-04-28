-- Migration: Recreate exercises table for free-exercise-db import
-- Purpose: Store the open-source exercise library with rich media support (GIFs, arrays)
-- The old table (with uuid) is dropped entirely. Cascade handles deleting dependent foreign key constraints.

DROP TABLE IF EXISTS public.exercises CASCADE;

CREATE TABLE public.exercises (
    id text PRIMARY KEY,
    name text NOT NULL,
    body_part text,
    target_muscle text,
    equipment text,
    gif_url text,
    instructions text[],
    secondary_muscles text[]
);

-- Enable Row Level Security
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow authenticated read access" 
ON public.exercises 
FOR SELECT 
TO authenticated 
USING (true);

-- Fix broken Foreign Keys on dependent tables (UUID to Text)
ALTER TABLE public.routine_exercises ALTER COLUMN exercise_id TYPE text USING exercise_id::text;
ALTER TABLE public.routine_exercises ADD CONSTRAINT routine_exercises_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE SET NULL;

ALTER TABLE public.block_exercises ALTER COLUMN exercise_id TYPE text USING exercise_id::text;
ALTER TABLE public.block_exercises ADD CONSTRAINT block_exercises_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE SET NULL;

-- Override the search_exercises RPC to match the new schema
DROP FUNCTION IF EXISTS public.search_exercises(text, int, int);

CREATE OR REPLACE FUNCTION public.search_exercises(
    search_term text,
    p_offset int DEFAULT 0,
    p_limit int DEFAULT 20
)
RETURNS TABLE (
    id text,
    name text,
    body_part text,
    target_muscle text,
    equipment text,
    gif_url text,
    instructions text[],
    secondary_muscles text[],
    total_count bigint
) AS $$
DECLARE
    v_clean_term text;
BEGIN
    v_clean_term := '%' || unaccent(search_term) || '%';

    RETURN QUERY
    WITH filtered_exercises AS (
        SELECT 
            e.id, 
            e.name, 
            e.body_part, 
            e.target_muscle, 
            e.equipment, 
            e.gif_url,
            e.instructions,
            e.secondary_muscles
        FROM public.exercises e
        WHERE 
            unaccent(e.name) ILIKE v_clean_term 
            OR unaccent(e.target_muscle) ILIKE v_clean_term
            OR unaccent(e.body_part) ILIKE v_clean_term
    ),
    total AS (
        SELECT count(*) as count FROM filtered_exercises
    )
    SELECT 
        f.id,
        f.name,
        f.body_part,
        f.target_muscle,
        f.equipment,
        f.gif_url,
        f.instructions,
        f.secondary_muscles,
        t.count as total_count
    FROM filtered_exercises f
    CROSS JOIN total t
    ORDER BY f.name ASC
    OFFSET p_offset
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.search_exercises(text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_exercises(text, int, int) TO service_role;

-- Override get_exercise_pr to accept text instead of uuid
DROP FUNCTION IF EXISTS public.get_exercise_pr(uuid);

CREATE OR REPLACE FUNCTION public.get_exercise_pr(
  p_exercise_id text
)
RETURNS TABLE (
  weight numeric,
  reps numeric,
  date timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.weight,
    s.reps,
    w.date
  FROM sets s
  JOIN block_exercises be ON be.id = s.block_exercise_id
  JOIN workout_blocks wb ON wb.id = be.block_id
  JOIN workouts w ON w.id = wb.workout_id
  WHERE 
    be.exercise_id = p_exercise_id
    AND w.user_id = auth.uid()
    AND s.completed = true
    AND s.weight > 0
  ORDER BY 
    s.weight DESC, 
    s.reps DESC, 
    w.date DESC
  LIMIT 1;
END;
$$;

-- Override get_last_exercise_session to accept text instead of uuid
DROP FUNCTION IF EXISTS public.get_last_exercise_session(uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_last_exercise_session(
  p_exercise_id text,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  weight numeric,
  reps numeric,
  rpe numeric,
  rest_seconds numeric,
  note text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_last_block_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
     p_user_id := auth.uid();
  END IF;

  -- 1. Find the LATEST block for this exercise in a COMPLETED workout
  SELECT be.id INTO v_last_block_id
  FROM workouts w
  JOIN workout_blocks wb ON wb.workout_id = w.id
  JOIN block_exercises be ON be.block_id = wb.id
  WHERE w.user_id = p_user_id
    AND be.exercise_id = p_exercise_id
  ORDER BY w.date DESC, w.created_at DESC, wb.order_index DESC
  LIMIT 1;

  IF v_last_block_id IS NULL THEN
     RETURN;
  END IF;

  -- 2. Return sets for THAT specific block
  RETURN QUERY
  SELECT 
    s.weight,
    s.reps,
    s.rpe,
    s.rest_seconds,
    be.notes as note
  FROM sets s
  JOIN block_exercises be ON be.id = s.block_exercise_id
  WHERE s.block_exercise_id = v_last_block_id
  ORDER BY s.round_index ASC, s.created_at ASC;
END;
$$;
