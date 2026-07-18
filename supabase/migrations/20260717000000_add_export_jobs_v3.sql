-- Migration: Setup export_jobs table for Milestone 5
CREATE TABLE IF NOT EXISTS export_jobs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'queued',
  progress         INT NOT NULL DEFAULT 0,
  stage            TEXT,
  payload_snapshot JSONB NOT NULL,
  revision_hash    TEXT NOT NULL,
  snapshot_hash    TEXT NOT NULL,
  attempt_number   INT NOT NULL DEFAULT 1,
  max_attempts     INT NOT NULL DEFAULT 3,
  worker_id        UUID,
  priority         INT NOT NULL DEFAULT 0,
  queued_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  heartbeat_at     TIMESTAMPTZ,
  cancel_requested BOOLEAN NOT NULL DEFAULT FALSE,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  failed_at        TIMESTAMPTZ,
  output_url       TEXT,
  error            TEXT,
  metrics          JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  version          INT NOT NULL DEFAULT 1, -- Optimistic concurrency
  lease_owner      UUID,
  lease_until      TIMESTAMPTZ
);

-- Indexing for fast lookups
CREATE INDEX IF NOT EXISTS idx_export_jobs_project_id ON export_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_export_jobs_revision_hash ON export_jobs(revision_hash);

-- Enable Realtime replication for realtime status updates
alter publication supabase_realtime add table export_jobs;
