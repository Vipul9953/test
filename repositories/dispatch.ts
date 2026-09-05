import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { creativeOutputs, dispatchRecords } from "@/db/schema";
import type { CreativeKind, IntentSource } from "@/lib/types/creative";
import type { AspectRatio, ImageStyle } from "@/lib/validations/image-options";
import type { Phase } from "@/lib/validations/phases";
import { DispatchNotFoundError } from "@/services/errors";

export type InsertDispatchInput = {
  projectId: string;
  userId: string;
  prompt: string;
  kind?: CreativeKind;
  confidence?: number;
  intentSource?: IntentSource;
  model: string;
  parentArtifactId?: string;
  aspectRatio?: AspectRatio;
  imageStyle?: ImageStyle;
  phases: Phase[];
};

export type DispatchRecord = typeof dispatchRecords.$inferSelect;

export async function insertQueuedDispatch(
  input: InsertDispatchInput,
): Promise<DispatchRecord> {
  const db = getDb();
  const [row] = await db
    .insert(dispatchRecords)
    .values({
      projectId: input.projectId,
      userId: input.userId,
      prompt: input.prompt,
      kind: input.kind,
      confidence: input.confidence,
      intentSource: input.intentSource,
      status: "queued",
      model: input.model,
      parentArtifactId: input.parentArtifactId,
      aspectRatio: input.aspectRatio,
      imageStyle: input.imageStyle,
      phases: input.phases,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to insert dispatch record.");
  }

  return row;
}

export async function getDispatchById(
  runId: string,
): Promise<DispatchRecord | undefined> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(dispatchRecords)
    .where(eq(dispatchRecords.id, runId))
    .limit(1);
  return row;
}

export async function requireDispatch(runId: string): Promise<DispatchRecord> {
  const row = await getDispatchById(runId);
  if (!row) {
    throw new DispatchNotFoundError();
  }
  return row;
}

/** Claim a queued run so only one SSE subscriber starts work. */
export async function claimQueuedDispatch(
  runId: string,
): Promise<DispatchRecord | undefined> {
  const db = getDb();
  const [row] = await db
    .update(dispatchRecords)
    .set({ status: "dispatched" })
    .where(
      and(eq(dispatchRecords.id, runId), eq(dispatchRecords.status, "queued")),
    )
    .returning();
  return row;
}

export async function updateDispatch(
  runId: string,
  patch: Partial<
    Pick<
      DispatchRecord,
      | "status"
      | "phases"
      | "creditsReserved"
      | "creditsSettled"
      | "creditsStatus"
      | "creditPhases"
      | "errorMessage"
      | "completedAt"
      | "model"
      | "kind"
      | "confidence"
      | "intentSource"
    >
  >,
): Promise<DispatchRecord> {
  const db = getDb();
  const [row] = await db
    .update(dispatchRecords)
    .set(patch)
    .where(eq(dispatchRecords.id, runId))
    .returning();

  if (!row) {
    throw new DispatchNotFoundError();
  }

  return row;
}

export async function markDispatchFailed(input: {
  runId: string;
  phases: Phase[];
  errorMessage: string;
}): Promise<void> {
  await updateDispatch(input.runId, {
    status: "failed",
    phases: input.phases,
    errorMessage: input.errorMessage,
    creditsSettled: 0,
    completedAt: new Date(),
  });
}

export async function listProjectDispatches(projectId: string, userId: string) {
  const db = getDb();
  return db
    .select({
      dispatch: dispatchRecords,
      output: creativeOutputs,
    })
    .from(dispatchRecords)
    .leftJoin(
      creativeOutputs,
      eq(creativeOutputs.dispatchId, dispatchRecords.id),
    )
    .where(
      and(
        eq(dispatchRecords.projectId, projectId),
        eq(dispatchRecords.userId, userId),
      ),
    )
    .orderBy(desc(dispatchRecords.createdAt));
}
