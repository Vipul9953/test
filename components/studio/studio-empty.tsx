export function StudioEmpty() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-400">
        Ready when you are
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Nothing generated yet
      </h2>
      <p className="mt-3 text-sm leading-6 text-zinc-500">
        This project is empty. Type a prompt — a skeleton tile appears on the
        run id, then SSE fills that tile. Switch or add a project in the header.
      </p>
    </div>
  );
}
