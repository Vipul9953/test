import { UuidSchema } from "@/lib/validations/canvas";
import {
  LandingPreviewResponseSchema,
  type LandingPreviewResponse,
} from "@/lib/validations/landing-preview";
import { canNormalizeLanding, normalizeLandingPage } from "@/lib/landing/normalize";
import { getCreativeByDispatchId } from "@/repositories/creative";
import { getDispatchById } from "@/repositories/dispatch";

export async function loadLandingPreview(
  runId: string,
  userId: string,
): Promise<LandingPreviewResponse | null> {
  if (!UuidSchema.safeParse(runId).success) {
    return null;
  }

  const dispatch = await getDispatchById(runId);
  if (!dispatch || dispatch.userId !== userId) {
    return null;
  }

  const output = await getCreativeByDispatchId(runId);
  const raw = output?.kind === "landing-page" ? output.content : null;
  const content =
    raw && canNormalizeLanding(raw)
      ? normalizeLandingPage(raw, dispatch.prompt)
      : null;

  return LandingPreviewResponseSchema.parse({
    runId: dispatch.id,
    prompt: dispatch.prompt,
    status: dispatch.status,
    content,
  });
}
