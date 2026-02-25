-- Feedback and Notification enhancements
ALTER TABLE public.assigned_routines 
ADD COLUMN IF NOT EXISTS client_feedback TEXT,
ADD COLUMN IF NOT EXISTS client_feedback_at TIMESTAMPTZ;

ALTER TABLE public.workouts 
ADD COLUMN IF NOT EXISTS trainer_feedback_viewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS client_feedback_viewed_at TIMESTAMPTZ;

-- Function to notify trainer (mock or just status update for now)
-- In a real app, this might trigger a push or email, but here we'll use it for UI badges.
CREATE OR REPLACE FUNCTION notify_trainer_on_feedback()
RETURNS TRIGGER AS $$
BEGIN
    -- We can add logic here if we had a notifications table
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
