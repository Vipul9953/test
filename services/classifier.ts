import { generateObject } from "ai";
import { classifierModel } from "@/lib/ai/groq";
import {
  CLASSIFIER_MIN_CONFIDENCE,
  CLASSIFIER_MODEL,
} from "@/lib/constants";
import {
  CREATE_VERB,
  EMAIL_HINT,
  IMAGE_HINT,
  LANDING_HINT,
  normalizeKindPrompt,
} from "@/lib/prompt/expand";
import type { CreativeKind } from "@/lib/types/creative";
import { IntentSchema, type Intent, type ResolvedIntent } from "@/lib/validations/intent";
import { AmbiguousIntentError } from "@/services/errors";

export type GenerateIntent = (prompt: string) => Promise<Intent>;

export type ResolveIntentInput = {
  prompt: string;
  intent?: CreativeKind;
  parentKind?: CreativeKind;
};

export const PROMPT_UNCLEAR_MESSAGE =
  "This prompt is mixed or unclear. Write one clear request — for example a single picture of a cat and a dog, or a short sale email. Do not mix image and email in the same prompt.";

export const PROMPT_KIND_UNCLEAR_MESSAGE =
  "Auto cannot tell if this should be an image, landing page, or email. Add a word like photo, landing page, or email — or pick a type.";

export const PROMPT_SHORT_MESSAGE =
  "That prompt is too short. Add a bit more detail so we know what to make.";

export function rejectIfPromptJunk(prompt: string): void {
  const text = prompt.trim();
  if (text.length < 8) {
    throw new AmbiguousIntentError(PROMPT_SHORT_MESSAGE);
  }

  const normalized = normalizeKindPrompt(text);
  const chunk = normalized.slice(0, Math.min(40, Math.floor(normalized.length / 2)));
  if (chunk.length >= 16 && normalized.split(chunk).length >= 4) {
    throw new AmbiguousIntentError(PROMPT_UNCLEAR_MESSAGE);
  }

  const kindHits = [IMAGE_HINT, EMAIL_HINT, LANDING_HINT].filter((pattern) =>
    pattern.test(normalized),
  ).length;

  if (kindHits >= 2) {
    throw new AmbiguousIntentError(PROMPT_UNCLEAR_MESSAGE);
  }
}

/** Fast path so Auto does not need the model for obvious prompts. */
function guessKindFromPrompt(prompt: string): Intent | null {
  const text = normalizeKindPrompt(prompt);
  const landing = LANDING_HINT.test(text);
  const email = EMAIL_HINT.test(text);
  const image = IMAGE_HINT.test(text);
  const hits = [landing, email, image].filter(Boolean).length;
  if (hits >= 2) {
    return null;
  }
  if (email) {
    return { kind: "email", confidence: 0.93 };
  }
  if (landing) {
    return { kind: "landing-page", confidence: 0.93 };
  }
  if (image) {
    return { kind: "image", confidence: 0.93 };
  }

  const weak = new Set([
    "make",
    "create",
    "build",
    "write",
    "compose",
    "something",
    "nice",
    "please",
    "good",
    "cool",
    "wow",
    "a",
    "an",
    "the",
    "for",
    "me",
    "ek",
    "ek",
    "do",
    "bana",
    "banao",
    "likho",
    "likh",
    "bhejo",
  ]);
  const words = text.split(" ").filter(Boolean);
  if (CREATE_VERB.test(text)) {
    return null;
  }
  if (
    words.length > 0 &&
    words.length <= 4 &&
    words.some((word) => !weak.has(word))
  ) {
    return { kind: "image", confidence: 0.86 };
  }

  return null;
}

function hasKindHint(prompt: string): boolean {
  const text = normalizeKindPrompt(prompt);
  return IMAGE_HINT.test(text) || EMAIL_HINT.test(text) || LANDING_HINT.test(text);
}

export async function generateIntentFromModel(prompt: string): Promise<Intent> {
  const { object } = await generateObject({
    model: classifierModel(),
    schema: IntentSchema,
    system: `You classify a creative-generation prompt into exactly one kind: image, landing-page, or email. confidence is 0-1.

Rules:
- A short subject like "cat", "ice cream", "red shoes" is an image.
- Mentions of landing page, website, waitlist, or shop page → landing-page.
- Mentions of email, mail, newsletter, subject line, inbox, or Hindi/Hinglish like "ek email bana do", "mail likho", "ईमेल" → email.
- Never classify "email bana do" or "make an email" as an image.
- Mentions of photo, picture, poster, or image → image.
- Vague prompts like "make something nice" must score below 0.6.
- Prompts that mix image and email, or are garbled, must score below 0.6.`,
    prompt,
  });

  return IntentSchema.parse(object);
}

export async function resolveIntent(
  input: ResolveIntentInput,
  generateIntent: GenerateIntent = generateIntentFromModel,
): Promise<ResolvedIntent> {
  if (input.parentKind && !input.intent) {
    return {
      kind: input.parentKind,
      confidence: 1,
      source: "classified",
      model: CLASSIFIER_MODEL,
    };
  }

  if (input.intent) {
    return {
      kind: input.intent,
      confidence: 1,
      source: "explicit",
      model: CLASSIFIER_MODEL,
    };
  }

  rejectIfPromptJunk(input.prompt);

  const guessed = guessKindFromPrompt(input.prompt);
  if (
    !guessed &&
    !hasKindHint(input.prompt) &&
    CREATE_VERB.test(normalizeKindPrompt(input.prompt))
  ) {
    throw new AmbiguousIntentError(PROMPT_KIND_UNCLEAR_MESSAGE);
  }

  const classified = IntentSchema.parse(guessed ?? (await generateIntent(input.prompt)));

  if (classified.confidence < CLASSIFIER_MIN_CONFIDENCE) {
    throw new AmbiguousIntentError(PROMPT_UNCLEAR_MESSAGE);
  }

  return {
    ...classified,
    source: "classified",
    model: CLASSIFIER_MODEL,
  };
}
