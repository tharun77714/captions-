-- Phase 2: make projects and their dependent rows private to the authenticated owner.
-- Existing anonymous rows remain owned by the legacy UUID and are intentionally not
-- reassigned automatically because doing so could expose one person's media to another.

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can read their own projects" ON public.projects;
CREATE POLICY "users can read their own projects"
  ON public.projects FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users can create their own projects" ON public.projects;
CREATE POLICY "users can create their own projects"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users can update their own projects" ON public.projects;
CREATE POLICY "users can update their own projects"
  ON public.projects FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users can delete their own projects" ON public.projects;
CREATE POLICY "users can delete their own projects"
  ON public.projects FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users can read their own transcriptions" ON public.transcriptions;
CREATE POLICY "users can read their own transcriptions"
  ON public.transcriptions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = transcriptions.project_id
      AND projects.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "users can update their own transcriptions" ON public.transcriptions;
CREATE POLICY "users can update their own transcriptions"
  ON public.transcriptions FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = transcriptions.project_id
      AND projects.user_id = auth.uid()
  ));

DO $$
BEGIN
  IF to_regclass('public.export_jobs') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "users can read their own export jobs" ON public.export_jobs';
    EXECUTE 'CREATE POLICY "users can read their own export jobs" ON public.export_jobs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.projects WHERE projects.id = export_jobs.project_id AND projects.user_id = auth.uid()))';
  END IF;
END $$;
