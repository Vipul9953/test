import { z } from "zod";
import { decodeLandingBrief } from "@/lib/landing/brief";
import type { CopyContent } from "@/lib/validations/artifact";

export const EmailToneSchema = z.enum(["casual", "professional"]);
export const EmailBriefSchema = z.object({
  senderName: z.string().trim().max(80).optional(),
  recipientName: z.string().trim().max(80).optional(),
  recipientEmail: z
    .string()
    .trim()
    .max(120)
    .optional()
    .refine(
      (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Enter a valid recipient email",
    ),
  contactPhone: z.string().trim().max(40).optional(),
  ctaUrl: z
    .string()
    .trim()
    .max(300)
    .optional()
    .refine(
      (value) =>
        !value ||
        value.startsWith("/") ||
        /^https?:\/\//i.test(value),
      "Use https://… or a path like /sale",
    ),
  tone: EmailToneSchema.default("professional"),
});
export type EmailBrief = z.input<typeof EmailBriefSchema>;

const BLOCK = /\[EMAIL_BRIEF\]([\s\S]*?)\[\/EMAIL_BRIEF\]/;

function clean(value?: string): string | undefined {
  const next = value?.trim();
  return next ? next : undefined;
}

export function decodeEmailBrief(prompt: string): {
  brief: EmailBrief;
  userPrompt: string;
} {
  const block = prompt.match(BLOCK);
  const userPrompt = prompt.replace(BLOCK, "").trim();
  const brief: EmailBrief = { tone: "professional" };

  if (block?.[1]) {
    for (const line of block[1].split("\n")) {
      const [key, ...rest] = line.split(":");
      const value = rest.join(":").trim();
      if (!key || !value) {
        continue;
      }
      const name = key.trim();
      if (name === "sender") {
        brief.senderName = value;
      }
      if (name === "recipient") {
        brief.recipientName = value;
      }
      if (name === "email" || name === "to") {
        brief.recipientEmail = value;
      }
      if (name === "phone") {
        brief.contactPhone = value;
      }
      if (name === "url") {
        brief.ctaUrl = value;
      }
      if (name === "tone" && (value === "casual" || value === "professional")) {
        brief.tone = value;
      }
    }
  }

  brief.senderName = clean(brief.senderName);
  brief.recipientName = clean(brief.recipientName);
  brief.recipientEmail = clean(brief.recipientEmail);
  brief.contactPhone = clean(brief.contactPhone);
  brief.ctaUrl = clean(brief.ctaUrl);

  return { brief: normalizePeople(brief), userPrompt };
}

function looksLikeEmail(value?: string): boolean {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

function normalizePeople(brief: EmailBrief): EmailBrief {
  const next = { ...brief };
  if (looksLikeEmail(next.recipientName) && !next.recipientEmail) {
    next.recipientEmail = next.recipientName;
    next.recipientName = undefined;
  }
  if (looksLikeEmail(next.recipientName) && next.recipientEmail) {
    next.recipientName = undefined;
  }
  return next;
}

export function encodeEmailBrief(
  brief: EmailBrief | undefined,
  userPrompt: string,
): string {
  if (!brief) {
    return userPrompt;
  }

  const people = normalizePeople({
    ...brief,
    senderName: clean(brief.senderName),
    recipientName: clean(brief.recipientName),
    recipientEmail: clean(brief.recipientEmail),
    contactPhone: clean(brief.contactPhone),
    ctaUrl: clean(brief.ctaUrl),
  });

  const lines = [
    people.senderName ? `sender: ${people.senderName}` : "",
    people.recipientName ? `recipient: ${people.recipientName}` : "",
    people.recipientEmail ? `to: ${people.recipientEmail}` : "",
    people.contactPhone ? `phone: ${people.contactPhone}` : "",
    people.ctaUrl ? `url: ${people.ctaUrl}` : "",
    people.tone ? `tone: ${people.tone}` : "",
  ].filter(Boolean);

  if (lines.length === 0) {
    return userPrompt;
  }

  return `[EMAIL_BRIEF]\n${lines.join("\n")}\n[/EMAIL_BRIEF]\n${userPrompt}`;
}

export function displayCreativePrompt(prompt: string): string {
  const direction = prompt.match(/Direction:\s*([\s\S]+)$/i)?.[1]?.trim();
  const source = direction || prompt;
  return decodeEmailBrief(decodeLandingBrief(source).userPrompt).userPrompt;
}

export function resolveEmailCta(
  prompt: string,
  fallback?: { ctaLabel?: string; ctaUrl?: string },
): { ctaLabel?: string; ctaUrl?: string } {
  const url = decodeEmailBrief(prompt).brief.ctaUrl?.trim();
  if (!url) {
    return {};
  }

  const label = fallback?.ctaLabel?.trim() || "Open link";
  return { ctaLabel: label, ctaUrl: url };
}

export function mergeEmailPartial(
  partial: Partial<CopyContent>,
  prompt: string,
): Partial<CopyContent> {
  const cta = resolveEmailCta(prompt, {
    ctaLabel: partial.ctaLabel,
    ctaUrl: partial.ctaUrl,
  });
  return {
    ...partial,
    ctaLabel: cta.ctaLabel,
    ctaUrl: cta.ctaUrl,
  };
}

export function applyEmailBrief(content: CopyContent, prompt: string): CopyContent {
  const { brief } = decodeEmailBrief(prompt);
  const people = normalizePeople(brief);
  const cta = resolveEmailCta(prompt, content);
  let body = stripCtaDump(stripEmailsFromBody(cleanEmailBody(content.body)));

  if (people.recipientName) {
    body = body.replace(
      /^(hi there|hello|hi)(\s+[^,\n]+)?,/i,
      `Hi ${people.recipientName},`,
    );
  } else {
    body = body.replace(/^(hi|hello)\s+\S+@\S+\s*,/i, "Hi there,");
  }

  body = stripTrailingSignOff(stripCtaDump(stripEmailsFromBody(body)));
  body = attachSignature(body, people);

  return {
    headline: cleanEmailText(content.headline, 90).replace(/^subject:\s*/i, ""),
    body,
    ctaLabel: cta.ctaLabel ? cleanEmailText(cta.ctaLabel, 40) : "",
    ctaUrl: cta.ctaUrl ?? "",
  };
}

function cleanEmailText(value: string, max: number): string {
  return value
    .replace(/\\n/g, " ")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cleanEmailBody(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\r\n?/g, "\n")
    .replace(/\*\*/g, "")
    .replace(/^subject:\s*.*\n?/i, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function stripEmailsFromBody(value: string): string {
  return value
    .replace(/^[^\s@]+@[^\s@]+\.[^\s@]+\s*$/gm, "")
    .replace(/^(hi|hello)\s+[^\s@]+@[^\s@]+\.[^\s@]+\s*,/i, "Hi there,")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripTrailingSignOff(value: string): string {
  return value
    .replace(
      /(?:\r?\n[ \t]*)+(?:best(?:[ \t]+regards)?|sincerely|kind regards|warm regards|regards),?[ \t]*(?:\r?\n[\s\S]*)?$/i,
      "",
    )
    .replace(
      /(?:best(?:[ \t]+regards)?|sincerely|kind regards|warm regards|regards),?[ \t]*$/i,
      "",
    )
    .replace(/(?:\n[ \t]*Best,[ \t]*){2,}/gi, "\nBest,")
    .trim();
}

function attachSignature(body: string, people: EmailBrief): string {
  const lines = ["Best,", people.senderName, people.contactPhone].filter(Boolean);
  return `${body}\n\n${lines.join("\n")}`;
}

function stripCtaDump(value: string): string {
  return value
    .replace(
      /\n+(?:submit(?:\s+\w+){0,4}|learn more|see more|shop now|get started)[:\s]+(?:\/\S+|https?:\/\/\S+)\s*$/i,
      "",
    )
    .replace(/\n+[A-Za-z][^:\n]{0,40}:\s*\/[\w/-]+\s*$/g, "")
    .trim();
}
