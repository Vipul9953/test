ALTER TABLE "dispatch_records" ALTER COLUMN "kind" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "dispatch_records" ALTER COLUMN "confidence" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "dispatch_records" ALTER COLUMN "intent_source" DROP NOT NULL;