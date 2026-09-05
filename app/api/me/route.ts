import { requireOperator } from "@/lib/auth/require-operator";
import { jsonError } from "@/lib/http/api-error";
import { SessionUserSchema } from "@/lib/validations/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const operator = await requireOperator();
    return Response.json(
      SessionUserSchema.parse({
        userId: operator.userId,
        name: operator.name,
      }),
    );
  } catch (error) {
    return jsonError(error);
  }
}
