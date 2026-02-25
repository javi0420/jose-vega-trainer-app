-- Migration: Update default client password to match rebranding
-- Created: 2026-01-13
-- Purpose: Change default password from IronTrack2025 to JoseVega2026

-- Update the create_client_as_trainer function to use the correct default password
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
    crypt('JoseVega2026', gen_salt('bf')), -- Updated default password to match branding
    now(), -- Confirmed immediately
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('full_name', p_full_name, 'role', 'client'),
    now(),
    now(),
    '',
    '',
    '',
    ''
  ) returning id into new_user_id;

  -- Insert into profiles
  insert into public.profiles (id, full_name, role)
  values (new_user_id, p_full_name, 'client');

  -- Link trainer to client
  insert into public.trainer_clients (trainer_id, client_id)
  values (auth.uid(), new_user_id);

  return new_user_id;
end;
$$;
