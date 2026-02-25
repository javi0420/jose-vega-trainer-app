-- Migration: Update create_client_as_trainer to accept dynamic default password
-- Purpose: Remove hardcoded password for white-label/multi-tenant flexibility

create or replace function public.create_client_as_trainer(
  p_email text,
  p_full_name text,
  p_default_password text
)
returns uuid
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  new_user_id uuid;
begin
  -- 1. Insert into auth.users
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_default_password, gen_salt('bf')), -- DYNAMIC PASSWORD
    now(), 
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('full_name', p_full_name, 'role', 'client'),
    now(), now(), '', '', '', ''
  ) returning id into new_user_id;

  -- 2. Link trainer to client
  insert into public.trainer_clients (trainer_id, client_id)
  values (auth.uid(), new_user_id);

  return new_user_id;
end;
$$;
