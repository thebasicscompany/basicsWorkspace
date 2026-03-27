ALTER TABLE "workflow_deployment_version" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "workflow_deployment_version" ADD COLUMN "created_by" text;