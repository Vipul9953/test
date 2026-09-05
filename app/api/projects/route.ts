import { requireOperator } from "@/lib/auth/require-operator";
import { jsonError } from "@/lib/http/api-error";
import { ProjectListSchema } from "@/lib/validations/project";
import { ensureDefaultProject, listUserProjects } from "@/repositories/projects";

export const runtime = "nodejs";

export async function GET() {
  try {
    const operator = await requireOperator();
    await ensureDefaultProject(operator.userId);
    const rows = await listUserProjects(operator.userId);

    return Response.json(
      ProjectListSchema.parse({
        projects: rows.map((row) => ({
          id: row.id,
          name: row.name,
          createdAt: row.createdAt.toISOString(),
        })),
      }),
    );
  } catch (error) {
    return jsonError(error);
  }
}
