"use server";

import { requireOperator } from "@/lib/auth/require-operator";
import {
  DispatchInputSchema,
  type DispatchResult,
} from "@/lib/validations/dispatch";
import { queueCreativeDispatch } from "@/services/dispatch";

export async function dispatchCreative(raw: unknown): Promise<DispatchResult> {
  const input = DispatchInputSchema.parse(raw);
  const operator = await requireOperator();
  return queueCreativeDispatch({ userId: operator.userId, payload: input });
}
