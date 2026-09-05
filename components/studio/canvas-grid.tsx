"use client";

import { CreativeTile } from "@/components/studio/creative-tile";
import type { LiveCanvasRun } from "@/lib/validations/canvas";

export function CanvasGrid({
  runs,
  highlightedRunId,
  onWhyThis,
  onHighlightParent,
  onImprovise,
}: {
  runs: LiveCanvasRun[];
  highlightedRunId?: string | null;
  onWhyThis: (runId: string) => void;
  onHighlightParent: (runId: string) => void;
  onImprovise: (run: LiveCanvasRun) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {runs.map((run) => (
        <div
          key={run.runId} // stable from the action — never a client temp id
          id={`run-${run.runId}`}
          className={run.kind === "landing-page" ? "col-span-full" : undefined}
        >
          <CreativeTile
            run={run}
            parentRunId={
              runs.find((row) => row.artifactId === run.parentArtifactId)?.runId
            }
            highlighted={highlightedRunId === run.runId}
            onWhyThis={onWhyThis}
            onHighlightParent={onHighlightParent}
            onImprovise={onImprovise}
          />
        </div>
      ))}
    </div>
  );
}
