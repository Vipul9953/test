import { CREDIT_ESTIMATE } from "@/lib/constants";
import type { CreativeKind } from "@/lib/types/creative";
import {
  holdAccountCredits,
  releaseAccountCredits,
  settleAccountCredits,
} from "@/repositories/credits";

export function estimateCredits(kind: CreativeKind): number {
  return CREDIT_ESTIMATE[kind];
}

export async function holdCredits(input: {
  userId: string;
  dispatchId: string;
  amount: number;
}): Promise<void> {
  if (input.amount <= 0) {
    return;
  }
  await holdAccountCredits(input);
}

export async function settleCredits(input: {
  userId: string;
  dispatchId: string;
  amount: number;
}): Promise<void> {
  if (input.amount <= 0) {
    return;
  }
  await settleAccountCredits(input);
}

export async function releaseCredits(input: {
  userId: string;
  dispatchId: string;
  amount: number;
}): Promise<void> {
  if (input.amount <= 0) {
    return;
  }
  await releaseAccountCredits(input);
}
