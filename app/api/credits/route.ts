import { requireOperator } from "@/lib/auth/require-operator";
import { jsonError } from "@/lib/http/api-error";
import { CreditBalanceSchema } from "@/lib/validations/canvas";
import {
  ensureCreditAccount,
  getCreditActivity,
  getCreditLedgerTotals,
} from "@/repositories/credits";
import { INITIAL_CREDITS } from "@/lib/constants";

export const runtime = "nodejs";

export async function GET() {
  try {
    const operator = await requireOperator();
    const account = await ensureCreditAccount(operator.userId);
    const [totals, activity] = await Promise.all([
      getCreditLedgerTotals(operator.userId),
      getCreditActivity(operator.userId),
    ]);

    return Response.json(
      CreditBalanceSchema.parse({
        signup: INITIAL_CREDITS,
        available: account.available,
        held: account.held,
        used: totals.settled,
        settled: totals.settled,
        released: totals.released,
        activity,
      }),
    );
  } catch (error) {
    return jsonError(error);
  }
}
