import { z } from "zod";

export const CreditsStatusSchema = z.enum([
  "none",
  "held",
  "settled",
  "released",
]);
export type CreditsStatus = z.infer<typeof CreditsStatusSchema>;

export const CreditPhaseNameSchema = z.enum(["hold", "settle", "release"]);
export type CreditPhaseName = z.infer<typeof CreditPhaseNameSchema>;

export const CreditPhaseSchema = z.object({
  phase: CreditPhaseNameSchema,
  at: z.string().datetime(),
});
export type CreditPhase = z.infer<typeof CreditPhaseSchema>;

export function nowCreditPhase(phase: CreditPhaseName): CreditPhase {
  return { phase, at: new Date().toISOString() };
}

export function appendCreditPhase(
  phases: CreditPhase[],
  name: CreditPhaseName,
): CreditPhase[] {
  if (phases.some((row) => row.phase === name)) {
    return phases;
  }
  return [...phases, nowCreditPhase(name)];
}
