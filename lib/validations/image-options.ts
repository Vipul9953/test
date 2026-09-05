import { z } from "zod";

export const AspectRatioSchema = z.enum(["1:1", "16:9", "9:16", "4:3"]);
export type AspectRatio = z.infer<typeof AspectRatioSchema>;

export const ImageStyleSchema = z.enum([
  "photographic",
  "illustration",
  "abstract",
]);
export type ImageStyle = z.infer<typeof ImageStyleSchema>;

export const IMAGE_ASPECT_SIZE: Record<AspectRatio, { width: number; height: number }> =
  {
    "1:1": { width: 800, height: 800 },
    "16:9": { width: 800, height: 450 },
    "9:16": { width: 450, height: 800 },
    "4:3": { width: 800, height: 600 },
  };
