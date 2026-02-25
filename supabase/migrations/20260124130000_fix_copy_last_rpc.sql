-- RPC: Get Last Session for Exercise (Optimized & Robust)
-- Picks the most recent COMPLETED workout where this exercise was COMPLETED (at least 1 set).
CREATE OR REPLACE FUNCTION public.get_last_exercise_session(
  p_exercise_id uuid,
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
AS $$
DECLARE
  v_last_block_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
     p_user_id := auth.uid();
  END IF;

  -- 1. Find the LATEST block for this exercise in a COMPLETED workout
  -- where at least one set was marked as 'completed'
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
