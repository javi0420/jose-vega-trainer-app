-- Add created_by column to exercises table
-- This column is used to track which user created custom exercises

alter table public.exercises
  add column if not exists created_by uuid references auth.users(id) on delete set null;
