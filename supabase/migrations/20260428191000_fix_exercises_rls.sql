-- Fix RLS policies for exercises table
-- Allow trainers to create and manage custom exercises

-- 1. Ensure RLS is enabled
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing insertion policy if any to avoid conflicts
DROP POLICY IF EXISTS "Trainers can insert exercises" ON exercises;
DROP POLICY IF EXISTS "Users can insert their own exercises" ON exercises;

-- 3. Create a robust insertion policy for trainers
CREATE POLICY "Trainers can insert exercises"
ON exercises
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'trainer'
  )
);

-- 4. Create update policy (only for the creator)
DROP POLICY IF EXISTS "Creators can update their exercises" ON exercises;
CREATE POLICY "Creators can update their exercises"
ON exercises
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- 5. Create delete policy (soft delete is handled via update, but just in case)
DROP POLICY IF EXISTS "Creators can delete their exercises" ON exercises;
CREATE POLICY "Creators can delete their exercises"
ON exercises
FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- 6. Ensure public read is still allowed
DROP POLICY IF EXISTS "Public can view active exercises" ON exercises;
CREATE POLICY "Public can view active exercises"
ON exercises
FOR SELECT
TO authenticated, anon
USING (is_active = true OR created_by = auth.uid());
