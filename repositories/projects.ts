import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { projects } from "@/db/schema";
import { DEFAULT_PROJECT_NAME } from "@/lib/constants";
import { DuplicateProjectError, ProjectNotFoundError } from "@/services/errors";

export type ProjectRow = typeof projects.$inferSelect;

export async function listUserProjects(userId: string): Promise<ProjectRow[]> {
  const db = getDb();
  return db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(projects.createdAt);
}

export async function getOwnedProject(
  projectId: string,
  userId: string,
): Promise<ProjectRow | undefined> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);
  return row;
}

export async function assertProjectOwned(
  projectId: string,
  userId: string,
): Promise<void> {
  const row = await getOwnedProject(projectId, userId);
  if (!row) {
    throw new ProjectNotFoundError();
  }
}

export async function insertUserProject(input: {
  userId: string;
  name: string;
}): Promise<ProjectRow> {
  const db = getDb();
  const existing = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.userId, input.userId), eq(projects.name, input.name)))
    .limit(1);

  if (existing.length > 0) {
    throw new DuplicateProjectError();
  }

  const [row] = await db
    .insert(projects)
    .values({ userId: input.userId, name: input.name })
    .returning();

  if (!row) {
    throw new Error("Failed to create project.");
  }

  return row;
}

export async function ensureDefaultProject(userId: string): Promise<ProjectRow> {
  const existing = await listUserProjects(userId);
  if (existing[0]) {
    return existing[0];
  }
  return insertUserProject({ userId, name: DEFAULT_PROJECT_NAME });
}
