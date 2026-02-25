create or replace function public.delete_client_completely(p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth -- Context security
as $$
begin
  -- 1. Authorization Check: Ensure the executing user is the trainer of this client
  -- (This prevents random deletions if the function id is guessed)
  if not exists (
      select 1 
      from public.trainer_clients 
      where client_id = p_client_id 
      and trainer_id = auth.uid()
  ) then
      raise exception 'Unauthorized: You are not the trainer of this client or the client does not exist.';
  end if;

  -- 2. Explicitly delete from public tables to ensure RLS/Policies don't block cascading if any
  -- (Though Security Definer should execute as owner, manual deletion is safer)
  delete from public.trainer_clients where client_id = p_client_id;
  
  -- Workouts/etc should cascade from Profile, but let's delete Profile explicitly
  delete from public.profiles where id = p_client_id;

  -- 3. Finally delete from auth.users
  delete from auth.users where id = p_client_id;

exception when others then
  -- Re-raise error to be caught by client
  raise;
end;
$$;
