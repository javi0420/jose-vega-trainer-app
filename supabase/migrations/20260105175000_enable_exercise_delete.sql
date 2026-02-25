-- Enable authenticated users to delete exercises
-- The exercises table had INSERT policy but no DELETE policy, blocking deletions

create policy "Authenticated users can delete their own exercises"
  on exercises for delete
  using ( auth.uid() = created_by );

-- Also allow deleting exercises with no creator (system exercises)
create policy "Authenticated users can delete system exercises"
  on exercises for delete
  using ( created_by is null AND auth.uid() is not null );
