"use client";

import { memo, useState } from "react";
import { LandingPagePreview } from "@/components/studio/landing-page-preview";
import { EmailPreview } from "@/components/studio/email-preview";
import { displayCreativePrompt } from "@/lib/email/brief";
import { isCancelledRun } from "@/lib/constants";
import { openLandingInNewTab } from "@/lib/landing/preview-cache";
import type { LiveCanvasRun } from "@/lib/validations/canvas";

function cardPrompt(prompt: string): string {
  return displayCreativePrompt(prompt);
}

const KIND_LABEL = {
  image: "Image",
  "landing-page": "Landing page",
  email: "Email",
} as const;

function shortId(value: string): string {
  return value.slice(0, 8);
}

export const CreativeTile = memo(function CreativeTile({
  run,
  parentRunId,
  highlighted,
  onWhyThis,
  onHighlightParent,
  onImprovise,
}: {
  run: LiveCanvasRun;
  parentRunId?: string;
  highlighted?: boolean;
  onWhyThis: (runId: string) => void;
  onHighlightParent: (runId: string) => void;
  onImprovise: (run: LiveCanvasRun) => void;
}) {
  const isPending = run.status === "queued" || run.status === "dispatched";
  const isFailed = run.status === "failed";
  const cancelled = isFailed && isCancelledRun(run.errorMessage);

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md dark:bg-zinc-950 ${
        highlighted
          ? "border-amber-400 ring-2 ring-amber-300 dark:border-amber-400 dark:ring-amber-700"
          : isFailed
            ? "border-red-200 dark:border-red-900"
            : isPending
              ? "border-amber-200 dark:border-amber-900"
              : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <header className="flex items-center justify-between gap-2 px-4 pt-4">
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
            {run.kind ? KIND_LABEL[run.kind] : "Classifying"}
          </span>
          <span className="font-mono text-[10px] text-zinc-400">
            {shortId(run.runId)}
          </span>
          {run.artifactId ? (
            <span className="font-mono text-[10px] text-zinc-400">
              · {shortId(run.artifactId)}
            </span>
          ) : null}
          {run.confidence != null ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
              {Math.round(run.confidence * 100)}% sure
            </span>
          ) : null}
        </span>
        <span
          className={`text-[11px] font-medium ${
            isFailed
              ? "text-red-500"
              : isPending
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {isPending ? "Generating" : cancelled ? "Cancelled" : isFailed ? "Failed" : "Ready"}
        </span>
      </header>

      {(run.kind === "landing-page" || run.kind === "email") && !isFailed ? (
        <div
          role={
            run.kind === "landing-page" && run.status === "completed"
              ? "link"
              : "presentation"
          }
          onClick={() => {
            if (
              run.kind !== "landing-page" ||
              run.status !== "completed" ||
              !run.content ||
              run.content.kind !== "landing-page"
            ) {
              return;
            }
            openLandingInNewTab({
              runId: run.runId,
              prompt: run.prompt,
              copy: run.content.content,
            });
          }}
          className={`min-h-48 flex-1 px-3 py-3 text-left sm:px-4 ${
            run.kind === "landing-page" && run.status === "completed"
              ? "cursor-pointer"
              : "cursor-default"
          }`}
        >
          <TileBody run={run} />
        </div>
      ) : isFailed ? (
        <div className="min-h-48 flex-1 cursor-default px-3 py-3 text-left sm:px-4">
          <TileBody run={run} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onWhyThis(run.runId)}
          className="min-h-48 flex-1 cursor-pointer px-3 py-3 text-left outline-none sm:px-4"
        >
          <TileBody run={run} />
        </button>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 px-4 py-3 dark:border-zinc-900">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[11px] text-zinc-600 dark:text-zinc-300">
            {cardPrompt(run.prompt)}
          </p>
          {run.parentArtifactId ? (
            <p className="mt-0.5 text-[11px] text-zinc-400">
              Improvised from →{" "}
              <button
                type="button"
                className="font-mono font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-200"
                onClick={() => {
                  if (parentRunId) {
                    onHighlightParent(parentRunId);
                  }
                }}
              >
                {shortId(run.parentArtifactId)}
              </button>
            </p>
          ) : null}
        </div>

        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => onWhyThis(run.runId)}
            className="rounded-full px-2.5 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Why this?
          </button>
          {run.kind === "landing-page" && run.status === "completed" ? (
            <button
              type="button"
              onClick={() => {
                if (!run.content || run.content.kind !== "landing-page") {
                  return;
                }
                openLandingInNewTab({
                  runId: run.runId,
                  prompt: run.prompt,
                  copy: run.content.content,
                });
              }}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Open tab
            </button>
          ) : null}
          {run.status === "completed" && run.artifactId ? (
            <button
              type="button"
              onClick={() => onImprovise(run)}
              className="rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Improvise
            </button>
          ) : null}
        </div>
      </footer>
    </article>
  );
});

function TileBody({ run }: { run: LiveCanvasRun }) {
  if (run.status === "failed") {
    return (
      <div className="flex h-full min-h-40 flex-col justify-center rounded-xl bg-red-50 px-3 py-4 dark:bg-red-950/40">
        <p className="text-sm font-medium text-red-700 dark:text-red-300">
          {isCancelledRun(run.errorMessage) ? "This run was cancelled" : "This run failed"}
        </p>
        <p className="mt-1 text-xs text-red-600/80 dark:text-red-400">
          {isCancelledRun(run.errorMessage)
            ? "Nothing was saved. Credits were returned."
            : (run.errorMessage ?? "Credits were released. Nothing was settled.")}
        </p>
      </div>
    );
  }

  if (!run.kind) {
    return <SkeletonBlock label="Reading the prompt" />;
  }

  if (run.kind === "image") {
    const imagePartial =
      run.content && run.content.kind === "image" ? run.content.content : undefined;
    const url = imagePartial && "url" in imagePartial ? imagePartial.url : undefined;
    if (!url) {
      return (
        <SkeletonBlock
          label="Painting a placeholder frame"
          progress={imagePartial?.progress}
        />
      );
    }
    const imageMeta =
      run.content && run.content.kind === "image" ? run.content.content : undefined;
    const aspectClass =
      imageMeta && "aspectRatio" in imageMeta && imageMeta.aspectRatio === "9:16"
        ? "aspect-[9/16] max-h-72"
        : imageMeta && "aspectRatio" in imageMeta && imageMeta.aspectRatio === "1:1"
          ? "aspect-square"
          : imageMeta && "aspectRatio" in imageMeta && imageMeta.aspectRatio === "16:9"
            ? "aspect-video"
            : "aspect-[4/3]";

    return <TileImage url={url} alt={run.prompt} aspectClass={aspectClass} />;
  }

  if (run.kind === "landing-page") {
    const landing =
      run.content && run.content.kind === "landing-page"
        ? run.content.content
        : undefined;

    return (
      <LandingPagePreview
        copy={landing}
        prompt={run.prompt}
        streaming={run.status !== "completed"}
      />
    );
  }

  const copy =
    run.content && run.content.kind !== "image" ? run.content.content : undefined;

  if (!copy?.headline && !copy?.body) {
    return <SkeletonBlock label="Writing copy" />;
  }

  if (run.kind === "email") {
    return (
      <EmailPreview
        headline={copy.headline}
        body={copy.body}
        ctaLabel={copy.ctaLabel}
        ctaUrl={copy.ctaUrl}
        prompt={run.prompt}
      />
    );
  }

  return (
    <div className="rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-700 p-4 text-white">
      <h3 className="text-lg font-semibold leading-snug">
        {copy.headline ?? "…"}
      </h3>
      <p className="mt-2 text-sm leading-6 text-zinc-200">{copy.body ?? ""}</p>
      {copy.ctaLabel ? (
        <span className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-900">
          {copy.ctaLabel}
        </span>
      ) : null}
    </div>
  );
}

function SkeletonBlock({
  label,
  progress,
}: {
  label: string;
  progress?: number;
}) {
  const percent =
    progress != null ? Math.round(Math.min(1, Math.max(0, progress)) * 100) : null;

  return (
    <div className="flex min-h-40 flex-col justify-end gap-3">
      <div className="h-4 w-2/3 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-3 w-full animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-900" />
      <div className="h-3 w-5/6 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-900" />
      {percent != null ? (
        <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-amber-500 transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : null}
      <p className="text-[11px] text-zinc-400">
        {label}
        {percent != null ? ` ${percent}%` : "…"}
      </p>
    </div>
  );
}

function TileImage({
  url,
  alt,
  aspectClass,
}: {
  url: string;
  alt: string;
  aspectClass: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={`flex w-full items-center justify-center rounded-xl bg-zinc-100 text-zinc-400 dark:bg-zinc-900 ${aspectClass}`}>
        <span className="text-xs">Image failed to load</span>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${aspectClass}`}>
      {!loaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-400" />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`absolute inset-0 h-full w-full rounded-xl object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
