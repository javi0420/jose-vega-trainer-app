-- Migration: Fix create_client_as_trainer password and profile creation
-- Purpose: Ensure new clients have the correct 'Joaquin2025' password and avoid duplicate profile inserts (since trigger handles it)

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
  -- 1. Insert into auth.users
  -- Explicitly set password to 'Joaquin2025'
  -- Trigger 'handle_new_user' will automatically create the profile after this insert
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
    crypt('Joaquin2025', gen_salt('bf')), -- FORCE CORRECT PASSWORD
    now(), -- Auto-confirm email
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('full_name', p_full_name, 'role', 'client'),
    now(),
    now(),
    '',
    '',
    '',
    ''
  ) returning id into new_user_id;

  -- 2. Link trainer to client
  insert into public.trainer_clients (trainer_id, client_id)
  values (auth.uid(), new_user_id);

  -- NOTE: We do NOT insert into public.profiles here anymore, 
  -- because the 'handle_new_user' trigger takes care of it.

  return new_user_id;
end;
$$;
