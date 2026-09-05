"use server";

import { cookies } from "next/headers";
import { OPERATOR_COOKIE } from "@/lib/constants";
import { AuthInputSchema } from "@/lib/validations/auth";
import { signInOrRegister } from "@/services/auth";
import { InvalidCredentialsError } from "@/services/errors";

export async function enterStudio(raw: unknown) {
  const input = AuthInputSchema.parse(raw);

  try {
    const session = await signInOrRegister(input);
    const store = await cookies();
    store.set(OPERATOR_COOKIE, session.userId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return { ok: true as const, created: session.created, name: session.name };
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return { ok: false as const, message: error.message };
    }
    throw error;
  }
}

export async function logoutStudio() {
  const store = await cookies();
  store.delete(OPERATOR_COOKIE);
}
