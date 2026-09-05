import { LandingFullPage } from "@/components/studio/landing-full-page";
import { getOptionalSession } from "@/lib/auth/require-operator";
import { loadLandingPreview } from "@/lib/landing/load-preview";

export default async function LandingRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const session = await getOptionalSession();
  const initial = session
    ? await loadLandingPreview(runId, session.userId)
    : null;

  return <LandingFullPage runId={runId} initial={initial} />;
}
