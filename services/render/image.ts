import { IMAGE_ASPECT_SIZE } from "@/lib/validations/image-options";
import type { AspectRatio, ImageStyle } from "@/lib/validations/image-options";
import type { ImageContent } from "@/lib/types/creative";

export function buildPlaceholderImageUrl(
  runId: string,
  aspectRatio?: AspectRatio,
  imageStyle?: ImageStyle,
): string {
  const size = aspectRatio
    ? IMAGE_ASPECT_SIZE[aspectRatio]
    : IMAGE_ASPECT_SIZE["4:3"];
  const seed = imageStyle ? `${runId}-${imageStyle}` : runId;
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${size.width}/${size.height}`;
}

export function renderImage(
  runId: string,
  options?: { aspectRatio?: AspectRatio | null; imageStyle?: ImageStyle | null },
): ImageContent {
  const aspectRatio = options?.aspectRatio ?? undefined;
  const imageStyle = options?.imageStyle ?? undefined;
  return {
    url: buildPlaceholderImageUrl(runId, aspectRatio, imageStyle),
    aspectRatio,
    imageStyle,
  };
}
