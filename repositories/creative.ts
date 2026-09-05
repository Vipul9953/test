import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { creativeOutputs, dispatchRecords } from "@/db/schema";
import type { ArtifactContent, CreativeKind } from "@/lib/types/creative";
import type { AspectRatio, ImageStyle } from "@/lib/validations/image-options";
import { ParentArtifactNotFoundError } from "@/services/errors";

export type CreativeOutput = typeof creativeOutputs.$inferSelect;

export async function assertArtifactExists(artifactId: string): Promise<void> {
  const db = getDb();
  const [row] = await db
    .select({ id: creativeOutputs.id })
    .from(creativeOutputs)
    .where(eq(creativeOutputs.id, artifactId))
    .limit(1);

  if (!row) {
    throw new ParentArtifactNotFoundError();
  }
}

export async function insertCreativeOutput(input: {
  dispatchId: string;
  kind: CreativeKind;
  content: ArtifactContent["content"];
  parentId?: string | null;
}): Promise<CreativeOutput> {
  const db = getDb();
  const [row] = await db
    .insert(creativeOutputs)
    .values({
      dispatchId: input.dispatchId,
      kind: input.kind,
      content: input.content,
      parentId: input.parentId ?? null,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to persist creative output.");
  }

  return row;
}

export async function getParentContext(artifactId: string): Promise<{
  artifactId: string;
  kind: CreativeKind;
  prompt: string;
  aspectRatio: AspectRatio | null;
  imageStyle: ImageStyle | null;
}> {
  const db = getDb();
  const [row] = await db
    .select({
      artifactId: creativeOutputs.id,
      kind: creativeOutputs.kind,
      prompt: dispatchRecords.prompt,
      aspectRatio: dispatchRecords.aspectRatio,
      imageStyle: dispatchRecords.imageStyle,
    })
    .from(creativeOutputs)
    .innerJoin(
      dispatchRecords,
      eq(dispatchRecords.id, creativeOutputs.dispatchId),
    )
    .where(eq(creativeOutputs.id, artifactId))
    .limit(1);

  if (!row) {
    throw new ParentArtifactNotFoundError();
  }

  return row;
}

export async function getCreativeByDispatchId(
  dispatchId: string,
): Promise<CreativeOutput | undefined> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(creativeOutputs)
    .where(eq(creativeOutputs.dispatchId, dispatchId))
    .limit(1);
  return row;
}
