CREATE TABLE "webhook" (
	"id" text PRIMARY KEY NOT NULL,
	"workflow_id" uuid NOT NULL,
	"deployment_version_id" text,
	"block_id" text,
	"path" text NOT NULL,
	"provider" text,
	"provider_config" json,
	"is_active" boolean DEFAULT true NOT NULL,
	"failed_count" integer DEFAULT 0,
	"last_failed_at" timestamp,
	"credential_set_id" text,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_deployment_version" (
	"id" text PRIMARY KEY NOT NULL,
	"workflow_id" uuid NOT NULL,
	"state" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"deployed_by" text,
	"name" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_schedule" (
	"id" text PRIMARY KEY NOT NULL,
	"workflow_id" uuid NOT NULL,
	"block_id" text NOT NULL,
	"cron_expression" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_servers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"connection_status" text DEFAULT 'disconnected' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"key" text NOT NULL,
	"data" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workflow_blocks" ADD COLUMN "trigger_mode" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "workflow_blocks" ADD COLUMN "horizontal_handles" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "workflow_blocks" ADD COLUMN "locked" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "workflow_blocks" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "workflow_deployment_version" ADD CONSTRAINT "workflow_deployment_version_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_schedule" ADD CONSTRAINT "workflow_schedule_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mcp_servers_org_idx" ON "mcp_servers" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "agent_memory_org_key_idx" ON "agent_memory" USING btree ("org_id","key");--> statement-breakpoint
CREATE INDEX "skills_org_idx" ON "skills" USING btree ("org_id");