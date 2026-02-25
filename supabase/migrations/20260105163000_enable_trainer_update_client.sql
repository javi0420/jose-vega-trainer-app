-- Allow Trainers to update profiles of their assigned clients
create policy "Trainers can update their assigned clients"
  on public.profiles
  for update
  using (
    auth.uid() in (
      select trainer_id 
      from public.trainer_clients 
      where client_id = profiles.id
    )
  );

-- Also allow Trainers to VIEW their clients (already in remote_schema but re-asserting/checking effectively)
-- The remote_schema had "Trainers can view their clients" on trainer_clients, but not necessarily on PROFILES for select beyond "Public profiles are viewable by everyone" (which is true, so selects work).

-- Ensure UPDATE explicitly works.
