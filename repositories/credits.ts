import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { creditAccounts, dispatchRecords, projects } from "@/db/schema";
import { INITIAL_CREDITS } from "@/lib/constants";
import { displayCreativePrompt } from "@/lib/email/brief";
import type { CreditActivityEntry } from "@/lib/validations/canvas";
import { appendCreditPhase } from "@/lib/validations/credit-phases";
import { InsufficientCreditsError } from "@/services/errors";

export type CreditAccount = typeof creditAccounts.$inferSelect;

export async function ensureCreditAccount(userId: string): Promise<CreditAccount> {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(creditAccounts)
    .where(eq(creditAccounts.userId, userId))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(creditAccounts)
    .values({
      userId,
      available: INITIAL_CREDITS,
      held: 0,
    })
    .onConflictDoNothing()
    .returning();

  if (created) {
    return created;
  }

  const [retry] = await db
    .select()
    .from(creditAccounts)
    .where(eq(creditAccounts.userId, userId))
    .limit(1);

  if (!retry) {
    throw new Error("Failed to seed credit account.");
  }

  return retry;
}

export async function getCreditLedgerTotals(userId: string): Promise<{
  settled: number;
  released: number;
}> {
  const db = getDb();
  const [row] = await db
    .select({
      settled: sql<number>`coalesce(sum(${dispatchRecords.creditsSettled}), 0)`,
      released: sql<number>`coalesce(sum(case when ${dispatchRecords.creditsStatus} = 'released' then ${dispatchRecords.creditsReserved} else 0 end), 0)`,
    })
    .from(dispatchRecords)
    .where(eq(dispatchRecords.userId, userId));

  return {
    settled: Number(row?.settled ?? 0),
    released: Number(row?.released ?? 0),
  };
}

export async function getCreditActivity(
  userId: string,
): Promise<CreditActivityEntry[]> {
  const db = getDb();
  const rows = await db
    .select({
      runId: dispatchRecords.id,
      projectId: dispatchRecords.projectId,
      projectName: projects.name,
      kind: dispatchRecords.kind,
      prompt: dispatchRecords.prompt,
      status: dispatchRecords.status,
      creditsStatus: dispatchRecords.creditsStatus,
      reserved: dispatchRecords.creditsReserved,
      settled: dispatchRecords.creditsSettled,
      createdAt: dispatchRecords.createdAt,
    })
    .from(dispatchRecords)
    .innerJoin(projects, eq(projects.id, dispatchRecords.projectId))
    .where(eq(dispatchRecords.userId, userId))
    .orderBy(desc(dispatchRecords.createdAt))
    .limit(40);

  return rows
    .filter(
      (row) =>
        row.creditsStatus !== "none" || row.reserved > 0 || row.settled > 0,
    )
    .map((row) => ({
      runId: row.runId,
      projectId: row.projectId,
      projectName: row.projectName,
      kind: row.kind,
      prompt: displayCreativePrompt(row.prompt),
      status: row.status,
      creditsStatus: row.creditsStatus,
      reserved: row.reserved,
      settled: row.settled,
      createdAt: row.createdAt.toISOString(),
    }));
}

/** Wallet + run columns in one transaction. No-op if the run is not `none`. */
export async function holdAccountCredits(input: {
  userId: string;
  dispatchId: string;
  amount: number;
}): Promise<void> {
  const db = getDb();

  await db.transaction(async (tx) => {
    const [dispatch] = await tx
      .select({
        creditsStatus: dispatchRecords.creditsStatus,
        creditPhases: dispatchRecords.creditPhases,
      })
      .from(dispatchRecords)
      .where(eq(dispatchRecords.id, input.dispatchId))
      .for("update");

    if (!dispatch || dispatch.creditsStatus !== "none") {
      return;
    }

    const [account] = await tx
      .select()
      .from(creditAccounts)
      .where(eq(creditAccounts.userId, input.userId))
      .for("update");

    if (!account || account.available < input.amount) {
      throw new InsufficientCreditsError();
    }

    await tx
      .update(creditAccounts)
      .set({
        available: account.available - input.amount,
        held: account.held + input.amount,
        updatedAt: new Date(),
      })
      .where(eq(creditAccounts.userId, input.userId));

    await tx
      .update(dispatchRecords)
      .set({
        creditsReserved: input.amount,
        creditsSettled: 0,
        creditsStatus: "held",
        creditPhases: appendCreditPhase(dispatch.creditPhases, "hold"),
      })
      .where(eq(dispatchRecords.id, input.dispatchId));
  });
}

/** Burn the hold after the artifact row exists. No-op unless status is `held`. */
export async function settleAccountCredits(input: {
  userId: string;
  dispatchId: string;
  amount: number;
}): Promise<void> {
  const db = getDb();

  await db.transaction(async (tx) => {
    const [dispatch] = await tx
      .select({
        creditsStatus: dispatchRecords.creditsStatus,
        creditPhases: dispatchRecords.creditPhases,
      })
      .from(dispatchRecords)
      .where(eq(dispatchRecords.id, input.dispatchId))
      .for("update");

    if (!dispatch || dispatch.creditsStatus !== "held") {
      return;
    }

    const [account] = await tx
      .select()
      .from(creditAccounts)
      .where(eq(creditAccounts.userId, input.userId))
      .for("update");

    if (!account) {
      throw new Error("Credit account missing during settle.");
    }

    await tx
      .update(creditAccounts)
      .set({
        held: Math.max(0, account.held - input.amount),
        updatedAt: new Date(),
      })
      .where(eq(creditAccounts.userId, input.userId));

    await tx
      .update(dispatchRecords)
      .set({
        creditsSettled: input.amount,
        creditsStatus: "settled",
        creditPhases: appendCreditPhase(dispatch.creditPhases, "settle"),
      })
      .where(eq(dispatchRecords.id, input.dispatchId));
  });
}

/** Return the hold to available. Leaves `credits_settled = 0`. */
export async function releaseAccountCredits(input: {
  userId: string;
  dispatchId: string;
  amount: number;
}): Promise<void> {
  const db = getDb();

  await db.transaction(async (tx) => {
    const [dispatch] = await tx
      .select({
        creditsStatus: dispatchRecords.creditsStatus,
        creditPhases: dispatchRecords.creditPhases,
      })
      .from(dispatchRecords)
      .where(eq(dispatchRecords.id, input.dispatchId))
      .for("update");

    if (!dispatch || dispatch.creditsStatus !== "held") {
      return;
    }

    const [account] = await tx
      .select()
      .from(creditAccounts)
      .where(eq(creditAccounts.userId, input.userId))
      .for("update");

    if (!account) {
      return;
    }

    await tx
      .update(creditAccounts)
      .set({
        held: Math.max(0, account.held - input.amount),
        available: account.available + input.amount,
        updatedAt: new Date(),
      })
      .where(eq(creditAccounts.userId, input.userId));

    await tx
      .update(dispatchRecords)
      .set({
        creditsSettled: 0,
        creditsStatus: "released",
        creditPhases: appendCreditPhase(dispatch.creditPhases, "release"),
      })
      .where(eq(dispatchRecords.id, input.dispatchId));
  });
}
