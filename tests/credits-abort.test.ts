import { describe, expect, it, vi } from "vitest";
import type { DispatchRecord } from "@/repositories/dispatch";
import { RenderAbortedError } from "@/services/errors";
import {
  runOrchestrator,
  type OrchestratorDeps,
} from "@/services/orchestrator";
import type { ArtifactContent } from "@/lib/types/creative";
import { nowPhase } from "@/lib/validations/phases";

function queuedRecord(): DispatchRecord {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    projectId: "11111111-1111-4111-8111-111111111111",
    userId: "operator-1",
    prompt: "Summer sale email",
    kind: "email",
    confidence: 0.94,
    intentSource: "classified",
    status: "queued",
    model: "gpt-4o-mini",
    creditsReserved: 0,
    creditsSettled: 0,
    creditsStatus: "none",
    creditPhases: [],
    aspectRatio: null,
    imageStyle: null,
    parentArtifactId: null,
    phases: [nowPhase("queued")],
    errorMessage: null,
    createdAt: new Date(),
    completedAt: null,
  };
}

function buildDeps(overrides: Partial<OrchestratorDeps> = {}): {
  deps: OrchestratorDeps;
  hold: ReturnType<typeof vi.fn>;
  settle: ReturnType<typeof vi.fn>;
  release: ReturnType<typeof vi.fn>;
  markFailed: ReturnType<typeof vi.fn>;
  insertOutput: ReturnType<typeof vi.fn>;
} {
  const record = queuedRecord();
  const hold = vi.fn(async () => undefined);
  const settle = vi.fn(async () => undefined);
  const release = vi.fn(async () => undefined);
  const markFailed = vi.fn(async () => undefined);
  const insertOutput = vi.fn(async () => ({
    id: "33333333-3333-4333-8333-333333333333",
    dispatchId: record.id,
    kind: "email" as const,
    content: {
      headline: "Sale",
      body: "30% off",
      ctaLabel: "Shop",
      ctaUrl: "/shop",
    },
    parentId: null,
    createdAt: new Date(),
  }));

  const deps: OrchestratorDeps = {
    claim: async () => ({ ...record, status: "dispatched" }),
    getDispatch: async () => record,
    getOutput: async () => undefined,
    updateDispatch: async () => record,
    markFailed,
    insertOutput,
    hold,
    settle,
    release,
    render: async () =>
      ({
        kind: "email",
        content: {
          headline: "Sale",
          body: "30% off",
          ctaLabel: "Shop",
          ctaUrl: "/shop",
        },
      }) satisfies ArtifactContent,
    ...overrides,
  };

  return { deps, hold, settle, release, markFailed, insertOutput };
}

describe("credit release on abort and failure", () => {
  it("releases the hold and leaves settled credits at zero when the signal aborts", async () => {
    const controller = new AbortController();
    const { deps, hold, settle, release, markFailed, insertOutput } = buildDeps({
      render: ({ signal }) =>
        new Promise((_, reject) => {
          const fail = () => reject(new RenderAbortedError());
          if (signal.aborted) {
            fail();
            return;
          }
          signal.addEventListener("abort", fail, { once: true });
        }),
    });

    const events: string[] = [];
    const run = runOrchestrator(
      {
        runId: queuedRecord().id,
        userId: "operator-1",
        signal: controller.signal,
        emit: (event) => events.push(event.type),
      },
      deps,
    );

    await vi.waitFor(() => expect(hold).toHaveBeenCalledOnce());
    controller.abort();
    await run;

    expect(release).toHaveBeenCalledOnce();
    expect(release.mock.calls[0]?.[0]).toMatchObject({
      dispatchId: queuedRecord().id,
      amount: 8,
    });
    expect(settle).not.toHaveBeenCalled();
    expect(insertOutput).not.toHaveBeenCalled();
    expect(markFailed).toHaveBeenCalledOnce();
    expect(markFailed.mock.calls[0]?.[0]).toMatchObject({
      runId: queuedRecord().id,
      errorMessage: "Client disconnected before the run finished.",
    });
    expect(events).toContain("error");
  });

  it("releases on render error and never settles", async () => {
    const { deps, hold, settle, release, markFailed } = buildDeps({
      render: async () => {
        throw new Error("model exploded");
      },
    });

    await runOrchestrator(
      {
        runId: queuedRecord().id,
        userId: "operator-1",
        signal: new AbortController().signal,
        emit: () => undefined,
      },
      deps,
    );

    expect(hold).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
    expect(settle).not.toHaveBeenCalled();
    expect(markFailed).toHaveBeenCalledOnce();
  });

  it("marks a user cancel without writing output", async () => {
    const controller = new AbortController();
    const { deps, insertOutput, markFailed, settle } = buildDeps({
      render: ({ signal }) =>
        new Promise((_, reject) => {
          const fail = () => reject(new RenderAbortedError());
          if (signal.aborted) {
            fail();
            return;
          }
          signal.addEventListener("abort", fail, { once: true });
        }),
    });

    const run = runOrchestrator(
      {
        runId: queuedRecord().id,
        userId: "operator-1",
        signal: controller.signal,
        emit: () => undefined,
      },
      deps,
    );

    await vi.waitFor(() => expect(deps.hold).toHaveBeenCalledOnce());
    controller.abort("cancelled");
    await run;

    expect(insertOutput).not.toHaveBeenCalled();
    expect(settle).not.toHaveBeenCalled();
    expect(markFailed).toHaveBeenCalledOnce();
    expect(markFailed.mock.calls[0]?.[0]).toMatchObject({
      errorMessage: "Cancelled.",
    });
  });

  it("settles only after the artifact is persisted", async () => {
    const order: string[] = [];
    const { deps } = buildDeps({
      insertOutput: async (input) => {
        order.push("persist");
        return {
          id: "33333333-3333-4333-8333-333333333333",
          dispatchId: input.dispatchId,
          kind: input.kind,
          content: input.content,
          parentId: input.parentId ?? null,
          createdAt: new Date(),
        };
      },
      settle: async () => {
        order.push("settle");
      },
    });

    await runOrchestrator(
      {
        runId: queuedRecord().id,
        userId: "operator-1",
        signal: new AbortController().signal,
        emit: () => undefined,
      },
      deps,
    );

    expect(order).toEqual(["persist", "settle"]);
  });

  it("does not release after the artifact is already persisted", async () => {
    const controller = new AbortController();
    let persistDone = false;
    const { deps, settle, release } = buildDeps({
      insertOutput: async (input) => {
        persistDone = true;
        return {
          id: "33333333-3333-4333-8333-333333333333",
          dispatchId: input.dispatchId,
          kind: input.kind,
          content: input.content,
          parentId: input.parentId ?? null,
          createdAt: new Date(),
        };
      },
      updateDispatch: async (runId, patch) => {
        if (persistDone && patch.phases?.some((phase) => phase.phase === "persisted")) {
          controller.abort();
        }
        return queuedRecord();
      },
    });

    await runOrchestrator(
      {
        runId: queuedRecord().id,
        userId: "operator-1",
        signal: controller.signal,
        emit: () => undefined,
      },
      deps,
    );

    expect(settle).toHaveBeenCalledOnce();
    expect(release).not.toHaveBeenCalled();
  });
});
