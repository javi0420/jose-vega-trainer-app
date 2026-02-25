-- Hotfix for critical RLS vulnerability
-- 0. Enable RLS (Crucial step if it was off)
ALTER TABLE "public"."exercises" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."exercises" FORCE ROW LEVEL SECURITY; -- Also for owners if necessary

-- 1. CLEAN SLATE: Drop ALL existing policies on public.exercises
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'exercises' AND schemaname = 'public' 
    LOOP 
        EXECUTE format('DROP POLICY %I ON public.exercises', pol.policyname); 
    END LOOP; 
END $$;

-- 2. Establish Strict Policies
-- SELECT
CREATE POLICY "Exercises are viewable by everyone" ON "public"."exercises" FOR SELECT USING (true);

-- INSERT
CREATE POLICY "Users can insert own exercises"
ON "public"."exercises"
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
);

-- UPDATE
CREATE POLICY "Users can update own exercises"
ON "public"."exercises"
FOR UPDATE
USING (
  auth.uid() = created_by
)
WITH CHECK (
  auth.uid() = created_by
);

-- DELETE
CREATE POLICY "Users can delete own exercises"
ON "public"."exercises"
FOR DELETE
USING (
  auth.uid() = created_by
);
