-- Rename architectures table to project_scans
ALTER TABLE public.architectures RENAME TO project_scans;

-- Rename indexes
ALTER INDEX IF EXISTS idx_architectures_project_id RENAME TO idx_project_scans_project_id;

-- Rename trigger
ALTER TRIGGER set_architectures_updated_at ON public.project_scans RENAME TO set_project_scans_updated_at;

-- Drop old policies and recreate with new names
DROP POLICY IF EXISTS "Users can read own architectures" ON public.project_scans;
DROP POLICY IF EXISTS "Service role full access on architectures" ON public.project_scans;

CREATE POLICY "Users can read own project scans"
  ON public.project_scans FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access on project scans"
  ON public.project_scans FOR ALL
  USING (true)
  WITH CHECK (true);
