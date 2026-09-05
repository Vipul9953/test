import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";

export type UserRow = typeof users.$inferSelect;

export async function findUserByName(name: string): Promise<UserRow | undefined> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.name, name))
    .limit(1);
  return row;
}

export async function findUserById(userId: string): Promise<UserRow | undefined> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row;
}

export async function insertUser(input: {
  name: string;
  passwordHash: string;
}): Promise<UserRow> {
  const db = getDb();
  const [row] = await db.insert(users).values(input).returning();
  if (!row) {
    throw new Error("Failed to create user.");
  }
  return row;
}
