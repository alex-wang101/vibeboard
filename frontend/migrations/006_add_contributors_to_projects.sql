-- Add contributors column to projects table
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS contributors jsonb DEFAULT '[]'::jsonb;
