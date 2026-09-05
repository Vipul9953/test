import { type AnyPgColumn } from "drizzle-orm/pg-core";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  integer,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";
import type { CreditPhase } from "@/lib/validations/credit-phases";
import type { AspectRatio, ImageStyle } from "@/lib/validations/image-options";
import type { Phase } from "@/lib/validations/phases";
import type { ArtifactContent } from "@/lib/validations/artifact";

export const creativeKindEnum = pgEnum("creative_kind", [
  "image",
  "landing-page",
  "email",
]);

export const intentSourceEnum = pgEnum("intent_source", [
  "explicit",
  "classified",
]);

export const dispatchStatusEnum = pgEnum("dispatch_status", [
  "queued",
  "dispatched",
  "completed",
  "failed",
]);

export const creditsStatusEnum = pgEnum("credits_status", [
  "none",
  "held",
  "settled",
  "released",
]);

export const dispatchRecords = pgTable(
  "dispatch_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    userId: text("user_id").notNull(),
    prompt: text("prompt").notNull(),
    kind: creativeKindEnum("kind"),
    confidence: real("confidence"),
    intentSource: intentSourceEnum("intent_source"),
    status: dispatchStatusEnum("status").notNull().default("queued"),
    model: text("model").notNull(),
    creditsReserved: integer("credits_reserved").notNull().default(0),
    creditsSettled: integer("credits_settled").notNull().default(0),
    creditsStatus: creditsStatusEnum("credits_status").notNull().default("none"),
    creditPhases: jsonb("credit_phases")
      .$type<CreditPhase[]>()
      .notNull()
      .default([]),
    aspectRatio: text("aspect_ratio").$type<AspectRatio>(),
    imageStyle: text("image_style").$type<ImageStyle>(),
    parentArtifactId: uuid("parent_artifact_id").references(
      (): AnyPgColumn => creativeOutputs.id,
    ),
    phases: jsonb("phases").$type<Phase[]>().notNull().default([]),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("dispatch_records_project_created_idx").on(
      table.projectId,
      table.createdAt,
    ),
    index("dispatch_records_user_created_idx").on(table.userId, table.createdAt),
    index("dispatch_records_parent_artifact_idx").on(table.parentArtifactId),
  ],
);

export const creativeOutputs = pgTable(
  "creative_outputs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dispatchId: uuid("dispatch_id")
      .notNull()
      .references(() => dispatchRecords.id),
    kind: creativeKindEnum("kind").notNull(),
    content: jsonb("content").$type<ArtifactContent["content"]>().notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => creativeOutputs.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("creative_outputs_dispatch_uidx").on(table.dispatchId),
    index("creative_outputs_parent_idx").on(table.parentId),
  ],
);
