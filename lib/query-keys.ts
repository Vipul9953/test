export const canvasQueryKey = (projectId: string) =>
  ["canvas", projectId] as const;

export const creditsQueryKey = ["credits"] as const;

export const whyThisQueryKey = (runId: string) => ["why-this", runId] as const;

export const meQueryKey = ["me"] as const;

export const projectsQueryKey = ["projects"] as const;
