-- Update trainer activity RPC to include feedback viewing status
DROP FUNCTION IF EXISTS get_trainer_activity(UUID, INT);
CREATE OR REPLACE FUNCTION get_trainer_activity(p_trainer_id UUID, p_limit INT DEFAULT 100)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    date TIMESTAMPTZ,
    name TEXT,
    workout_type TEXT,
    duration_seconds INT,
    total_volume NUMERIC,
    rpe INT,
    client_notes TEXT,
    trainer_notes TEXT,
    is_template BOOLEAN,
    status TEXT,
    feedback_notes TEXT,
    created_at TIMESTAMPTZ,
    full_name TEXT,
    avatar_url TEXT,
    client_feedback_viewed_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id,
        w.user_id,
        w.date,
        w.name,
        w.workout_type,
        w.duration_seconds,
        w.total_volume,
        w.rpe,
        w.client_notes,
        w.trainer_notes,
        w.is_template,
        w.status,
        w.feedback_notes,
        w.created_at,
        p.full_name,
        p.avatar_url,
        w.client_feedback_viewed_at
    FROM workouts w
    JOIN profiles p ON w.user_id = p.id
    JOIN trainer_clients tc ON w.user_id = tc.client_id
    WHERE tc.trainer_id = p_trainer_id
    AND w.is_template = false
    ORDER BY w.date DESC
    LIMIT p_limit;
END;
$$;
