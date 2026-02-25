-- Migration: Update handle_new_user trigger to include privacy consent fields
-- Created: 2026-01-13
-- Purpose: Fix duplicate key error by updating trigger to include accepted_terms and accepted_at

-- Update the trigger function to include privacy consent fields
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, accepted_terms, accepted_at)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'client'),
    false,  -- New users haven't accepted terms yet
    null    -- Will be set when they accept
  );
  return new;
end;
$$;

-- Also update create_client_as_trainer to NOT insert into profiles
-- (the trigger will handle it automatically)
create or replace function public.create_client_as_trainer(
  p_email text,
  p_full_name text
)
returns uuid
language plpgsql
security definer
as $$
declare
  new_user_id uuid;
begin
  -- Insert into auth.users with auto-confirmation
  -- The trigger will automatically create the profile
  insert into auth.users (
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
  ) values (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt('JoseVega2026', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('full_name', p_full_name, 'role', 'client'),
    now(),
    now(),
    '',
    '',
    '',
    ''
  ) returning id into new_user_id;

  -- Profile is created automatically by trigger, so we don't insert here

  -- Link trainer to client
  insert into public.trainer_clients (trainer_id, client_id)
  values (auth.uid(), new_user_id);

  return new_user_id;
end;
$$;
