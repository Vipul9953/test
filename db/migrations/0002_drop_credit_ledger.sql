DROP TABLE "credit_ledger";--> statement-breakpoint
DROP TYPE "public"."credit_entry";--> statement-breakpoint
CREATE TYPE "public"."credits_status" AS ENUM('none', 'held', 'settled', 'released');--> statement-breakpoint
ALTER TABLE "dispatch_records" ADD COLUMN "credits_status" "credits_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "dispatch_records" ADD COLUMN "credit_phases" jsonb DEFAULT '[]'::jsonb NOT NULL;
