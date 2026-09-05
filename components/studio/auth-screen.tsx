"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { enterStudio } from "@/app/actions/auth";
import { AuthInputSchema, type AuthInput } from "@/lib/validations/auth";

export function AuthScreen({ onEntered }: { onEntered: () => void }) {
  const form = useForm<AuthInput>({
    resolver: zodResolver(AuthInputSchema),
    defaultValues: { name: "", password: "" },
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[radial-gradient(circle_at_top,_#fafafa,_#f4f4f5)] px-4 dark:bg-[radial-gradient(circle_at_top,_#18181b,_#09090b)]">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">
          Skala
        </p>
        <h1 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Enter studio
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Name + password. New name creates an account with 100 credits and
          project1. Existing name logs you in.
        </p>

        <form
          className="mt-6 space-y-3"
          onSubmit={form.handleSubmit(async (values) => {
            const result = await enterStudio(values);
            if (!result.ok) {
              form.setError("password", { message: result.message });
              return;
            }
            onEntered();
          })}
        >
          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-zinc-400">
              Name
            </span>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800"
              autoComplete="username"
              {...form.register("name")}
            />
            <p className="mt-1 text-[11px] text-red-500">
              {form.formState.errors.name?.message}
            </p>
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-wide text-zinc-400">
              Password
            </span>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800"
              autoComplete="current-password"
              {...form.register("password")}
            />
            <p className="mt-1 text-[11px] text-red-500">
              {form.formState.errors.password?.message}
            </p>
          </label>

          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="w-full rounded-full bg-zinc-900 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {form.formState.isSubmitting ? "Entering…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
