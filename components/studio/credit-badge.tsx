"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { CREDIT_ESTIMATE, INITIAL_CREDITS, SUBSCRIBE_MESSAGE } from "@/lib/constants";
import { creditsQueryKey } from "@/lib/query-keys";
import {
  CreditBalanceSchema,
  type CreditActivityEntry,
  type CreditBalance,
} from "@/lib/validations/canvas";

async function fetchCredits(): Promise<CreditBalance> {
  const response = await fetch("/api/credits");
  if (!response.ok) {
    throw new Error("Could not load credits");
  }
  return CreditBalanceSchema.parse(await response.json());
}

const KIND_LABEL = {
  image: "Image",
  "landing-page": "Landing page",
  email: "Email",
} as const;

function activityCopy(entry: CreditActivityEntry): {
  label: string;
  signed: string;
  tone: string;
  chip: string;
} {
  if (entry.creditsStatus === "released") {
    return {
      label: "Released · returned to wallet",
      signed: `+${entry.reserved}`,
      tone: "text-emerald-700 dark:text-emerald-300",
      chip: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
    };
  }
  if (entry.creditsStatus === "settled") {
    return {
      label: "Settled · charged",
      signed: `−${entry.settled}`,
      tone: "text-rose-700 dark:text-rose-300",
      chip: "bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200",
    };
  }
  if (entry.creditsStatus === "held") {
    return {
      label: "Hold · generating now",
      signed: `−${entry.reserved}`,
      tone: "text-amber-800 dark:text-amber-200",
      chip: "bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-100",
    };
  }
  return {
    label: "No change",
    signed: "0",
    tone: "text-zinc-500",
    chip: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300",
  };
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CreditBadge() {
  const query = useQuery({
    queryKey: creditsQueryKey,
    queryFn: fetchCredits,
    staleTime: 4_000,
    refetchOnMount: false,
  });
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const signup = query.data?.signup ?? INITIAL_CREDITS;
  const available = query.data?.available;
  const held = query.data?.held ?? 0;
  const used = query.data?.used ?? query.data?.settled ?? 0;
  const settled = query.data?.settled ?? 0;
  const released = query.data?.released ?? 0;
  const activity = query.data?.activity ?? [];
  const heldRows = activity.filter((entry) => entry.creditsStatus === "held");
  const releasedRows = activity.filter((entry) => entry.creditsStatus === "released");

  const refetchCredits = query.refetch;

  useEffect(() => {
    if (!open) {
      return;
    }

    void refetchCredits();

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, refetchCredits]);

  return (
    <div ref={rootRef} className="relative">
      <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
        <div className="hidden items-center gap-1.5 sm:flex">
          <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
            Image {CREDIT_ESTIMATE.image}
          </span>
          <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
            Landing {CREDIT_ESTIMATE["landing-page"]}
          </span>
          <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
            Email {CREDIT_ESTIMATE.email}
          </span>
        </div>

        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((current) => !current)}
          className="inline-flex flex-wrap items-center gap-1.5 rounded-full border border-zinc-200 bg-white/90 px-2.5 py-1.5 text-xs font-medium text-zinc-800 shadow-sm backdrop-blur transition hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-950/80 dark:text-zinc-100 dark:hover:border-zinc-700"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              available !== undefined && available < CREDIT_ESTIMATE.image
                ? "bg-rose-500"
                : "bg-emerald-500"
            }`}
          />
          <span className="text-sm font-semibold tabular-nums">
            {available === undefined ? "…" : available}
            <span className="ml-1 text-xs font-medium text-zinc-500">avail</span>
          </span>
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800 dark:bg-rose-950 dark:text-rose-200">
            {used} used
          </span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-950 dark:bg-amber-950 dark:text-amber-100">
            {held} hold
          </span>
          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            {released} released
          </span>
          {available !== undefined && available < CREDIT_ESTIMATE.image ? (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800 dark:bg-violet-950 dark:text-violet-200">
              {SUBSCRIBE_MESSAGE}
            </span>
          ) : null}
        </button>
      </div>

      {open ? (
        <div
          role="dialog"
          aria-label="Credit statement"
          className="absolute right-0 z-50 mt-2 max-h-[calc(100dvh-5.5rem)] w-[min(26rem,calc(100vw-1.25rem))] overflow-y-auto overscroll-contain rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Credit statement
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {available === undefined ? "…" : available}
              <span className="ml-2 text-base font-medium text-zinc-500">
                available
              </span>
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-2.5 px-5 py-4">
            <div className="rounded-xl bg-sky-50 px-3.5 py-3 dark:bg-sky-950/40">
              <dt className="text-xs font-medium text-sky-700 dark:text-sky-300">
                Signup
              </dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-sky-900 dark:text-sky-100">
                +{signup}
              </dd>
            </div>
            <div className="rounded-xl bg-rose-50 px-3.5 py-3 dark:bg-rose-950/40">
              <dt className="text-xs font-medium text-rose-700 dark:text-rose-300">
                Used / settled
              </dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-rose-900 dark:text-rose-100">
                −{used}
              </dd>
              <p className="mt-1 text-xs font-medium text-rose-700/80 dark:text-rose-200/80">
                Settled {settled}
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 px-3.5 py-3 dark:bg-amber-950/40">
              <dt className="text-xs font-medium text-amber-800 dark:text-amber-300">
                Hold (generating)
              </dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-amber-950 dark:text-amber-100">
                {held}
              </dd>
            </div>
            <div className="rounded-xl bg-emerald-50 px-3.5 py-3 dark:bg-emerald-950/40">
              <dt className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Released / returned
              </dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-emerald-900 dark:text-emerald-100">
                +{released}
              </dd>
              {releasedRows.length > 0 ? (
                <p className="mt-1 text-xs leading-snug text-emerald-800/80 dark:text-emerald-200/80">
                  {releasedRows.length} cancel / fail return
                  {releasedRows.length === 1 ? "" : "s"}
                </p>
              ) : null}
            </div>
          </dl>

          {held > 0 ? (
            <div className="mx-5 mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 dark:border-amber-900 dark:bg-amber-950/40">
              <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                Generating now · {held} on hold
              </p>
              <p className="mt-1 text-sm leading-snug text-amber-900/80 dark:text-amber-200/80">
                {heldRows.length > 0
                  ? heldRows
                      .map(
                        (row) =>
                          `${row.kind ? KIND_LABEL[row.kind] : "Run"} −${row.reserved}`,
                      )
                      .join(" · ")
                  : "Credits stay locked until the run finishes, then they settle or release."}
              </p>
            </div>
          ) : null}

          <div className="border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Where they moved
            </p>
          </div>

          <ul className="px-3 pb-4">
            {activity.length === 0 ? (
              <li className="px-2 py-6 text-center text-sm text-zinc-500">
                No credit movement yet. Generate something to see hold, settle,
                and release here.
              </li>
            ) : (
              activity.map((entry) => {
                const copy = activityCopy(entry);
                return (
                  <li
                    key={entry.runId}
                    className="flex items-start justify-between gap-3 rounded-xl px-2 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {entry.kind ? KIND_LABEL[entry.kind] : "Run"} ·{" "}
                        {entry.prompt || "Untitled"}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-zinc-500">
                        {entry.projectName} · {formatWhen(entry.createdAt)}
                      </p>
                      <span
                        className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${copy.chip}`}
                      >
                        {copy.label}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 text-lg font-semibold tabular-nums ${copy.tone}`}
                    >
                      {copy.signed}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
