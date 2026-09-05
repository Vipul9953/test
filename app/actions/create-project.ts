"use server";

import { requireOperator } from "@/lib/auth/require-operator";
import { CreateProjectSchema } from "@/lib/validations/project";
import { insertUserProject } from "@/repositories/projects";
import { DuplicateProjectError } from "@/services/errors";

export async function createProject(raw: unknown) {
  const input = CreateProjectSchema.parse(raw);
  const operator = await requireOperator();

  try {
    const project = await insertUserProject({
      userId: operator.userId,
      name: input.name,
    });
    return {
      ok: true as const,
      project: {
        id: project.id,
        name: project.name,
        createdAt: project.createdAt.toISOString(),
      },
    };
  } catch (error) {
    if (error instanceof DuplicateProjectError) {
      return { ok: false as const, message: error.message };
    }
    throw error;
  }
}
