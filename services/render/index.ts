import { IMAGE_RENDER_DELAY_MS } from "@/lib/constants";
import type { AspectRatio, ImageStyle } from "@/lib/validations/image-options";
import type {
  ArtifactContent,
  CreativeKind,
  StreamEvent,
} from "@/lib/types/creative";
import { RenderAbortedError } from "@/services/errors";
import { renderCopy } from "./copy";
import { renderImage } from "./image";

function waitForImageDelay(signal: AbortSignal, ms = IMAGE_RENDER_DELAY_MS): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new RenderAbortedError());
      return;
    }

    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timer);
      reject(new RenderAbortedError());
    }

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export type RenderPartialEmit = (
  event: Extract<StreamEvent, { type: "partial" }>,
) => void;

export async function renderCreative(input: {
  runId: string;
  kind: CreativeKind;
  prompt: string;
  signal: AbortSignal;
  onPartial: RenderPartialEmit;
  aspectRatio?: AspectRatio | null;
  imageStyle?: ImageStyle | null;
}): Promise<ArtifactContent> {
  if (input.signal.aborted) {
    throw new RenderAbortedError();
  }

  if (input.kind === "image") {
    input.onPartial({ type: "partial", kind: "image", content: {} });
    await waitForImageDelay(input.signal);
    const content = renderImage(input.runId, {
      aspectRatio: input.aspectRatio,
      imageStyle: input.imageStyle,
    });
    input.onPartial({ type: "partial", kind: "image", content });
    return { kind: "image", content };
  }

  const content = await renderCopy({
    kind: input.kind,
    prompt: input.prompt,
    abortSignal: input.signal,
    onPartial: (partial) => {
      if (input.kind === "landing-page") {
        input.onPartial({ type: "partial", kind: "landing-page", content: partial });
        return;
      }
      input.onPartial({ type: "partial", kind: "email", content: partial });
    },
  });

  if (input.kind === "landing-page") {
    return { kind: "landing-page", content };
  }

  return { kind: "email", content };
}
