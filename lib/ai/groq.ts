import { createGroq } from "@ai-sdk/groq";

/** Groq models this key can actually call (llama-3.1-8b-instant is 404). */
export const GROQ_CHAT_MODEL = "openai/gpt-oss-20b" as const;

function groqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set. Add it to .env.local and restart next dev.");
  }

  return createGroq({ apiKey });
}

export function classifierModel() {
  return groqClient()(GROQ_CHAT_MODEL);
}

export function renderModel() {
  return groqClient()(GROQ_CHAT_MODEL);
}
