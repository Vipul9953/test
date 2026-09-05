import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { DEFAULT_PROJECT_NAME } from "@/lib/constants";
import type { AuthInput } from "@/lib/validations/auth";
import { ensureCreditAccount } from "@/repositories/credits";
import { ensureDefaultProject, insertUserProject } from "@/repositories/projects";
import { findUserByName, insertUser } from "@/repositories/users";
import { InvalidCredentialsError } from "@/services/errors";

export async function signInOrRegister(input: AuthInput): Promise<{
  userId: string;
  name: string;
  created: boolean;
}> {
  const existing = await findUserByName(input.name);

  if (existing) {
    if (!verifyPassword(input.password, existing.passwordHash)) {
      throw new InvalidCredentialsError();
    }
    await ensureCreditAccount(existing.id);
    await ensureDefaultProject(existing.id);
    return { userId: existing.id, name: existing.name, created: false };
  }

  const user = await insertUser({
    name: input.name,
    passwordHash: hashPassword(input.password),
  });

  await ensureCreditAccount(user.id);
  await insertUserProject({ userId: user.id, name: DEFAULT_PROJECT_NAME });

  return { userId: user.id, name: user.name, created: true };
}
