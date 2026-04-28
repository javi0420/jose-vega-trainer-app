-- Migration: Sanitation of Legacy Profiles
-- Created: 2026-04-28
-- Purpose: Fix NULL values in role and requires_password_change for legacy users.

BEGIN;

-- 1. Patch role column
-- Default legacy users to 'client' if role is missing
UPDATE public.profiles 
SET role = 'client' 
WHERE role IS NULL;

-- 2. Patch requires_password_change column
-- Legacy users do NOT need a forced password change
UPDATE public.profiles 
SET requires_password_change = false 
WHERE requires_password_change IS NULL;

-- 3. Ensure future consistency with NOT NULL constraints
-- (Optional but recommended for data integrity)
ALTER TABLE public.profiles 
ALTER COLUMN role SET NOT NULL,
ALTER COLUMN requires_password_change SET NOT NULL;

COMMIT;
