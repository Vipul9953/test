import { requireOperator } from "@/lib/auth/require-operator";
import { jsonError } from "@/lib/http/api-error";
import { UuidSchema } from "@/lib/validations/canvas";
import { WhyThisSchema } from "@/lib/validations/why-this";
import { getWhyThisByRunId } from "@/repositories/why-this";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  try {
    await requireOperator();
    const { runId } = await context.params;
    UuidSchema.parse(runId);
    const payload = await getWhyThisByRunId(runId);

    if (!payload) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    return Response.json(WhyThisSchema.parse(payload));
  } catch (error) {
    return jsonError(error);
  }
}
