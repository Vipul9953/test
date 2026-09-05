import { z } from "zod";
import { CreativeKindSchema, DispatchStatusSchema, IntentSourceSchema } from "./dispatch";
import { AspectRatioSchema, ImageStyleSchema } from "./image-options";
import { CreditPhaseSchema, CreditsStatusSchema } from "./credit-phases";
import { PhaseSchema } from "./phases";

export const WhyThisSchema = z.object({
  runId: z.string().uuid(),
  artifactId: z.string().uuid().nullable(),
  prompt: z.string(),
  kind: CreativeKindSchema.nullable(),
  confidence: z.number().nullable(),
  intentSource: IntentSourceSchema.nullable(),
  model: z.string(),
  phases: z.array(PhaseSchema),
  creditPhases: z.array(CreditPhaseSchema),
  creditsReserved: z.number().int(),
  creditsSettled: z.number().int(),
  creditsStatus: CreditsStatusSchema,
  aspectRatio: AspectRatioSchema.nullable(),
  imageStyle: ImageStyleSchema.nullable(),
  status: DispatchStatusSchema,
  parent: z
    .object({
      id: z.string().uuid(),
      kind: CreativeKindSchema,
    })
    .nullable(),
});

export type WhyThisPayload = z.infer<typeof WhyThisSchema>;
