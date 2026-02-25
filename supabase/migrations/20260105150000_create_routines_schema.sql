-- Create Routines table
create table routines (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  is_public boolean default false, -- Future proofing
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create Routine Blocks table (to support superset structure)
create table routine_blocks (
  id uuid default gen_random_uuid() primary key,
  routine_id uuid references routines(id) on delete cascade not null,
  order_index integer not null
);

-- Create Routine Exercises table
create table routine_exercises (
  id uuid default gen_random_uuid() primary key,
  block_id uuid references routine_blocks(id) on delete cascade not null,
  exercise_id uuid references exercises(id) on delete set null, -- If exercise is deleted, keep the slot? Or cascade? Set null for now.
  custom_exercise_name text, -- For ad-hoc exercises
  position text default 'A', -- A, B, C for supersets
  notes text,
  default_sets integer default 3,
  default_reps text, -- Can be range like "8-12"
  default_rpe decimal
);

-- Enable RLS
alter table routines enable row level security;
alter table routine_blocks enable row level security;
alter table routine_exercises enable row level security;

-- Policies for Routines
-- Users can view/edit their own routines
create policy "Users can CRUD own routines"
  on routines for all
  using (auth.uid() = user_id);

-- Trainers can view/create routines for their clients
-- (Assuming trainer_clients table exists based on previous phases, verifying relationship)
create policy "Trainers can view/create client routines"
  on routines for all
  using (
    exists (
      select 1 from trainer_clients
      where trainer_id = auth.uid() and client_id = routines.user_id
    )
  );

-- Policies for Blocks (Cascade from Routine)
create policy "Users can CRUD own routine blocks"
  on routine_blocks for all
  using (
    exists (
      select 1 from routines
      where routines.id = routine_blocks.routine_id
      and (routines.user_id = auth.uid() or 
           exists (
             select 1 from trainer_clients 
             where trainer_id = auth.uid() and client_id = routines.user_id
           )
      )
    )
  );

-- Policies for Exercises (Cascade from Block -> Routine)
create policy "Users can CRUD own routine exercises"
  on routine_exercises for all
  using (
    exists (
      select 1 from routine_blocks
      join routines on routines.id = routine_blocks.routine_id
      where routine_blocks.id = routine_exercises.block_id
      and (routines.user_id = auth.uid() or 
           exists (
             select 1 from trainer_clients 
             where trainer_id = auth.uid() and client_id = routines.user_id
           )
      )
    )
  );
