import { z } from "zod";

export const PhaseNameSchema = z.enum([
  "queued",
  "classified",
  "dispatched",
  "generating",
  "persisted",
  "settled",
  "failed",
  "aborted",
]);
export type PhaseName = z.infer<typeof PhaseNameSchema>;

export const PhaseSchema = z.object({
  phase: PhaseNameSchema,
  at: z.string().datetime(),
});
export type Phase = z.infer<typeof PhaseSchema>;

export function nowPhase(phase: PhaseName): Phase {
  return { phase, at: new Date().toISOString() };
}
