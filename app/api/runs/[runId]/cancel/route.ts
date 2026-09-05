import { requireOperator } from "@/lib/auth/require-operator";
import { jsonError } from "@/lib/http/api-error";
import { RUN_CANCELLED_MESSAGE } from "@/lib/constants";
import { UuidSchema } from "@/lib/validations/canvas";
import { nowPhase } from "@/lib/validations/phases";
import { getDispatchById, markDispatchFailed } from "@/repositories/dispatch";
import { releaseCredits } from "@/services/credits";
import { abortRunWork } from "@/services/run-hub";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  try {
    const operator = await requireOperator();
    const { runId } = await context.params;
    UuidSchema.parse(runId);

    const dispatch = await getDispatchById(runId);
    if (!dispatch || dispatch.userId !== operator.userId) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    if (dispatch.status === "completed" || dispatch.status === "failed") {
      return Response.json({ ok: true, runId, alreadyDone: true });
    }

    const running = abortRunWork(runId);
    if (!running) {
      if (dispatch.creditsReserved > 0 && dispatch.creditsStatus === "held") {
        await releaseCredits({
          userId: operator.userId,
          dispatchId: runId,
          amount: dispatch.creditsReserved,
        });
      }
      await markDispatchFailed({
        runId,
        phases: [...dispatch.phases, nowPhase("aborted")],
        errorMessage: RUN_CANCELLED_MESSAGE,
      });
    }

    return Response.json({ ok: true, runId });
  } catch (error) {
    return jsonError(error);
  }
}
