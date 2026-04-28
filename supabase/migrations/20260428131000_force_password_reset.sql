-- Migration: Implement Force Password Reset Flow
-- Created: 2026-04-28
-- Purpose: Force new clients to change their password on first login.

BEGIN;

-- 1. Add requires_password_change column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS requires_password_change boolean DEFAULT false;

-- 2. Update handle_new_user trigger to support the new flag
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, requires_password_change)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'role', 'client'),
    COALESCE((new.raw_user_meta_data->>'requires_password_change')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    requires_password_change = EXCLUDED.requires_password_change;
    
  RETURN new;
END;
$$;

-- 3. Update create_client_as_trainer RPC
CREATE OR REPLACE FUNCTION public.create_client_as_trainer(
  p_email text,
  p_full_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- 1. Insert into auth.users with static secure password 'IronTrack2026!'
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt('Jose2026', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object(
        'full_name', p_full_name, 
        'role', 'client', 
        'requires_password_change', true
    ),
    now(),
    now(),
    '',
    '',
    '',
    ''
  ) RETURNING id INTO new_user_id;

  -- 2. Link trainer to client
  INSERT INTO public.trainer_clients (trainer_id, client_id)
  VALUES (auth.uid(), new_user_id);

  RETURN new_user_id;
END;
$$;

-- 4. RLS Update Permissions for Profiles
-- Allow authenticated users to update their own profiles (needed for clearing password change flag)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

COMMIT;
