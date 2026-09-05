"use client";

import { useQuery } from "@tanstack/react-query";
import { whyThisQueryKey } from "@/lib/query-keys";
import { WhyThisSchema, type WhyThisPayload } from "@/lib/validations/why-this";

async function fetchWhyThis(runId: string): Promise<WhyThisPayload> {
  const response = await fetch(`/api/runs/${runId}/why-this`);
  if (!response.ok) {
    throw new Error("Could not load run details");
  }
  return WhyThisSchema.parse(await response.json());
}

const PHASE_LABEL: Record<string, string> = {
  queued: "Queued",
  classified: "Classified",
  dispatched: "Dispatched",
  generating: "Generated",
  persisted: "Persisted",
  settled: "Settled",
  failed: "Failed",
  aborted: "Aborted",
};

const CREDIT_PHASE_LABEL: Record<string, string> = {
  hold: "Hold",
  settle: "Settle",
  release: "Release",
};

export function WhyThisDrawer({
  runId,
  onClose,
}: {
  runId: string | null;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: whyThisQueryKey(runId ?? ""),
    queryFn: () => fetchWhyThis(runId!),
    enabled: Boolean(runId),
  });

  const open = Boolean(runId);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-zinc-950/40 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Why this?"
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-2xl transition-transform dark:border-zinc-800 dark:bg-zinc-950 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">
              Why this?
            </p>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Run details
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            Close
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 pb-8">
          {query.isLoading ? (
            <div className="space-y-3">
              <div className="h-16 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
              <div className="h-24 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
            </div>
          ) : null}

          {query.isError ? (
            <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              Could not read this run from the database.
            </p>
          ) : null}

          {query.data ? <WhyThisBody data={query.data} /> : null}
        </div>
      </aside>
    </>
  );
}

function WhyThisBody({ data }: { data: WhyThisPayload }) {
  const creditCost =
    data.creditsStatus === "settled"
      ? `${data.creditsSettled} settled`
      : data.creditsStatus === "released"
        ? `${data.creditsReserved} released · 0 settled`
        : data.creditsStatus === "held"
          ? `${data.creditsReserved} held`
          : "No hold";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
          {data.status}
        </span>
        <span className="text-[11px] text-zinc-400">DB read only</span>
      </div>

      <section className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900/70">
        <p className="text-[11px] uppercase tracking-wide text-zinc-400">
          Original prompt
        </p>
        <p className="mt-2 text-sm leading-6 text-zinc-800 dark:text-zinc-100">
          {data.prompt}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <MetaCard label="Kind" value={data.kind ?? "—"} />
        <MetaCard
          label="Confidence"
          value={
            data.confidence == null
              ? "—"
              : `${Math.round(data.confidence * 100)}% · ${data.intentSource ?? ""}`
          }
        />
        <MetaCard label="Model" value={data.model} />
        <MetaCard label="Credit cost" value={creditCost} />
        {data.aspectRatio ? (
          <MetaCard label="Aspect ratio" value={data.aspectRatio} />
        ) : null}
        {data.imageStyle ? (
          <MetaCard label="Style" value={data.imageStyle} />
        ) : null}
      </section>

      <section className="rounded-2xl border border-zinc-100 p-4 dark:border-zinc-800">
        <p className="text-[11px] uppercase tracking-wide text-zinc-400">
          Phase timeline
        </p>
        <ol className="mt-3 space-y-2">
          {data.phases.map((phase) => (
            <li key={`${phase.phase}-${phase.at}`} className="flex gap-3 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              <div>
                <p className="font-medium text-zinc-800 dark:text-zinc-100">
                  {PHASE_LABEL[phase.phase] ?? phase.phase}
                </p>
                <p className="text-[11px] text-zinc-400">
                  {new Date(phase.at).toLocaleTimeString()}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-zinc-100 p-4 dark:border-zinc-800">
        <p className="text-[11px] uppercase tracking-wide text-zinc-400">
          Credit phases
        </p>
        {data.creditPhases.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-400">No hold yet.</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {data.creditPhases.map((phase) => (
              <li
                key={`${phase.phase}-${phase.at}`}
                className="flex gap-3 text-sm"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                <div>
                  <p className="font-medium text-zinc-800 dark:text-zinc-100">
                    {CREDIT_PHASE_LABEL[phase.phase] ?? phase.phase}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {new Date(phase.at).toLocaleTimeString()}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {data.parent ? (
        <section className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="text-[11px] uppercase tracking-wide">Parent creative</p>
          <p className="mt-1 font-medium">
            {data.parent.kind} · {data.parent.id.slice(0, 8)}
          </p>
        </section>
      ) : (
        <p className="text-xs text-zinc-400">No parent — this is an original.</p>
      )}

    
    </div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-100 p-3 dark:border-zinc-800">
      <p className="text-[11px] uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-100">
        {value}
      </p>
    </div>
  );
}
