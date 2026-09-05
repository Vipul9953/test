"use client";

import { useState, type ReactNode } from "react";
import { createProject } from "@/app/actions/create-project";
import type { Project } from "@/lib/validations/project";

export function ProjectSwitcher({
  projects,
  projectId,
  runsCountSlot,
  onSelect,
  onCreated,
}: {
  projects: Project[];
  projectId: string;
  runsCountSlot?: ReactNode;
  onSelect: (projectId: string) => void;
  onCreated: (project: Project) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      {/* Row 1: + button → dropdown → tile count */}
      <div className="flex items-center gap-2">
        {/* plain grey + / × — no border, no circle */}
        <button
          type="button"
          title="New project"
          onClick={() => { setOpen((v) => !v); setError(null); }}
          className="shrink-0 text-base font-medium text-zinc-400 hover:text-zinc-600 transition-colors dark:text-zinc-500 dark:hover:text-zinc-300"
        >
          {open ? "×" : "+"}
        </button>

        <select
          value={projectId}
          onChange={(event) => onSelect(event.target.value)}
          className="flex-1 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>

        {runsCountSlot}
      </div>

      {/* Row 2: new project form — visible only when open */}
      {open && (
        <form
          className="flex items-center gap-1.5"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setPending(true);
            try {
              const result = await createProject({ name });
              if (!result.ok) {
                setError(result.message);
                return;
              }
              setName("");
              setOpen(false);
              onCreated(result.project);
            } finally {
              setPending(false);
            }
          }}
        >
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Project name…"
            className="flex-1 min-w-0 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
          />
          <button
            type="submit"
            disabled={pending || name.trim().length === 0}
            className="shrink-0 rounded-full bg-zinc-900 px-2.5 py-1.5 text-[11px] font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {pending ? "…" : "Add"}
          </button>
        </form>
      )}

      {error ? <p className="text-[11px] text-red-500">{error}</p> : null}
    </div>
  );
}
