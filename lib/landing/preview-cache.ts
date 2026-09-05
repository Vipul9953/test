import type { LiveArtifactContent } from "@/lib/validations/canvas";

export type LandingPreviewPayload = {
  runId: string;
  prompt: string;
  copy: Extract<LiveArtifactContent, { kind: "landing-page" }>["content"];
};

const keyFor = (runId: string) => `skala.landing.${runId}`;

export function cacheLandingPreview(payload: LandingPreviewPayload): void {
  localStorage.setItem(keyFor(payload.runId), JSON.stringify(payload));
}

export function readLandingPreview(runId: string): LandingPreviewPayload | null {
  try {
    const raw = localStorage.getItem(keyFor(runId));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as LandingPreviewPayload;
  } catch {
    return null;
  }
}

export function landingPageHref(runId: string): string {
  return `/l/${runId}`;
}

/** Native window, not Next router — never replace the studio URL. */
export function openLandingInNewTab(payload: LandingPreviewPayload): void {
  cacheLandingPreview(payload);
  const url = `${window.location.origin}${landingPageHref(payload.runId)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
