-- 1. Alter Tables
ALTER TABLE public.exercises ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE public.block_exercises ALTER COLUMN exercise_id TYPE text;
ALTER TABLE public.routine_exercises ALTER COLUMN exercise_id TYPE text;

-- 2. Update save_full_workout RPC
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
  v_exercise_id TEXT; -- CHANGED FROM UUID TO TEXT
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
       v_exercise_id := v_ex->>'exercise_id'; -- REMOVED ::UUID cast
       
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

-- 3. Update get_last_exercise_session RPC
CREATE OR REPLACE FUNCTION public.get_last_exercise_session(
  p_exercise_id text, -- CHANGED FROM UUID TO TEXT
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

-- 4. Update get_user_routines_with_details to match updated schema
CREATE OR REPLACE FUNCTION get_user_routines_with_details()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        WITH user_all_routines AS (
            SELECT r.*, FALSE as assigned_from_trainer FROM routines r WHERE r.user_id = auth.uid()
            UNION ALL
            SELECT r.*, TRUE as assigned_from_trainer FROM routines r 
            INNER JOIN assigned_routines ar ON ar.routine_id = r.id WHERE ar.client_id = auth.uid()
        )
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', r.id,
                'name', r.name,
                'description', r.description,
                'user_id', r.user_id,
                'created_by_trainer', (r.created_by_trainer IS NOT NULL OR r.assigned_from_trainer = TRUE),
                'routine_blocks', (
                    SELECT COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'id', rb.id,
                            'order_index', rb.order_index,
                            'routine_exercises', (
                                SELECT COALESCE(jsonb_agg(
                                    jsonb_build_object(
                                        'id', re.id,
                                        'position', re.position,
                                        'exercises', (
                                            SELECT jsonb_build_object(
                                                'id', e.id, -- Added ID for clarity
                                                'name', e.name,
                                                'name_es', e.name_es, -- Added name_es
                                                'gif_url', e.gif_url,
                                                'target_muscle', e.target_muscle
                                            ) FROM exercises e WHERE e.id = re.exercise_id
                                        )
                                    ) ORDER BY re.position
                                ), '[]'::jsonb)
                                FROM routine_exercises re WHERE re.block_id = rb.id
                            )
                        ) ORDER BY rb.order_index
                    ), '[]'::jsonb)
                    FROM routine_blocks rb WHERE rb.routine_id = r.id
                )
            ) ORDER BY r.name
        ), '[]'::jsonb)
        FROM user_all_routines r
    );
END;
$$;
