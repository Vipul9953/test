import { z } from "zod";
import { LandingPageContentSchema } from "./artifact";
import { DispatchStatusSchema } from "./dispatch";

export const LandingPreviewResponseSchema = z.object({
  runId: z.string().uuid(),
  prompt: z.string(),
  status: DispatchStatusSchema,
  content: LandingPageContentSchema.nullable(),
});

export type LandingPreviewResponse = z.infer<typeof LandingPreviewResponseSchema>;
