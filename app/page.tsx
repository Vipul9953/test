import { StudioShell } from "@/components/studio/studio-shell";
import { getOptionalSession } from "@/lib/auth/require-operator";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initialUser = await getOptionalSession();
  return <StudioShell initialUser={initialUser} />;
}
