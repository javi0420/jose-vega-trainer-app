-- Enable trainers to create exercises
-- The exercises table had RLS enabled but only SELECT policy, blocking INSERT operations

create policy "Authenticated users can insert exercises"
  on exercises for insert
  with check ( auth.uid() is not null );
