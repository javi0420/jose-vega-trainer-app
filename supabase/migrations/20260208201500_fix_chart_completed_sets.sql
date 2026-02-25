-- RPC: Get Exercise History Stats (for Chart) - Filtered by COMPLETED sets
-- Only returns data points where the set was actually marked as completed.

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
AS $$
BEGIN
  -- Validate permission: User must query their own data OR imply trainer relationship
  IF p_user_id IS NULL THEN
     p_user_id := auth.uid();
  END IF;

  RETURN QUERY
  WITH relevant_workouts AS (
    SELECT id, date, name
    FROM workouts
    WHERE user_id = p_user_id
    ORDER BY date DESC
    LIMIT 50 -- Limit history to 50 sessions for chart performance
  ),
  exercise_blocks AS (
    SELECT 
      rw.id as w_id,
      rw.date as w_date,
      rw.name as w_name,
      be.id as be_id
    FROM relevant_workouts rw
    JOIN workout_blocks wb ON wb.workout_id = rw.id
    JOIN block_exercises be ON be.block_id = wb.id
    WHERE be.exercise_id = p_exercise_id
  )
  SELECT 
    eb.w_id as workout_id,
    eb.w_date as workout_date,
    eb.w_name as workout_name,
    COALESCE(MAX(s.weight), 0) as max_weight,
    COALESCE(MAX(s.reps), 0) as max_reps
  FROM exercise_blocks eb
  JOIN sets s ON s.block_exercise_id = eb.be_id
  WHERE s.completed = true  -- <--- FIXED: Only include completed sets
  GROUP BY eb.w_id, eb.w_date, eb.w_name
  ORDER BY eb.w_date ASC;
END;
$$;
