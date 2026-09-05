import { requireOperator } from "@/lib/auth/require-operator";
import { jsonError } from "@/lib/http/api-error";
import { ArtifactContentSchema } from "@/lib/validations/artifact";
import { CanvasListSchema, UuidSchema } from "@/lib/validations/canvas";
import { ensureCreditAccount } from "@/repositories/credits";
import { listProjectDispatches } from "@/repositories/dispatch";
import { assertProjectOwned } from "@/repositories/projects";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const operator = await requireOperator();
    const { projectId } = await context.params;
    UuidSchema.parse(projectId);

    await assertProjectOwned(projectId, operator.userId);
    await ensureCreditAccount(operator.userId);

    const rows = await listProjectDispatches(projectId, operator.userId);

    const runs = rows.map(({ dispatch, output }) => ({
      runId: dispatch.id,
      artifactId: output?.id ?? null,
      prompt: dispatch.prompt,
      kind: dispatch.kind ?? null,
      confidence: dispatch.confidence ?? null,
      status: dispatch.status,
      content: output
        ? ArtifactContentSchema.parse({
            kind: output.kind,
            content: output.content,
          })
        : null,
      parentArtifactId: dispatch.parentArtifactId,
      createdAt: dispatch.createdAt.toISOString(),
      errorMessage: dispatch.errorMessage,
      creditsSettled: dispatch.creditsSettled,
      creditsReserved: dispatch.creditsReserved,
    }));

    return Response.json(CanvasListSchema.parse({ runs }));
  } catch (error) {
    return jsonError(error);
  }
}
