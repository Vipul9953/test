import { generateObject, streamObject } from "ai";
import { applyEmailBrief, mergeEmailPartial } from "@/lib/email/brief";
import { renderModel } from "@/lib/ai/groq";
import { landingRequestPrompt } from "@/lib/landing/brief";
import { normalizeLandingPage } from "@/lib/landing/normalize";
import type {
  CopyContent,
  CreativeKind,
  LandingPageContent,
} from "@/lib/types/creative";
import {
  CopyContentSchema,
  LandingExtrasSchema,
  LandingPageGenerateSchema,
  type PartialLandingPageContent,
} from "@/lib/validations/artifact";
import { RenderAbortedError } from "@/services/errors";

export type CopyPartialHandler = (
  partial: Partial<CopyContent> | PartialLandingPageContent,
) => void;

const EMAIL_SYSTEM = `You are an experienced lifecycle copywriter. Write one polished, human email using only the user's subject and facts. Never mention AI.

First infer the likely reader, purpose, and single action from the prompt. Do not expose that reasoning.

headline:
- A natural subject line of 4-8 words.
- Specific and useful, not clickbait. No markdown or "Subject:" prefix.

body:
- 80-140 words with natural paragraph breaks.
- Open with "Hi there," unless the prompt supplies a recipient name.
- Lead with the reader's situation or desired outcome, not the product name.
- Explain the concrete benefit in plain language, then make the next step clear.
- Sound like a thoughtful person, not a brochure or HR policy document.
- End the body before any sign-off. Write Best, at most once. Never repeat Best, Sincerely, or Regards.
- No bullets, markdown, fake claims, repeated ideas, corporate filler, or phrases such as "seamless and compliant", "thank you for choosing", "all-in-one solution", and "stay productive".

ctaLabel:
- A clear 2-4 word action that matches the email.

ctaUrl:
- Use the exact url in [EMAIL_BRIEF] when present.
- If no url is in [EMAIL_BRIEF], return an empty string. Do not invent /paths.

Tone defaults to warm professional. If [EMAIL_BRIEF] says casual, use friendly conversational language; if professional, stay warm, concise, and credible.`;
const EMAIL_BRIEF_RULES = `
When [EMAIL_BRIEF] is present:
- recipient is the person's name; address the greeting to them.
- sender is the writer's name; use it in the sign-off.
- phone is the sender's contact number; include it below the sign-off.
- to / email is only the delivery address. Never print it in the greeting, sign-off, or body.
- If recipient name is missing, greet with "Hi there," — never the email address.
- Do not invent any missing personal detail.`;

const LANDING_SYSTEM = `Write a complete landing page from the user request only. Never mention AI.

Stay on that subject. If they asked for pizza, every field is about pizza. If they asked for shoes, every field is about shoes. Do not invent a different business.

headline: one short line, max 10 words, about the request.
body: one or two plain sentences about the request. No markdown. No lists. Do not write Offer, Features, How it works, or Closing CTA in the body.
ctaLabel: 2-4 words that match the request.
ctaUrl: a relative path starting with /.
brandName: 1-3 words from the request.
eyebrow: 2-5 words.
problemTitle and problemBody: always fill. Name the real pain for THIS request in one short title and one sentence.
productHeading: one line, different from the headline.
features: exactly 3 benefits of the user's subject. If they asked for online coaching, write coaching benefits (sessions, plan, progress). Never write website, template, SEO, page metrics, or generic SaaS features unless the user asked for that.
steps: exactly 3. title is a few words. description is one short sentence about THIS subject.
closingHeadline: different from the headline. closingBody: one sentence. Always fill both.
heroPhotoQuery, storePhotoQuery, customerPhotoQuery, featurePhotoQueries: English search terms for THIS subject only.

Do not invent contact details, customer counts, reviews, or testimonials. Leave those empty.
Do not repeat the same sentence in two fields.`;

const LANDING_EXTRAS_SYSTEM = `Fill the missing landing-page sections for the same user request. Stay on that subject. Never mention AI.

features: exactly 3, about this request only.
steps: exactly 3, about this request only.
productHeading, closingHeadline, closingBody, photo queries: English, same subject.
Do not invent contact details or testimonials.`;

function isAbort(signal: AbortSignal, error: unknown): boolean {
  return (
    signal.aborted ||
    (error instanceof Error && error.name === "AbortError")
  );
}

async function consumeObjectStream<T>(input: {
  abortSignal: AbortSignal;
  onPartial: (partial: T) => void;
  partialObjectStream: AsyncIterable<T>;
  object: PromiseLike<T>;
}): Promise<T> {
  if (input.abortSignal.aborted) {
    throw new RenderAbortedError();
  }

  let last = undefined as T | undefined;

  try {
    for await (const partial of input.partialObjectStream) {
      if (input.abortSignal.aborted) {
        throw new RenderAbortedError();
      }
      last = partial;
      input.onPartial(partial);
    }

    return await input.object;
  } catch (error) {
    if (isAbort(input.abortSignal, error)) {
      throw new RenderAbortedError();
    }
    if (last !== undefined) {
      return last;
    }
    throw error;
  }
}

function landingCore(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function landingNeedsExtras(raw: unknown): boolean {
  const data = landingCore(raw);
  const features = Array.isArray(data.features) ? data.features.length : 0;
  const steps = Array.isArray(data.steps) ? data.steps.length : 0;
  return (
    features < 3 ||
    steps < 3 ||
    !String(data.problemTitle ?? "").trim() ||
    !String(data.closingHeadline ?? "").trim()
  );
}

async function enrichLanding(
  core: unknown,
  prompt: string,
  abortSignal: AbortSignal,
  onPartial: CopyPartialHandler,
): Promise<LandingPageContent> {
  const request = landingRequestPrompt(prompt);
  let extras = {};
  if (landingNeedsExtras(core)) {
    try {
      const generated = await generateObject({
        model: renderModel(),
        schema: LandingExtrasSchema,
        system: LANDING_EXTRAS_SYSTEM,
        prompt: `${request}\n\nHero already written:\n${JSON.stringify(core)}\n\nFill features, steps, problem, closing, and the rest for the same subject.`,
        abortSignal,
      });
      extras = generated.object;
    } catch (error) {
      if (isAbort(abortSignal, error)) {
        throw new RenderAbortedError();
      }
    }
  }

  const page = normalizeLandingPage({ ...landingCore(core), ...extras }, prompt);
  onPartial(page);
  return page;
}

export async function renderCopy(input: {
  kind: Exclude<CreativeKind, "image">;
  prompt: string;
  abortSignal: AbortSignal;
  onPartial: CopyPartialHandler;
}): Promise<CopyContent | LandingPageContent> {
  if (input.kind === "landing-page") {
    const request = landingRequestPrompt(input.prompt);
    const emitLanding = (partial: unknown) => {
      input.onPartial(normalizeLandingPage(partial, input.prompt));
    };

    try {
      const { partialObjectStream, object } = streamObject({
        model: renderModel(),
        schema: LandingPageGenerateSchema,
        system: LANDING_SYSTEM,
        prompt: request,
        abortSignal: input.abortSignal,
      });

      const final = await consumeObjectStream({
        abortSignal: input.abortSignal,
        onPartial: emitLanding,
        partialObjectStream,
        object,
      });

      return enrichLanding(final, input.prompt, input.abortSignal, input.onPartial);
    } catch (error) {
      if (isAbort(input.abortSignal, error)) {
        throw new RenderAbortedError();
      }

      try {
        const { object } = await generateObject({
          model: renderModel(),
          schema: LandingPageGenerateSchema,
          system: LANDING_SYSTEM,
          prompt: request,
          abortSignal: input.abortSignal,
        });
        emitLanding(object);
        return enrichLanding(object, input.prompt, input.abortSignal, input.onPartial);
      } catch (retryError) {
        if (isAbort(input.abortSignal, retryError)) {
          throw new RenderAbortedError();
        }
        return enrichLanding({}, input.prompt, input.abortSignal, input.onPartial);
      }
    }
  }

  const { partialObjectStream, object } = streamObject({
    model: renderModel(),
    schema: CopyContentSchema,
    system: `${EMAIL_SYSTEM}\n${EMAIL_BRIEF_RULES}`,
    prompt: input.prompt,
    abortSignal: input.abortSignal,
  });

  const final = await consumeObjectStream({
    abortSignal: input.abortSignal,
    onPartial: (partial) => input.onPartial(mergeEmailPartial(partial, input.prompt)),
    partialObjectStream,
    object,
  });

  return applyEmailBrief(
    CopyContentSchema.parse({
      headline: final.headline || "A note for you",
      body: final.body || "We have something new for you.",
      ctaLabel: final.ctaLabel || "See more",
      ctaUrl: final.ctaUrl || "/offer",
    }),
    input.prompt,
  );
}
