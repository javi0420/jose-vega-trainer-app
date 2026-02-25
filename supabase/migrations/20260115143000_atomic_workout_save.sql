-- Function to save a full workout (workout, blocks, exercises, sets) atomically
-- This prevents partial saves where some blocks are missing due to network errors

CREATE OR REPLACE FUNCTION save_full_workout(
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
  v_block JSONB;
  v_ex JSONB;
  v_set JSONB;
  v_block_id UUID;
  v_block_ex_id UUID;
  v_exercise_id UUID;
BEGIN
  -- 1. Insert Workout
  INSERT INTO workouts (user_id, name, date, duration_seconds, status, feedback_notes)
  VALUES (p_user_id, p_name, p_date, p_duration, p_status, p_feedback_notes)
  RETURNING id INTO v_workout_id;

  -- 2. Iterate Blocks
  FOR v_block IN SELECT * FROM jsonb_array_elements(p_blocks)
  LOOP
    INSERT INTO workout_blocks (workout_id, order_index, type)
    VALUES (v_workout_id, (v_block->>'order_index')::INT, v_block->>'type')
    RETURNING id INTO v_block_id;

    -- 3. Iterate Exercises within Block
    FOR v_ex IN SELECT * FROM jsonb_array_elements(v_block->'exercises')
    LOOP
       -- Determine exercise_id (handle NULL specifically for ad-hoc)
       v_exercise_id := (v_ex->>'exercise_id')::UUID;
       
       INSERT INTO block_exercises (block_id, exercise_id, custom_exercise_name, position, notes)
       VALUES (
         v_block_id, 
         v_exercise_id,
         v_ex->>'custom_exercise_name',
         v_ex->>'position',
         v_ex->>'notes'
       )
       RETURNING id INTO v_block_ex_id;

       -- 4. Iterate Sets within Exercise
       IF (v_ex->'sets') IS NOT NULL AND jsonb_array_length(v_ex->'sets') > 0 THEN
           INSERT INTO sets (block_exercise_id, round_index, weight, reps, rpe, rest_seconds, tempo, completed)
           SELECT 
             v_block_ex_id,
             (s->>'setNumber')::INT,
             (CASE WHEN s->>'weight' = '' THEN 0 ELSE (s->>'weight')::NUMERIC END),
             (CASE WHEN s->>'reps' = '' THEN 0 ELSE (s->>'reps')::NUMERIC END),
             (CASE WHEN s->>'rpe' = '' THEN NULL ELSE (s->>'rpe')::NUMERIC END),
             (CASE WHEN s->>'rest_seconds' = '' THEN NULL ELSE (s->>'rest_seconds')::INT END),
             s->>'tempo',
             (s->>'completed')::BOOLEAN
           FROM jsonb_array_elements(v_ex->'sets') s;
       END IF;

    END LOOP;
  END LOOP;

  RETURN v_workout_id;
END;
$$ LANGUAGE plpgsql;
