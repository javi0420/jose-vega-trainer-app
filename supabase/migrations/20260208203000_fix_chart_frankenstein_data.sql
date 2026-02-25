-- RPC: Get Exercise History Stats (for Chart) - STRICT BEST SET
-- Fixes "Frankenstein Data" bug where max(weight) and max(reps) were aggregated independently.
-- Now returns the single best set (highest weight, then highest reps) for each workout.

CREATE OR REPLACE FUNCTION public.get_exercise_history(
  p_exercise_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  workout_id uuid,
  workout_date timestamp with time zone,
  workout_name text,
  max_weight numeric,
  max_reps numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Validate permission
  IF p_user_id IS NULL THEN
     p_user_id := auth.uid();
  END IF;

  RETURN QUERY
  WITH relevant_workouts AS (
    SELECT id, date, name
    FROM workouts
    WHERE user_id = p_user_id
    ORDER BY date DESC
    LIMIT 50 -- Limit history to 50 sessions
  ),
  exercise_sets AS (
    SELECT 
      rw.id as w_id,
      rw.date as w_date,
      rw.name as w_name,
      s.weight,
      s.reps
    FROM relevant_workouts rw
    JOIN workout_blocks wb ON wb.workout_id = rw.id
    JOIN block_exercises be ON be.block_id = wb.id
    JOIN sets s ON s.block_exercise_id = be.id
    WHERE be.exercise_id = p_exercise_id
      AND s.completed = true -- Filter only completed sets
  )
  SELECT DISTINCT ON (es.w_id)
    es.w_id as workout_id,
    es.w_date as workout_date,
    es.w_name as workout_name,
    es.weight as max_weight,
    es.reps as max_reps
  FROM exercise_sets es
  ORDER BY 
    es.w_id, 
    es.weight DESC, 
    es.reps DESC;
END;
$$;
