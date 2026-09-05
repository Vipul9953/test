import { z } from "zod";
import { EmailBriefSchema } from "@/lib/email/brief";
import { LandingBriefSchema } from "@/lib/landing/brief";
import { AspectRatioSchema, ImageStyleSchema } from "./image-options";

export const CreativeKindSchema = z.enum(["image", "landing-page", "email"]);
export type CreativeKind = z.infer<typeof CreativeKindSchema>;

export const DispatchStatusSchema = z.enum([
  "queued",
  "dispatched",
  "completed",
  "failed",
]);
export type DispatchStatus = z.infer<typeof DispatchStatusSchema>;

export const IntentSourceSchema = z.enum(["explicit", "classified"]);
export type IntentSource = z.infer<typeof IntentSourceSchema>;

export const DispatchInputSchema = z.object({
  projectId: z.string().uuid(),
  prompt: z.string().trim().min(1).max(4000),
  intent: CreativeKindSchema.optional(),
  parentArtifactId: z.string().uuid().optional(),
  aspectRatio: AspectRatioSchema.optional(),
  imageStyle: ImageStyleSchema.optional(),
  landing: LandingBriefSchema.optional(),
  email: EmailBriefSchema.optional(),
});
export type DispatchInput = z.infer<typeof DispatchInputSchema>;

export const DispatchResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("queued"),
    runId: z.string().uuid(),
  }),
  z.object({
    status: z.literal("ambiguous"),
    runId: z.null(),
    message: z.string(),
  }),
  z.object({
    status: z.literal("credits"),
    runId: z.null(),
    message: z.string(),
  }),
]);
export type DispatchResult = z.infer<typeof DispatchResultSchema>;
