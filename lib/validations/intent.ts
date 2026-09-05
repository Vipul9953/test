import { z } from "zod";
import { CreativeKindSchema, IntentSourceSchema } from "./dispatch";

export const IntentSchema = z.object({
  kind: CreativeKindSchema,
  confidence: z.number().min(0).max(1),
});
export type Intent = z.infer<typeof IntentSchema>;

export const ResolvedIntentSchema = IntentSchema.extend({
  source: IntentSourceSchema,
  model: z.string(),
});
export type ResolvedIntent = z.infer<typeof ResolvedIntentSchema>;
