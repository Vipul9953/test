import { z } from "zod";

export const AuthInputSchema = z.object({
  name: z.string().trim().min(2).max(32),
  password: z.string().min(4).max(64),
});
export type AuthInput = z.infer<typeof AuthInputSchema>;

export const SessionUserSchema = z.object({
  userId: z.string().uuid(),
  name: z.string(),
});
export type SessionUser = z.infer<typeof SessionUserSchema>;
