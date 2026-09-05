import { requireOperator } from "@/lib/auth/require-operator";
import { jsonError } from "@/lib/http/api-error";
import { loadLandingPreview } from "@/lib/landing/load-preview";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  try {
    const operator = await requireOperator();
    const { runId } = await context.params;
    const preview = await loadLandingPreview(runId, operator.userId);
    if (!preview) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    return Response.json(preview);
  } catch (error) {
    return jsonError(error);
  }
}
