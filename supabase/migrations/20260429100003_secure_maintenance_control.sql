-- Migration: Secure Maintenance Control RPC
-- Created: 2026-04-29
-- Purpose: Allow authorized trainers to toggle maintenance mode via RPC since direct table updates are restricted.

BEGIN;

-- Create the secure function
CREATE OR REPLACE FUNCTION public.update_maintenance_settings(
    p_active boolean DEFAULT NULL,
    p_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as owner, bypassing RLS but checking role manually
SET search_path = public
AS $$
DECLARE
    v_caller_role text;
BEGIN
    -- 1. Get caller's role
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();

    -- 2. Security Check: Only 'trainer' role can modify settings
    IF v_caller_role IS DISTINCT FROM 'trainer' THEN
        RAISE EXCEPTION 'Unauthorized: Only trainers can modify maintenance settings.';
    END IF;

    -- 3. Perform the update
    UPDATE public.app_settings
    SET 
        is_maintenance_mode = COALESCE(p_active, is_maintenance_mode),
        maintenance_message = COALESCE(p_message, maintenance_message),
        updated_at = now()
    WHERE id = 1;

    -- 4. Logging for audit (optional, could be a separate table)
    RAISE NOTICE 'Maintenance mode updated by user %: active=%, message=%', auth.uid(), p_active, p_message;
END;
$$;

-- Grant execution to authenticated users (role check is inside the function)
GRANT EXECUTE ON FUNCTION public.update_maintenance_settings(boolean, text) TO authenticated;

COMMIT;
