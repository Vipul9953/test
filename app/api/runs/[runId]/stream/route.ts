import { requireOperator } from "@/lib/auth/require-operator";
import { jsonError } from "@/lib/http/api-error";
import { encodeSseEvent, SSE_HEADERS } from "@/lib/http/sse";
import type { StreamEvent } from "@/lib/types/creative";
import { UuidSchema } from "@/lib/validations/canvas";
import { subscribeToRun } from "@/services/run-hub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const { runId } = await context.params;
  let operator: Awaited<ReturnType<typeof requireOperator>>;
  try {
    UuidSchema.parse(runId);
    operator = await requireOperator();
  } catch (error) {
    return jsonError(error);
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (event: StreamEvent) => {
        try {
          controller.enqueue(encoder.encode(encodeSseEvent(event)));
          if (event.type === "done" || event.type === "error") {
            controller.close();
          }
        } catch {
          // subscriber already gone
        }
      };

      subscribeToRun({
        runId,
        userId: operator.userId,
        requestSignal: request.signal,
        emit,
      });
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
