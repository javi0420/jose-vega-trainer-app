-- Migration: mark_feedback_as_viewed RPC
-- Description: Allows clients to mark trainer feedback as viewed.

CREATE OR REPLACE FUNCTION public.mark_feedback_as_viewed(p_workout_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.workouts
    SET trainer_feedback_viewed_at = NOW()
    WHERE id = p_workout_id 
    AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
