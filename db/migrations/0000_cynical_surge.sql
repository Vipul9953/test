CREATE TYPE "public"."creative_kind" AS ENUM('image', 'landing-page', 'email');--> statement-breakpoint
CREATE TYPE "public"."credit_entry" AS ENUM('hold', 'settle', 'release');--> statement-breakpoint
CREATE TYPE "public"."dispatch_status" AS ENUM('queued', 'dispatched', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."intent_source" AS ENUM('explicit', 'classified');--> statement-breakpoint
CREATE TABLE "creative_outputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dispatch_id" uuid NOT NULL,
	"kind" "creative_kind" NOT NULL,
	"content" jsonb NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_accounts" (
	"user_id" text PRIMARY KEY NOT NULL,
	"available" integer NOT NULL,
	"held" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"dispatch_id" uuid,
	"entry" "credit_entry" NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispatch_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"prompt" text NOT NULL,
	"kind" "creative_kind" NOT NULL,
	"confidence" real NOT NULL,
	"intent_source" "intent_source" NOT NULL,
	"status" "dispatch_status" DEFAULT 'queued' NOT NULL,
	"model" text NOT NULL,
	"credits_reserved" integer DEFAULT 0 NOT NULL,
	"credits_settled" integer DEFAULT 0 NOT NULL,
	"parent_artifact_id" uuid,
	"phases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creative_outputs" ADD CONSTRAINT "creative_outputs_dispatch_id_dispatch_records_id_fk" FOREIGN KEY ("dispatch_id") REFERENCES "public"."dispatch_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_outputs" ADD CONSTRAINT "creative_outputs_parent_id_creative_outputs_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."creative_outputs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_dispatch_id_dispatch_records_id_fk" FOREIGN KEY ("dispatch_id") REFERENCES "public"."dispatch_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispatch_records" ADD CONSTRAINT "dispatch_records_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispatch_records" ADD CONSTRAINT "dispatch_records_parent_artifact_id_creative_outputs_id_fk" FOREIGN KEY ("parent_artifact_id") REFERENCES "public"."creative_outputs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "creative_outputs_dispatch_uidx" ON "creative_outputs" USING btree ("dispatch_id");--> statement-breakpoint
CREATE INDEX "creative_outputs_parent_idx" ON "creative_outputs" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "credit_ledger_dispatch_idx" ON "credit_ledger" USING btree ("dispatch_id");--> statement-breakpoint
CREATE INDEX "credit_ledger_user_created_idx" ON "credit_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "dispatch_records_project_created_idx" ON "dispatch_records" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "dispatch_records_user_created_idx" ON "dispatch_records" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "dispatch_records_parent_artifact_idx" ON "dispatch_records" USING btree ("parent_artifact_id");