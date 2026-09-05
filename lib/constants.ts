export const OPERATOR_COOKIE = "skala_user_id";

/** First project created on signup. */
export const DEFAULT_PROJECT_ID = "11111111-1111-4111-8111-111111111111";
export const DEFAULT_PROJECT_NAME = "project1";

export const CLASSIFIER_MIN_CONFIDENCE = 0.6;
export { GROQ_CHAT_MODEL as CLASSIFIER_MODEL, GROQ_CHAT_MODEL as RENDER_MODEL } from "@/lib/ai/groq";

export const INITIAL_CREDITS = 100;
export const SUBSCRIBE_MESSAGE = "Please subscribe";

export const IMAGE_RENDER_DELAY_MS = 20_000;
/** Heartbeat while the image delay runs so SSE is not silent. */
export const IMAGE_STREAM_TICK_MS = 1_000;

export const CREDIT_ESTIMATE = {
  image: 4,
  "landing-page": 10,
  email: 8,
} as const;

export const RUN_CANCELLED_MESSAGE = "Cancelled.";
export const RUN_DISCONNECTED_MESSAGE =
  "Client disconnected before the run finished.";

export function isCancelledRun(errorMessage?: string | null): boolean {
  return Boolean(errorMessage && /cancel/i.test(errorMessage));
}

export const USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
