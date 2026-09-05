import { IMAGE_RENDER_DELAY_MS, IMAGE_STREAM_TICK_MS } from "@/lib/constants";
import type { AspectRatio, ImageStyle } from "@/lib/validations/image-options";
import type {
  ArtifactContent,
  CreativeKind,
  StreamEvent,
} from "@/lib/types/creative";
import { RenderAbortedError } from "@/services/errors";
import { renderCopy } from "./copy";
import { renderImage } from "./image";

function sleep(ms: number, signal: AbortSignal): Promise<void> {
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

/** Hold for the full image delay, emitting a progress partial every second. */
async function streamImageDelay(
  signal: AbortSignal,
  onTick: (progress: number) => void,
  ms = IMAGE_RENDER_DELAY_MS,
): Promise<void> {
  const started = Date.now();
  onTick(0);

  while (Date.now() - started < ms) {
    if (signal.aborted) {
      throw new RenderAbortedError();
    }

    const remaining = ms - (Date.now() - started);
    await sleep(Math.min(IMAGE_STREAM_TICK_MS, remaining), signal);
    onTick(Math.min(1, (Date.now() - started) / ms));
  }
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
    await streamImageDelay(input.signal, (progress) => {
      input.onPartial({ type: "partial", kind: "image", content: { progress } });
    });
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
