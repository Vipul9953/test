import { cookies } from "next/headers";
import { OPERATOR_COOKIE, USER_ID_PATTERN } from "@/lib/constants";
import { findUserById } from "@/repositories/users";
import { SessionUserSchema, type SessionUser } from "@/lib/validations/auth";
import { UnauthorizedError } from "@/services/errors";

export type Operator = {
  userId: string;
  name: string;
};

export async function requireOperator(): Promise<Operator> {
  const store = await cookies();
  const userId = store.get(OPERATOR_COOKIE)?.value;

  if (!userId || !USER_ID_PATTERN.test(userId)) {
    throw new UnauthorizedError();
  }

  const user = await findUserById(userId);
  if (!user) {
    throw new UnauthorizedError();
  }

  return { userId: user.id, name: user.name };
}

/** Cookie + DB lookup for the home page. Fail open to logged-out on errors. */
export async function getOptionalSession(): Promise<SessionUser | null> {
  try {
    const operator = await requireOperator();
    return SessionUserSchema.parse({
      userId: operator.userId,
      name: operator.name,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return null;
    }
    return null;
  }
}
