-- Add execution_state column to store serializable execution snapshots for run-from-block
ALTER TABLE "workflow_execution_logs" ADD COLUMN IF NOT EXISTS "execution_state" jsonb;
