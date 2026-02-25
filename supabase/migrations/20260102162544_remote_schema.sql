-- Reconstructed Base Schema

-- PROFILES
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  email text,
  role text check (role in ('trainer', 'client')),
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- EXERCISES
create table public.exercises (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  muscle_group text,
  video_url text,
  description text,
  created_at timestamptz default now()
);

alter table public.exercises enable row level security;

create policy "Exercises are viewable by everyone."
  on exercises for select
  using ( true );

-- TRAINER_CLIENTS
create table public.trainer_clients (
  id uuid default gen_random_uuid() primary key,
  trainer_id uuid references public.profiles(id) not null,
  client_id uuid references public.profiles(id) not null,
  status text default 'active',
  created_at timestamptz default now(),
  unique(trainer_id, client_id)
);

alter table public.trainer_clients enable row level security;

create policy "Trainers can view their clients"
  on trainer_clients for select
  using ( auth.uid() = trainer_id );

create policy "Clients can view their trainer"
  on trainer_clients for select
  using ( auth.uid() = client_id );

-- WORKOUTS
create table public.workouts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text,
  date timestamptz default now(),
  duration_seconds int,
  total_volume numeric,
  rpe int,
  client_notes text,
  trainer_notes text,
  workout_type text,
  is_template boolean default false,
  status text default 'completed',
  feedback_notes text,
  created_at timestamptz default now()
);

alter table public.workouts enable row level security;

create policy "Users can view their own workouts"
  on workouts for select
  using ( auth.uid() = user_id );

-- WORKOUT BLOCKS
create table public.workout_blocks (
  id uuid default gen_random_uuid() primary key,
  workout_id uuid references public.workouts(id) on delete cascade not null,
  order_index integer default 0,
  type text default 'single',
  created_at timestamptz default now()
);

alter table public.workout_blocks enable row level security;

create policy "Users can view their own workout blocks"
  on workout_blocks for select
  using (
    exists ( select 1 from workouts where id = workout_blocks.workout_id and user_id = auth.uid() )
  );

-- BLOCK EXERCISES
create table public.block_exercises (
  id uuid default gen_random_uuid() primary key,
  block_id uuid references public.workout_blocks(id) on delete cascade not null,
  exercise_id uuid references public.exercises(id) on delete set null,
  custom_exercise_name text,
  position text default 'A',
  notes text,
  created_at timestamptz default now()
);

alter table public.block_exercises enable row level security;

create policy "Users can view their own block exercises"
  on block_exercises for select
  using (
    exists (
      select 1 from workout_blocks
      join workouts on workouts.id = workout_blocks.workout_id
      where workout_blocks.id = block_exercises.block_id
      and workouts.user_id = auth.uid()
    )
  );

-- SETS
create table public.sets (
  id uuid default gen_random_uuid() primary key,
  block_exercise_id uuid references public.block_exercises(id) on delete cascade not null,
  round_index integer,
  weight numeric,
  reps numeric,
  rpe numeric,
  rest_seconds numeric,
  tempo text,
  completed boolean default false,
  created_at timestamptz default now()
);

alter table public.sets enable row level security;

create policy "Users can view their own sets"
  on sets for select
  using (
    exists (
      select 1 from block_exercises
      join workout_blocks on workout_blocks.id = block_exercises.block_id
      join workouts on workouts.id = workout_blocks.workout_id
      where block_exercises.id = sets.block_exercise_id
      and workouts.user_id = auth.uid()
    )
  );
