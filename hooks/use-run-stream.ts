"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { canvasQueryKey, creditsQueryKey } from "@/lib/query-keys";
import type { LiveCanvasRun } from "@/lib/validations/canvas";
import { StreamEventSchema } from "@/lib/validations/stream-events";

function parseStreamEvent(raw: string) {
  try {
    const json = JSON.parse(raw) as { type?: string };
    const parsed = StreamEventSchema.safeParse(json);
    if (parsed.success) {
      return parsed;
    }
    if (json?.type === "done" && json && typeof json === "object") {
      const loose = json as {
        type: "done";
        artifactId?: string;
        content?: LiveCanvasRun["content"];
      };
      return {
        success: true as const,
        data: {
          type: "done" as const,
          artifactId: loose.artifactId ?? "",
          content: loose.content,
        },
      };
    }
    return parsed;
  } catch {
    return { success: false as const };
  }
}

function applyEvent(run: LiveCanvasRun, raw: string): LiveCanvasRun {
  const parsed = parseStreamEvent(raw);
  if (!parsed.success) {
    return run;
  }

  const event = parsed.data;

  if (event.type === "classified") {
    return { ...run, kind: event.kind, confidence: event.confidence };
  }

  if (event.type === "dispatched") {
    return { ...run, status: "dispatched" };
  }

  if (event.type === "partial") {
    if (event.kind === "image") {
      const previous =
        run.content?.kind === "image" ? run.content.content : {};
      return {
        ...run,
        status: "dispatched",
        content: {
          kind: "image",
          content: { ...previous, ...event.content },
        },
      };
    }

    return {
      ...run,
      status: "dispatched",
      content: {
        kind: event.kind,
        content: event.content,
      },
    };
  }

  if (event.type === "done") {
    return {
      ...run,
      status: "completed",
      artifactId: event.artifactId || run.artifactId,
      content: event.content ?? run.content,
    };
  }

  return {
    ...run,
    status: "failed",
    errorMessage: event.message,
  };
}

export function useRunStream(input: {
  projectId: string;
  runId: string;
  status: LiveCanvasRun["status"];
  onSettled?: () => void;
}) {
  const queryClient = useQueryClient();
  const onSettledRef = useRef(input.onSettled);
  onSettledRef.current = input.onSettled;

  const isTerminal = input.status === "completed" || input.status === "failed";

  useEffect(() => {
    if (isTerminal) {
      return;
    }

    const source = new EventSource(`/api/runs/${input.runId}/stream`);

    const onMessage = (message: MessageEvent<string>) => {
      queryClient.setQueryData<{ runs: LiveCanvasRun[] }>(
        canvasQueryKey(input.projectId),
        (current) => {
          if (!current) {
            return current;
          }

          const next = current.runs.map((run) =>
            run.runId === input.runId ? applyEvent(run, message.data) : run,
          );

          return { runs: next };
        },
      );

      try {
        const parsed = parseStreamEvent(message.data);
        if (!parsed.success) {
          return;
        }
        if (parsed.data.type === "done" || parsed.data.type === "error") {
          void queryClient.invalidateQueries({ queryKey: creditsQueryKey });
          source.close();
          onSettledRef.current?.();
        }
      } catch {
        // ignore malformed frames
      }
    };

    source.addEventListener("classified", onMessage);
    source.addEventListener("dispatched", onMessage);
    source.addEventListener("partial", onMessage);
    source.addEventListener("done", onMessage);
    source.addEventListener("error", onMessage);

    return () => {
      source.close();
    };
  }, [input.projectId, input.runId, isTerminal, queryClient]);
}
