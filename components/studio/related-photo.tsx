"use client";

import { staticPhotoUrl } from "@/lib/landing/static-photos";
import type { LandingPhotoSlot } from "@/lib/landing/photo";

export function RelatedPhoto({
  prompt,
  slot,
  index = 0,
  alt,
  className,
  priority,
  width = 900,
}: {
  prompt: string;
  slot: LandingPhotoSlot;
  index?: number;
  alt: string;
  className?: string;
  priority?: boolean;
  width?: number;
}) {
  const src = staticPhotoUrl({ prompt, slot, index, width });

  return (
    <div className={`relative overflow-hidden bg-[#ece7de] ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        decoding={priority ? "sync" : "async"}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "low"}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  );
}
