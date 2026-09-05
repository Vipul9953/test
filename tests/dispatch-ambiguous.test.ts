import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PROJECT_ID } from "@/lib/constants";
import { AmbiguousIntentError } from "@/services/errors";
import {
  queueCreativeDispatch,
  type QueueDispatchDeps,
} from "@/services/dispatch";

function stubDeps(overrides: Partial<QueueDispatchDeps> = {}): QueueDispatchDeps {
  return {
    assertProjectOwned: async () => undefined,
    ensureCreditAccount: async () =>
      ({
        userId: "operator-1",
        available: 1000,
        held: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    assertArtifactExists: async () => undefined,
    getParentContext: async () => {
      throw new Error("no parent in this test");
    },
    resolveIntent: async () => {
      throw new AmbiguousIntentError();
    },
    insertQueuedDispatch: vi.fn(),
    ...overrides,
  };
}

describe("queueCreativeDispatch ambiguous path", () => {
  it("does not insert a row and returns ambiguous", async () => {
    const insertQueuedDispatch = vi.fn();

    const result = await queueCreativeDispatch(
      {
        userId: "operator-1",
        payload: {
          projectId: DEFAULT_PROJECT_ID,
          prompt: "make something nice",
        },
      },
      stubDeps({ insertQueuedDispatch }),
    );

    expect(result).toEqual({
      status: "ambiguous",
      runId: null,
      message: expect.any(String),
    });
    expect(insertQueuedDispatch).not.toHaveBeenCalled();
  });

  it("does not insert a row when the wallet cannot cover the kind", async () => {
    const insertQueuedDispatch = vi.fn();

    const result = await queueCreativeDispatch(
      {
        userId: "operator-1",
        payload: {
          projectId: DEFAULT_PROJECT_ID,
          prompt: "a red kite photo",
          intent: "image",
        },
      },
      stubDeps({
        insertQueuedDispatch,
        ensureCreditAccount: async () => ({
          userId: "operator-1",
          available: 2,
          held: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        resolveIntent: async () => ({
          kind: "image",
          confidence: 1,
          source: "explicit",
          model: "test",
        }),
      }),
    );

    expect(result).toEqual({
      status: "credits",
      runId: null,
      message: "Please subscribe",
    });
    expect(insertQueuedDispatch).not.toHaveBeenCalled();
  });
});
