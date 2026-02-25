-- Create assigned_routines table for tracking trainer-to-client routine assignments
create table assigned_routines (
  id uuid default gen_random_uuid() primary key,
  routine_id uuid references routines(id) on delete cascade not null,
  client_id uuid references auth.users(id) on delete cascade not null,
  assigned_by uuid references auth.users(id) on delete set null not null,
  assignment_notes text,
  assigned_at timestamptz default now(),
  viewed_at timestamptz,
  created_at timestamptz default now()
);

-- Indexes for performance
create index idx_assigned_routines_client on assigned_routines(client_id);
create index idx_assigned_routines_routine on assigned_routines(routine_id);
create index idx_assigned_routines_assigned_by on assigned_routines(assigned_by);

-- Enable RLS
alter table assigned_routines enable row level security;

-- Policy: Clients can view their assigned routines
create policy "Clients can view assigned routines"
  on assigned_routines for select
  using (auth.uid() = client_id);

-- Policy: Clients can update viewed_at timestamp
create policy "Clients can mark as viewed"
  on assigned_routines for update
  using (auth.uid() = client_id)
  with check (auth.uid() = client_id);

-- Policy: Trainers can manage assignments for their clients
create policy "Trainers can manage client assignments"
  on assigned_routines for all
  using (
    exists (
      select 1 from trainer_clients
      where trainer_id = auth.uid() and client_id = assigned_routines.client_id
    )
  );

-- Comments for documentation
comment on table assigned_routines is 'Tracks routine assignments from trainers to clients';
comment on column assigned_routines.assignment_notes is 'Trainer instructions/notes for the client';
comment on column assigned_routines.viewed_at is 'Timestamp when client first viewed the assignment';
