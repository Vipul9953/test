import { z } from "zod";
import { CreativeKindSchema } from "./dispatch";
import {
  ArtifactContentSchema,
  CopyContentSchema,
  ImageContentSchema,
  PartialLandingPageContentSchema,
} from "./artifact";

export const StreamErrorCodeSchema = z.enum([
  "render",
  "abort",
  "not_found",
  "credits",
]);

const PartialStreamSchema = z.discriminatedUnion("kind", [
  z.object({
    type: z.literal("partial"),
    kind: z.literal("image"),
    content: ImageContentSchema.partial(),
  }),
  z.object({
    type: z.literal("partial"),
    kind: z.literal("landing-page"),
    content: PartialLandingPageContentSchema,
  }),
  z.object({
    type: z.literal("partial"),
    kind: z.literal("email"),
    content: CopyContentSchema.partial(),
  }),
]);

export const StreamEventSchema = z.union([
  z.object({
    type: z.literal("classified"),
    kind: CreativeKindSchema,
    confidence: z.number().min(0).max(1),
  }),
  z.object({
    type: z.literal("dispatched"),
    runId: z.string().uuid(),
  }),
  PartialStreamSchema,
  z.object({
    type: z.literal("done"),
    artifactId: z.string().uuid(),
    content: ArtifactContentSchema,
  }),
  z.object({
    type: z.literal("error"),
    message: z.string(),
    code: StreamErrorCodeSchema,
  }),
]);

export type StreamEvent = z.infer<typeof StreamEventSchema>;
export type StreamErrorCode = z.infer<typeof StreamErrorCodeSchema>;
