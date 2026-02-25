-- Fix for COALESCE types uuid and boolean cannot be matched
-- Redefine get_user_routines_with_details to handle types correctly

CREATE OR REPLACE FUNCTION get_user_routines_with_details()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        WITH user_all_routines AS (
            -- Routines owned by the user
            SELECT 
                r.*,
                FALSE as assigned_from_trainer
            FROM routines r
            WHERE r.user_id = auth.uid()
            
            UNION ALL
            
            -- Routines assigned to the user by a trainer
            SELECT 
                r.*,
                TRUE as assigned_from_trainer
            FROM routines r
            INNER JOIN assigned_routines ar ON ar.routine_id = r.id
            WHERE ar.client_id = auth.uid()
        )
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'id', r.id,
                'name', r.name,
                'description', r.description,
                'user_id', r.user_id,
                -- Fix: Use explicit boolean comparison to avoid UUID/Boolean mismatch
                'created_by_trainer', (r.created_by_trainer IS NOT NULL OR r.assigned_from_trainer),
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
                                                'name', e.name
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
