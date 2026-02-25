-- RPC: Get Personal Record for an Exercise
-- returns the single set with the highest weight * reps (or just weight) for the user.
-- Usage: SELECT * FROM get_exercise_pr('exercise_uuid');

CREATE OR REPLACE FUNCTION public.get_exercise_pr(
  p_exercise_id uuid
)
RETURNS TABLE (
  weight numeric,
  reps numeric,
  date timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  ORDER BY s.weight DESC, s.reps DESC
  LIMIT 1;
END;
$$;
