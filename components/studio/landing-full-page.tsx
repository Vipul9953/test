"use client";

import { useEffect, useState } from "react";
import {
  LandingPageDocument,
  type LandingCopy,
} from "@/components/studio/landing-page-document";
import { readLandingPreview } from "@/lib/landing/preview-cache";
import {
  LandingPreviewResponseSchema,
  type LandingPreviewResponse,
} from "@/lib/validations/landing-preview";

export function LandingFullPage({
  runId,
  initial,
}: {
  runId: string;
  initial?: LandingPreviewResponse | null;
}) {
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [copy, setCopy] = useState<LandingCopy | undefined>(
    initial?.content ?? undefined,
  );
  const [streaming, setStreaming] = useState(initial?.status !== "completed");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(Boolean(initial?.content));

  useEffect(() => {
    if (!initial?.content) {
      const cached = readLandingPreview(runId);
      if (cached) {
        setPrompt(cached.prompt);
        setCopy(cached.copy);
        setStreaming(false);
        setReady(true);
      }
    }

    let cancelled = false;
    let timer: number | undefined;

    async function load() {
      const response = await fetch(`/api/runs/${runId}/landing`);
      if (cancelled) {
        return;
      }

      if (!response.ok) {
        if (!initial?.content) {
          setError((current) => current ?? "This landing page is not ready yet.");
        }
        setReady(true);
        return;
      }

      const parsed = LandingPreviewResponseSchema.safeParse(await response.json());
      if (cancelled || !parsed.success) {
        return;
      }

      setPrompt(parsed.data.prompt);
      if (parsed.data.content) {
        setCopy(parsed.data.content);
      }
      const done =
        parsed.data.status === "completed" || parsed.data.status === "failed";
      setStreaming(!done);
      setError(parsed.data.status === "failed" ? "This landing page failed." : null);
      setReady(true);

      if (!done) {
        timer = window.setTimeout(() => {
          void load();
        }, 1200);
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [initial?.content, runId]);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4efe6] text-[#17140f]/50">
        Opening landing page…
      </main>
    );
  }

  if (error && !copy) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4efe6] px-6 text-center text-[#17140f]/70">
        <p>{error}</p>
      </main>
    );
  }

  return (
    <LandingPageDocument
      copy={copy}
      prompt={prompt}
      streaming={streaming}
    />
  );
}
