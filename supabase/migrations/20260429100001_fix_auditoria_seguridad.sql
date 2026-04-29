-- IronTrack Security Patch 2026-04-29
BEGIN;
-- FIX SEC-01 & SEC-02: Hardening Profiles and Trigger
-- 1. Create a function to validate role changes (only service_role can change roles)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, requires_password_change)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.email, 
    'client', -- FORCE 'client' for all public signups. Trainers must be promoted by admin or RPC.
    COALESCE((new.raw_user_meta_data->>'requires_password_change')::boolean, false)
  );
  RETURN new;
END;
$$;
-- 2. Restrict UPDATE on profiles to safe columns only
-- We use a trigger to prevent unauthorized column updates on profiles
CREATE OR REPLACE FUNCTION public.protect_profile_roles()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Prevent users from changing their own role or email
  IF (old.role <> new.role OR old.email <> new.email) AND auth.role() = 'authenticated' THEN
    RAISE EXCEPTION 'Unauthorized: You cannot modify sensitive profile columns.';
  END IF;
  RETURN new;
END;
$$;
DROP TRIGGER IF EXISTS ensure_profile_integrity ON public.profiles;
CREATE TRIGGER ensure_profile_integrity
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_roles();
-- FIX SEC-03: Hardening App Settings
-- Restrict app_settings to service_role only (No RLS policy for update means only service_role/admin)
DROP POLICY IF EXISTS "Admins can update app_settings" ON public.app_settings;
-- FIX PERF-01: Performance Optimization
-- Use a secure function with caching for role checks in RLS to avoid table scans
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;
COMMIT;