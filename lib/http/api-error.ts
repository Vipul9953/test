import { ZodError } from "zod";
import {
  DuplicateProjectError,
  InvalidCredentialsError,
  ProjectNotFoundError,
  UnauthorizedError,
} from "@/services/errors";

export function jsonError(error: unknown): Response {
  if (error instanceof UnauthorizedError) {
    return Response.json({ error: error.code, message: error.message }, { status: 401 });
  }

  if (error instanceof InvalidCredentialsError) {
    return Response.json({ error: error.code, message: error.message }, { status: 401 });
  }

  if (error instanceof ProjectNotFoundError || error instanceof DuplicateProjectError) {
    return Response.json({ error: error.code, message: error.message }, { status: 400 });
  }

  if (error instanceof ZodError) {
    return Response.json(
      { error: "invalid_input", message: "Request did not match the expected schema." },
      { status: 400 },
    );
  }

  const message = error instanceof Error ? error.message : "Internal error";
  return Response.json({ error: "internal", message }, { status: 500 });
}
