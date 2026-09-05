import {
  RENDER_MODEL,
  RUN_CANCELLED_MESSAGE,
  RUN_DISCONNECTED_MESSAGE,
} from "@/lib/constants";
import type { StreamEvent } from "@/lib/types/creative";
import { ArtifactContentSchema } from "@/lib/validations/artifact";
import { nowPhase, type Phase } from "@/lib/validations/phases";
import {
  getCreativeByDispatchId,
  insertCreativeOutput,
} from "@/repositories/creative";
import {
  claimQueuedDispatch,
  markDispatchFailed,
  requireDispatch,
  updateDispatch,
  type DispatchRecord,
} from "@/repositories/dispatch";
import {
  DispatchNotFoundError,
  InsufficientCreditsError,
  RenderAbortedError,
} from "@/services/errors";
import { estimateCredits, holdCredits, releaseCredits, settleCredits } from "@/services/credits";
import { renderCreative } from "@/services/render";

export type OrchestratorEmit = (event: StreamEvent) => void;

export type OrchestratorDeps = {
  claim: typeof claimQueuedDispatch;
  getDispatch: typeof requireDispatch;
  getOutput: typeof getCreativeByDispatchId;
  updateDispatch: typeof updateDispatch;
  markFailed: typeof markDispatchFailed;
  insertOutput: typeof insertCreativeOutput;
  hold: typeof holdCredits;
  settle: typeof settleCredits;
  release: typeof releaseCredits;
  render: typeof renderCreative;
};

const defaultDeps: OrchestratorDeps = {
  claim: claimQueuedDispatch,
  getDispatch: requireDispatch,
  getOutput: getCreativeByDispatchId,
  updateDispatch,
  markFailed: markDispatchFailed,
  insertOutput: insertCreativeOutput,
  hold: holdCredits,
  settle: settleCredits,
  release: releaseCredits,
  render: renderCreative,
};

function appendPhase(phases: Phase[], name: Phase["phase"]): Phase[] {
  if (phases.some((item) => item.phase === name)) {
    return phases;
  }
  return [...phases, nowPhase(name)];
}

export async function replayTerminalRun(
  run: DispatchRecord,
  emit: OrchestratorEmit,
  deps: Pick<OrchestratorDeps, "getOutput"> = defaultDeps,
): Promise<boolean> {
  if (run.status === "completed" && run.kind) {
    const output = await deps.getOutput(run.id);
    emit({
      type: "classified",
      kind: run.kind,
      confidence: run.confidence ?? 1,
    });
    emit({ type: "dispatched", runId: run.id });
    if (output) {
      const content = ArtifactContentSchema.parse({
        kind: output.kind,
        content: output.content,
      });
      emit({
        type: "done",
        artifactId: output.id,
        content,
      });
    }
    return true;
  }

  if (run.status === "failed") {
    emit({
      type: "error",
      code: "render",
      message: run.errorMessage ?? "This run failed.",
    });
    return true;
  }

  return false;
}

/**
 * Owns hold → render → persist → settle.
 * Abort is signal-driven: the SSE route must pass `request.signal`.
 */
export async function runOrchestrator(
  input: {
    runId: string;
    userId: string;
    signal: AbortSignal;
    emit: OrchestratorEmit;
  },
  deps: OrchestratorDeps = defaultDeps,
): Promise<void> {
  let terminal = false;
  let reserved = 0;
  let artifactPersisted = false;
  let phases: Phase[] = [];

  const failAndRelease = async (message: string, code: "render" | "abort" | "credits") => {
    // Artifact already written — settle on the main path, do not release.
    if (terminal || artifactPersisted) {
      return;
    }
    terminal = true;

    if (reserved > 0) {
      await deps.release({
        userId: input.userId,
        dispatchId: input.runId,
        amount: reserved,
      });
    }

    const failedPhases = appendPhase(
      phases,
      code === "abort" ? "aborted" : "failed",
    );
    phases = failedPhases;

    await deps.markFailed({
      runId: input.runId,
      phases: failedPhases,
      errorMessage: message,
    });

    input.emit({ type: "error", code, message });
  };

  const abortMessage = () =>
    input.signal.reason === "cancelled"
      ? RUN_CANCELLED_MESSAGE
      : RUN_DISCONNECTED_MESSAGE;

  const onAbort = () => {
    void failAndRelease(abortMessage(), "abort");
  };

  input.signal.addEventListener("abort", onAbort, { once: true });

  try {
    if (input.signal.aborted) {
      await failAndRelease(abortMessage(), "abort");
      return;
    }

    const existing = await deps.getDispatch(input.runId);
    phases = existing.phases;

    if (await replayTerminalRun(existing, input.emit, deps)) {
      terminal = true;
      return;
    }

    const claimed = await deps.claim(input.runId);
    if (!claimed) {
      const latest = await deps.getDispatch(input.runId);
      if (await replayTerminalRun(latest, input.emit, deps)) {
        terminal = true;
        return;
      }
      return;
    }

    if (!claimed.kind) {
      await failAndRelease("Classifier never wrote a kind on this run.", "render");
      return;
    }

    const kind = claimed.kind;
    const confidence = claimed.confidence ?? 0;

    phases = appendPhase(claimed.phases, "classified");
    input.emit({
      type: "classified",
      kind,
      confidence,
    });

    reserved = estimateCredits(kind);
    await deps.hold({
      userId: input.userId,
      dispatchId: claimed.id,
      amount: reserved,
    });

    if (input.signal.aborted) {
      await failAndRelease(abortMessage(), "abort");
      return;
    }

    phases = appendPhase(phases, "dispatched");
    await deps.updateDispatch(claimed.id, {
      phases,
      model: `${claimed.model} / ${RENDER_MODEL}`,
    });
    input.emit({ type: "dispatched", runId: claimed.id });

    phases = appendPhase(phases, "generating");
    await deps.updateDispatch(claimed.id, { phases });

    const artifact = await deps.render({
      runId: claimed.id,
      kind,
      prompt: claimed.prompt,
      aspectRatio: claimed.aspectRatio,
      imageStyle: claimed.imageStyle,
      signal: input.signal,
      onPartial: (event) => {
        if (!input.signal.aborted && !terminal) {
          input.emit(event);
        }
      },
    });

    if (input.signal.aborted || terminal) {
      return;
    }

    // Output row is written only after the stream finishes. Cancel / fail
    // never insert creative_outputs — only dispatch_records.status changes.
    const output = await deps.insertOutput({
      dispatchId: claimed.id,
      kind: artifact.kind,
      content: artifact.content,
      parentId: claimed.parentArtifactId,
    });
    artifactPersisted = true;

    phases = appendPhase(phases, "persisted");
    await deps.updateDispatch(claimed.id, { phases });

    await deps.settle({
      userId: input.userId,
      dispatchId: claimed.id,
      amount: reserved,
    });

    phases = appendPhase(phases, "settled");
    await deps.updateDispatch(claimed.id, {
      status: "completed",
      phases,
      completedAt: new Date(),
    });

    terminal = true;
    input.emit({
      type: "done",
      artifactId: output.id,
      content: artifact,
    });
  } catch (error) {
    if (terminal) {
      return;
    }

    if (error instanceof DispatchNotFoundError) {
      terminal = true;
      input.emit({
        type: "error",
        code: "not_found",
        message: error.message,
      });
      return;
    }

    if (error instanceof InsufficientCreditsError) {
      await failAndRelease(error.message, "credits");
      return;
    }

    if (error instanceof RenderAbortedError || input.signal.aborted) {
      await failAndRelease(abortMessage(), "abort");
      return;
    }

    const message =
      error instanceof Error ? error.message : "Render failed unexpectedly.";
    await failAndRelease(message, "render");
  } finally {
    input.signal.removeEventListener("abort", onAbort);
  }
}
