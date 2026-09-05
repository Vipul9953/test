import type { StreamEvent } from "@/lib/types/creative";
import { runOrchestrator } from "@/services/orchestrator";

/**
 * Brief reconnects (React Strict Mode remount, flaky EventSource) must not
 * release a hold. A real close — tab hidden, reader cancelled, no resubscribe
 * within the grace window — aborts the work controller. The orchestrator
 * observes *that* signal and calls release.
 */
export const DISCONNECT_GRACE_MS = 400;

type Subscriber = (event: StreamEvent) => void;

type HubEntry = {
  userId: string;
  work: AbortController;
  subscribers: Set<Subscriber>;
  started: boolean;
  finished: boolean;
  events: StreamEvent[];
  disconnectTimer: ReturnType<typeof setTimeout> | undefined;
};

const hub = new Map<string, HubEntry>();

function getOrCreate(runId: string, userId: string): HubEntry {
  const existing = hub.get(runId);
  if (existing) {
    return existing;
  }

  const created: HubEntry = {
    userId,
    work: new AbortController(),
    subscribers: new Set(),
    started: false,
    finished: false,
    events: [],
    disconnectTimer: undefined,
  };
  hub.set(runId, created);
  return created;
}

function broadcast(entry: HubEntry, event: StreamEvent) {
  entry.events.push(event);
  for (const subscriber of entry.subscribers) {
    subscriber(event);
  }
}

function isTerminal(event: StreamEvent): boolean {
  return event.type === "done" || event.type === "error";
}

export function subscribeToRun(input: {
  runId: string;
  userId: string;
  requestSignal: AbortSignal;
  emit: Subscriber;
}): void {
  const entry = getOrCreate(input.runId, input.userId);

  if (entry.disconnectTimer) {
    clearTimeout(entry.disconnectTimer);
    entry.disconnectTimer = undefined;
  }

  entry.subscribers.add(input.emit);

  for (const event of entry.events) {
    input.emit(event);
  }

  if (!entry.started) {
    entry.started = true;
    void runOrchestrator({
      runId: input.runId,
      userId: entry.userId,
      signal: entry.work.signal,
      emit: (event) => {
        broadcast(entry, event);
        if (isTerminal(event)) {
          entry.finished = true;
          hub.delete(input.runId);
        }
      },
    }).catch(() => {
      broadcast(entry, {
        type: "error",
        code: "render",
        message: "Orchestrator crashed.",
      });
      hub.delete(input.runId);
    });
  }

  const onDisconnect = () => {
    entry.subscribers.delete(input.emit);
    if (
      entry.subscribers.size > 0 ||
      entry.work.signal.aborted ||
      entry.finished
    ) {
      return;
    }

    entry.disconnectTimer = setTimeout(() => {
      if (
        entry.subscribers.size === 0 &&
        !entry.work.signal.aborted &&
        !entry.finished
      ) {
        entry.work.abort();
      }
    }, DISCONNECT_GRACE_MS);
  };

  if (input.requestSignal.aborted) {
    onDisconnect();
    return;
  }

  input.requestSignal.addEventListener("abort", onDisconnect, { once: true });
}

export function abortRunWork(runId: string): boolean {
  const entry = hub.get(runId);
  if (!entry) {
    return false;
  }
  if (entry.disconnectTimer) {
    clearTimeout(entry.disconnectTimer);
    entry.disconnectTimer = undefined;
  }
  if (!entry.work.signal.aborted) {
    entry.work.abort("cancelled");
  }
  return true;
}
