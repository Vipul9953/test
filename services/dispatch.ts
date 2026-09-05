import { encodeEmailBrief } from "@/lib/email/brief";
import { encodeLandingBrief } from "@/lib/landing/brief";
import { CLASSIFIER_MODEL, SUBSCRIBE_MESSAGE } from "@/lib/constants";
import { estimateCredits } from "@/services/credits";
import type { DispatchInput, DispatchResult } from "@/lib/validations/dispatch";
import { nowPhase } from "@/lib/validations/phases";
import {
  assertArtifactExists,
  getParentContext,
} from "@/repositories/creative";
import { ensureCreditAccount } from "@/repositories/credits";
import { insertQueuedDispatch } from "@/repositories/dispatch";
import { assertProjectOwned } from "@/repositories/projects";
import { expandPromptForKind } from "@/lib/prompt/expand";
import { resolveIntent } from "@/services/classifier";
import { AmbiguousIntentError } from "@/services/errors";

export type QueueDispatchDeps = {
  assertProjectOwned: typeof assertProjectOwned;
  ensureCreditAccount: typeof ensureCreditAccount;
  assertArtifactExists: typeof assertArtifactExists;
  getParentContext: typeof getParentContext;
  resolveIntent: typeof resolveIntent;
  insertQueuedDispatch: typeof insertQueuedDispatch;
};

const defaultDeps: QueueDispatchDeps = {
  assertProjectOwned,
  ensureCreditAccount,
  assertArtifactExists,
  getParentContext,
  resolveIntent,
  insertQueuedDispatch,
};

/**
 * Classify first, then persist `queued`.
 * Ambiguous (confidence < 0.6) returns with no row, no hold, no render.
 */
export async function queueCreativeDispatch(
  input: {
    userId: string;
    payload: DispatchInput;
  },
  deps: QueueDispatchDeps = defaultDeps,
): Promise<DispatchResult> {
  await deps.assertProjectOwned(input.payload.projectId, input.userId);
  const account = await deps.ensureCreditAccount(input.userId);

  const parent = input.payload.parentArtifactId
    ? await deps.getParentContext(input.payload.parentArtifactId)
    : undefined;

  if (input.payload.parentArtifactId && !parent) {
    await deps.assertArtifactExists(input.payload.parentArtifactId);
  }

  try {
    const intent = await deps.resolveIntent({
      prompt: input.payload.prompt,
      intent: input.payload.intent,
      parentKind: parent?.kind,
    });

    if (account.available < estimateCredits(intent.kind)) {
      return {
        status: "credits",
        runId: null,
        message: SUBSCRIBE_MESSAGE,
      };
    }

    const direction = parent
      ? input.payload.prompt
      : expandPromptForKind(input.payload.prompt, intent.kind);
    const withLanding = encodeLandingBrief(input.payload.landing, direction);
    const withBrief = encodeEmailBrief(input.payload.email, withLanding);
    const storedPrompt = parent
      ? `Improve this ${parent.kind}. Original: ${parent.prompt}. Direction: ${withBrief}`
      : withBrief;

    const queued = await deps.insertQueuedDispatch({
      projectId: input.payload.projectId,
      userId: input.userId,
      prompt: storedPrompt,
      kind: intent.kind,
      confidence: intent.confidence,
      intentSource: intent.source,
      model: intent.model || CLASSIFIER_MODEL,
      parentArtifactId: input.payload.parentArtifactId,
      aspectRatio: input.payload.aspectRatio ?? parent?.aspectRatio ?? undefined,
      imageStyle: input.payload.imageStyle ?? parent?.imageStyle ?? undefined,
      phases: [nowPhase("queued")],
    });

    return { status: "queued", runId: queued.id };
  } catch (error) {
    if (error instanceof AmbiguousIntentError) {
      return {
        status: "ambiguous",
        runId: null,
        message: error.message,
      };
    }
    throw error;
  }
}
