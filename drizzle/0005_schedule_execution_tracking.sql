-- Add execution tracking columns to workflow_schedule (matching Sim's schema)
ALTER TABLE "workflow_schedule" ADD COLUMN IF NOT EXISTS "next_run_at" timestamp with time zone;
ALTER TABLE "workflow_schedule" ADD COLUMN IF NOT EXISTS "last_ran_at" timestamp with time zone;
ALTER TABLE "workflow_schedule" ADD COLUMN IF NOT EXISTS "last_queued_at" timestamp with time zone;
ALTER TABLE "workflow_schedule" ADD COLUMN IF NOT EXISTS "last_failed_at" timestamp with time zone;
ALTER TABLE "workflow_schedule" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'active';
ALTER TABLE "workflow_schedule" ADD COLUMN IF NOT EXISTS "failed_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "workflow_schedule" ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone;

-- Migrate existing enabled=false rows to status='disabled'
UPDATE "workflow_schedule" SET "status" = 'disabled' WHERE "enabled" = false;

-- Drop the old enabled column
ALTER TABLE "workflow_schedule" DROP COLUMN IF EXISTS "enabled";
