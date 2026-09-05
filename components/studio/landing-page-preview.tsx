"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { LandingPageDocument } from "@/components/studio/landing-page-document";
import type { LiveArtifactContent } from "@/lib/validations/canvas";

type LandingCopy = Extract<LiveArtifactContent, { kind: "landing-page" }>["content"];

const PAGE_WIDTH = 1280;

export function LandingPagePreview({
  copy,
  prompt,
  streaming,
}: {
  copy?: LandingCopy;
  prompt: string;
  streaming: boolean;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const last = useRef({ frameWidth: 0, pageHeight: 900 });
  const [metrics, setMetrics] = useState(last.current);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const page = pageRef.current;
    if (!frame || !page) {
      return;
    }

    const measure = () => {
      const frameWidth = frame.clientWidth;
      const pageHeight = Math.max(page.scrollHeight, page.offsetHeight, 900);
      const prev = last.current;
      if (
        Math.abs(frameWidth - prev.frameWidth) < 4 &&
        Math.abs(pageHeight - prev.pageHeight) < 16
      ) {
        return;
      }
      last.current = { frameWidth, pageHeight };
      setMetrics({ frameWidth, pageHeight });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(page);
    return () => observer.disconnect();
  }, []);

  const scale = metrics.frameWidth > 0 ? metrics.frameWidth / PAGE_WIDTH : 0.25;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-[#f4efe6] shadow-inner dark:border-zinc-800">
      <div className="flex items-center gap-2 border-b border-black/10 bg-white/70 px-3 py-2">
        <span className="size-2 rounded-full bg-[#ff5f57]" />
        <span className="size-2 rounded-full bg-[#febc2e]" />
        <span className="size-2 rounded-full bg-[#28c840]" />
        <span className="ml-2 min-w-0 truncate rounded-full bg-black/5 px-2.5 py-0.5 text-[10px] text-zinc-500">
          {copy?.brandName
            ? `${copy.brandName.toLowerCase().replace(/[^a-z0-9]+/g, "")}.so`
            : "preview.site"}
        </span>
        <span className="ml-auto text-[10px] font-medium text-[#c45c26]">
          {streaming ? "Streaming" : "Full page"}
        </span>
      </div>

      <div
        ref={frameRef}
        className="relative w-full overflow-hidden"
        style={{ height: Math.ceil(metrics.pageHeight * scale) }}
      >
        <div
          ref={pageRef}
          className="pointer-events-none absolute left-0 top-0 origin-top-left"
          style={{
            width: PAGE_WIDTH,
            transform: `scale(${scale})`,
          }}
        >
          <LandingPageDocument
            copy={copy}
            prompt={prompt}
            streaming={streaming}
            interactive={false}
          />
        </div>
      </div>
    </div>
  );
}
