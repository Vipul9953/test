"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AuthScreen } from "@/components/studio/auth-screen";
import { meQueryKey } from "@/lib/query-keys";
import { SessionUserSchema, type SessionUser } from "@/lib/validations/auth";

async function fetchMe(): Promise<SessionUser | null> {
  const response = await fetch("/api/me", {
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error("Could not load session");
  }
  return SessionUserSchema.parse(await response.json());
}

export function AuthGate({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: SessionUser | null;
}) {
  const queryClient = useQueryClient();
  const me = useQuery({
    queryKey: meQueryKey,
    queryFn: fetchMe,
    initialData: initialUser,
    staleTime: 30_000,
    retry: false,
    refetchOnMount: false,
  });

  if (me.isError && initialUser === null && !me.data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-sm text-red-600">
        Could not reach the server. Is the database up?
      </div>
    );
  }

  if (!me.data) {
    return (
      <AuthScreen
        onEntered={() => {
          void queryClient.invalidateQueries({ queryKey: meQueryKey });
        }}
      />
    );
  }

  return children;
}
