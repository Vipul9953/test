import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db";
import { creativeOutputs, dispatchRecords } from "@/db/schema";
import type { WhyThisPayload } from "@/lib/validations/why-this";

export type { WhyThisPayload };

export async function getWhyThisByRunId(
  runId: string,
): Promise<WhyThisPayload | undefined> {
  const db = getDb();
  const parentOutput = alias(creativeOutputs, "parent_output");

  const [row] = await db
    .select({
      dispatch: dispatchRecords,
      output: creativeOutputs,
      parent: parentOutput,
    })
    .from(dispatchRecords)
    .leftJoin(creativeOutputs, eq(creativeOutputs.dispatchId, dispatchRecords.id))
    .leftJoin(parentOutput, eq(parentOutput.id, dispatchRecords.parentArtifactId))
    .where(eq(dispatchRecords.id, runId))
    .limit(1);

  if (!row) {
    return undefined;
  }

  return {
    runId: row.dispatch.id,
    artifactId: row.output?.id ?? null,
    prompt: row.dispatch.prompt,
    kind: row.dispatch.kind,
    confidence: row.dispatch.confidence,
    intentSource: row.dispatch.intentSource,
    model: row.dispatch.model,
    phases: row.dispatch.phases,
    creditPhases: row.dispatch.creditPhases,
    creditsReserved: row.dispatch.creditsReserved,
    creditsSettled: row.dispatch.creditsSettled,
    creditsStatus: row.dispatch.creditsStatus,
    aspectRatio: row.dispatch.aspectRatio ?? null,
    imageStyle: row.dispatch.imageStyle ?? null,
    status: row.dispatch.status,
    parent: row.parent
      ? { id: row.parent.id, kind: row.parent.kind }
      : null,
  };
}
