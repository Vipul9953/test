"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { logoutStudio } from "@/app/actions/auth";
import { dispatchCreative } from "@/app/actions/dispatch-creative";
import { AuthGate } from "@/components/studio/auth-gate";
import { CanvasGrid } from "@/components/studio/canvas-grid";
import { ChatComposer } from "@/components/studio/chat-composer";
import { InFlightStreams, type InFlightJob } from "@/components/studio/in-flight-streams";
import { CreditBadge } from "@/components/studio/credit-badge";
import { ProjectSwitcher } from "@/components/studio/project-switcher";
import { StudioEmpty } from "@/components/studio/studio-empty";
import { WhyThisDrawer } from "@/components/studio/why-this-drawer";
import {
  canvasQueryKey,
  creditsQueryKey,
  meQueryKey,
  projectsQueryKey,
} from "@/lib/query-keys";
import { SessionUserSchema, type SessionUser } from "@/lib/validations/auth";
import {
  displayCreativePrompt,
  encodeEmailBrief,
  type EmailBrief,
} from "@/lib/email/brief";
import { type LandingBrief } from "@/lib/landing/brief";
import type { AspectRatio, ImageStyle } from "@/lib/validations/image-options";
import type { CreativeKind } from "@/lib/validations/dispatch";
import { CanvasListSchema, type LiveCanvasRun } from "@/lib/validations/canvas";
import { ProjectListSchema, type Project } from "@/lib/validations/project";

async function fetchCanvas(projectId: string): Promise<{ runs: LiveCanvasRun[] }> {
  const response = await fetch(`/api/projects/${projectId}/canvas`);
  if (!response.ok) {
    throw new Error("Could not load canvas");
  }
  return CanvasListSchema.parse(await response.json());
}

async function fetchProjects(): Promise<Project[]> {
  const response = await fetch("/api/projects");
  if (!response.ok) {
    throw new Error("Could not load projects");
  }
  return ProjectListSchema.parse(await response.json()).projects;
}

async function fetchMe(): Promise<SessionUser | null> {
  const response = await fetch("/api/me");
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error("Could not load session");
  }
  return SessionUserSchema.parse(await response.json());
}

export function StudioShell({ initialUser }: { initialUser: SessionUser | null }) {
  return (
    <AuthGate initialUser={initialUser}>
      <StudioWorkspace />
    </AuthGate>
  );
}

const EMPTY_PROJECTS: Project[] = [];
const EMPTY_RUNS: LiveCanvasRun[] = [];

function ProjectTileCount({ projectId }: { projectId: string }) {
  const canvas = useQuery({
    queryKey: canvasQueryKey(projectId),
    queryFn: () => fetchCanvas(projectId),
    enabled: Boolean(projectId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const count = canvas.data?.runs.length ?? 0;
  return (
    <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
      {count} tile{count !== 1 ? "s" : ""}
    </span>
  );
}

function StudioCanvas({
  projectId,
  highlightedRunId,
  onWhyThis,
  onHighlightParent,
  onImprovise,
}: {
  projectId: string | null;
  highlightedRunId: string | null;
  onWhyThis: (runId: string) => void;
  onHighlightParent: (runId: string) => void;
  onImprovise: (parent: {
    artifactId: string;
    prompt: string;
    kind: CreativeKind | null;
  }) => void;
}) {
  const canvas = useQuery({
    queryKey: canvasQueryKey(projectId ?? ""),
    queryFn: () => fetchCanvas(projectId!),
    enabled: Boolean(projectId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const runs = canvas.data?.runs ?? EMPTY_RUNS;
  const showGrid = Boolean(canvas.data) && runs.length > 0;

  const handleHighlight = useCallback(
    (runId: string) => {
      onHighlightParent(runId);
      window.requestAnimationFrame(() => {
        document.getElementById(`run-${runId}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    },
    [onHighlightParent],
  );

  const handleImprovise = useCallback(
    (run: LiveCanvasRun) => {
      if (run.artifactId) {
        onImprovise({
          artifactId: run.artifactId,
          prompt: displayCreativePrompt(run.prompt),
          kind: run.kind,
        });
      }
    },
    [onImprovise],
  );

  return (
    <main className="flex-1 overflow-y-auto px-6 py-6">
      {canvas.isError ? (
        <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          Canvas could not load for this project.
        </p>
      ) : null}

      {canvas.isLoading && !canvas.data ? (
        <div className="flex h-full items-center justify-center text-sm text-zinc-400">
          Loading…
        </div>
      ) : null}

      {showGrid && projectId ? (
        <CanvasGrid
          runs={runs}
          highlightedRunId={highlightedRunId}
          onWhyThis={onWhyThis}
          onHighlightParent={handleHighlight}
          onImprovise={handleImprovise}
        />
      ) : canvas.data ? (
        <StudioEmpty />
      ) : null}
    </main>
  );
}

function StudioWorkspace() {
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [parent, setParent] = useState<{
    artifactId: string;
    prompt: string;
    kind: CreativeKind | null;
  } | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [highlightedRunId, setHighlightedRunId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [inFlight, setInFlight] = useState<InFlightJob[]>([]);

  const me = useQuery({
    queryKey: meQueryKey,
    queryFn: fetchMe,
    staleTime: 30_000,
    refetchOnMount: false,
  });

  const projectList = useQuery({
    queryKey: projectsQueryKey,
    queryFn: fetchProjects,
    staleTime: 30_000,
    refetchOnMount: false,
  });

  const projects = projectList.data ?? EMPTY_PROJECTS;

  useEffect(() => {
    if (!projectId && projects[0]) {
      setProjectId(projects[0].id);
    }
  }, [projectId, projects]);

  useEffect(() => {
    if (!highlightedRunId) {
      return;
    }
    const timer = window.setTimeout(() => setHighlightedRunId(null), 4000);
    return () => window.clearTimeout(timer);
  }, [highlightedRunId]);

  const projectInFlight = inFlight.filter((job) => job.projectId === projectId);

  const selectProject = useCallback((nextId: string) => {
    setProjectId(nextId);
    setParent(null);
    setSelectedRunId(null);
    setHighlightedRunId(null);
    setNotice(null);
  }, []);

  const clearParent = useCallback(() => setParent(null), []);
  const closeWhyThis = useCallback(() => setSelectedRunId(null), []);
  const onSettledJob = useCallback((runId: string) => {
    setInFlight((current) => current.filter((job) => job.runId !== runId));
  }, []);

  const onCreatedProject = useCallback(
    (project: Project) => {
      queryClient.setQueryData<Project[]>(projectsQueryKey, (current) => [
        ...(current ?? EMPTY_PROJECTS),
        project,
      ]);
      selectProject(project.id);
    },
    [queryClient, selectProject],
  );

  const onSubmitPrompt = useCallback(
    async (input: {
      prompt: string;
      intent?: CreativeKind;
      parentArtifactId?: string;
      aspectRatio?: AspectRatio;
      imageStyle?: ImageStyle;
      landing?: LandingBrief;
      email?: EmailBrief;
    }) => {
      if (!projectId) {
        return;
      }

      setNotice(null);

      try {
        const result = await dispatchCreative({
          projectId,
          prompt: input.prompt,
          intent: input.intent ?? parent?.kind ?? undefined,
          parentArtifactId: input.parentArtifactId,
          aspectRatio: input.aspectRatio,
          imageStyle: input.imageStyle,
          landing: input.landing,
          email: input.email,
        });

        if (result.status === "ambiguous" || result.status === "credits") {
          setNotice(result.message);
          return;
        }

        const skeleton: LiveCanvasRun = {
          runId: result.runId,
          artifactId: null,
          prompt: encodeEmailBrief(input.email, input.prompt),
          kind: input.intent ?? parent?.kind ?? null,
          confidence: input.intent || parent ? 1 : null,
          status: "queued",
          content: null,
          parentArtifactId: input.parentArtifactId ?? null,
          createdAt: new Date().toISOString(),
          errorMessage: null,
          creditsReserved: 0,
          creditsSettled: 0,
        };

        queryClient.setQueryData<{ runs: LiveCanvasRun[] }>(
          canvasQueryKey(projectId),
          (current) => ({
            runs: [
              skeleton,
              ...(current?.runs.filter((run) => run.runId !== result.runId) ?? []),
            ],
          }),
        );

        setInFlight((current) => [
          ...current.filter((job) => job.runId !== result.runId),
          { projectId, runId: result.runId, status: "queued" },
        ]);
        setParent(null);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Dispatch failed.");
      }
    },
    [parent?.kind, projectId, queryClient],
  );

  const onCancelGenerate = useCallback(() => {
    void Promise.all(
      projectInFlight.map((job) =>
        fetch(`/api/runs/${job.runId}/cancel`, { method: "POST" }),
      ),
    ).then(() => {
      void queryClient.invalidateQueries({ queryKey: creditsQueryKey });
      if (projectId) {
        void queryClient.invalidateQueries({
          queryKey: canvasQueryKey(projectId),
        });
      }
    });
  }, [projectId, projectInFlight, queryClient]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_#fafafa,_#f4f4f5)] dark:bg-[radial-gradient(circle_at_top,_#18181b,_#09090b)]">

      {/* ── Minimal top header — branding + credits only ── */}
      <header className="z-20 flex flex-shrink-0 items-center justify-between border-b border-zinc-200/70 bg-white/70 px-5 py-2.5 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/70">
        <div className="shrink-0 leading-tight">
          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-400">Skala</p>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {me.data?.name ?? "Creative generator"}
          </p>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <CreditBadge />
          <button
            type="button"
            onClick={async () => {
              await logoutStudio();
              queryClient.setQueryData(meQueryKey, null);
              queryClient.removeQueries({ queryKey: creditsQueryKey });
              queryClient.removeQueries({ queryKey: projectsQueryKey });
            }}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            Logout
          </button>
        </div>
      </header>

      {/* ── Two-panel body ── */}
      <div className="flex min-h-0 flex-1">

        {/* LEFT sidebar — project at top, composer pinned to bottom */}
        <aside className="flex w-80 flex-shrink-0 flex-col overflow-hidden border-r border-zinc-200/70 bg-white/60 backdrop-blur dark:border-zinc-800/70 dark:bg-zinc-950/60">

          {/* Project switcher block */}
          <div className="flex-shrink-0 px-4 py-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Project
            </p>
            {projects.length > 0 ? (
              <ProjectSwitcher
                projects={projects}
                projectId={projectId ?? ""}
                runsCountSlot={
                  projectId ? <ProjectTileCount projectId={projectId} /> : null
                }
                onSelect={selectProject}
                onCreated={onCreatedProject}
              />
            ) : (
              <p className="text-xs text-zinc-400">Loading projects…</p>
            )}
          </div>

          {/* Spacer — pushes composer to bottom */}
          <div className="flex-1" />

          {/* Generate composer — pinned to bottom of sidebar */}
          <div className="flex-shrink-0 px-4 py-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Generate
            </p>
            <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
              Describe what you want — image, landing page, or email.
            </p>
            <ChatComposer
              disabled={!projectId}
              parentArtifactId={parent?.artifactId}
              parentPrompt={parent?.prompt}
              parentKind={parent?.kind}
              onClearParent={clearParent}
              notice={notice}
              generating={projectInFlight.length > 0}
              onCancelGenerate={onCancelGenerate}
              onSubmitPrompt={onSubmitPrompt}
            />
          </div>
        </aside>

        {/* RIGHT — scrollable canvas */}
        <StudioCanvas
          projectId={projectId}
          highlightedRunId={highlightedRunId}
          onWhyThis={setSelectedRunId}
          onHighlightParent={setHighlightedRunId}
          onImprovise={setParent}
        />
      </div>

      <InFlightStreams jobs={inFlight} onSettled={onSettledJob} />
      <WhyThisDrawer runId={selectedRunId} onClose={closeWhyThis} />
    </div>
  );
}
