"use client";

import { useRunStream } from "@/hooks/use-run-stream";
import type { LiveCanvasRun } from "@/lib/validations/canvas";

export type InFlightJob = {
  projectId: string;
  runId: string;
  status: LiveCanvasRun["status"];
};

function StreamSlot({
  job,
  onSettled,
}: {
  job: InFlightJob;
  onSettled: (runId: string) => void;
}) {
  useRunStream({
    projectId: job.projectId,
    runId: job.runId,
    status: job.status,
    onSettled: () => onSettled(job.runId),
  });
  return null;
}

export function InFlightStreams({
  jobs,
  onSettled,
}: {
  jobs: InFlightJob[];
  onSettled: (runId: string) => void;
}) {
  return (
    <>
      {jobs.map((job) => (
        <StreamSlot key={job.runId} job={job} onSettled={onSettled} />
      ))}
    </>
  );
}
