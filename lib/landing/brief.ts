import { z } from "zod";

export const LandingBriefSchema = z.object({
  brandName: z.string().trim().max(80).optional(),
  offer: z.string().trim().max(160).optional(),
  contactEmail: z
    .string()
    .trim()
    .max(120)
    .optional()
    .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "Enter a valid email"),
  contactPhone: z.string().trim().max(40).optional(),
  contactAddress: z.string().trim().max(160).optional(),
});
export type LandingBrief = z.infer<typeof LandingBriefSchema>;

const BLOCK = /\[LANDING_BRIEF\]([\s\S]*?)\[\/LANDING_BRIEF\]/;

function clean(value?: string): string | undefined {
  const next = value?.trim();
  return next ? next : undefined;
}

function extractEmail(text: string): string | undefined {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
}

function extractPhone(text: string): string | undefined {
  const match = text.match(/(?:\+?\d[\d\s()-]{8,}\d)/);
  return match?.[0]?.replace(/\s+/g, " ").trim();
}

export function decodeLandingBrief(prompt: string): {
  brief: LandingBrief;
  userPrompt: string;
} {
  const block = prompt.match(BLOCK);
  const userPrompt = prompt.replace(BLOCK, "").trim();
  const brief: LandingBrief = {};

  if (block?.[1]) {
    for (const line of block[1].split("\n")) {
      const [key, ...rest] = line.split(":");
      const value = rest.join(":").trim();
      if (!key || !value) {
        continue;
      }
      const name = key.trim();
      if (name === "brand") {
        brief.brandName = value;
      }
      if (name === "offer") {
        brief.offer = value;
      }
      if (name === "email") {
        brief.contactEmail = value;
      }
      if (name === "phone") {
        brief.contactPhone = value;
      }
      if (name === "address") {
        brief.contactAddress = value;
      }
    }
  }

  brief.contactEmail = clean(brief.contactEmail) ?? extractEmail(userPrompt);
  brief.contactPhone = clean(brief.contactPhone) ?? extractPhone(userPrompt);
  brief.contactAddress = clean(brief.contactAddress);
  brief.brandName = clean(brief.brandName);
  brief.offer = clean(brief.offer);

  return { brief, userPrompt };
}

export function encodeLandingBrief(
  brief: LandingBrief | undefined,
  userPrompt: string,
): string {
  if (!brief) {
    return userPrompt;
  }

  const lines = [
    clean(brief.brandName) ? `brand: ${clean(brief.brandName)}` : "",
    clean(brief.offer) ? `offer: ${clean(brief.offer)}` : "",
    clean(brief.contactEmail) ? `email: ${clean(brief.contactEmail)}` : "",
    clean(brief.contactPhone) ? `phone: ${clean(brief.contactPhone)}` : "",
    clean(brief.contactAddress) ? `address: ${clean(brief.contactAddress)}` : "",
  ].filter(Boolean);

  if (lines.length === 0) {
    return userPrompt;
  }

  return `[LANDING_BRIEF]\n${lines.join("\n")}\n[/LANDING_BRIEF]\n${userPrompt}`;
}

export function landingRequestPrompt(prompt: string): string {
  const { brief, userPrompt } = decodeLandingBrief(prompt);
  return [
    `User request: ${userPrompt || prompt}`,
    brief.brandName ? `Brand name: ${brief.brandName}` : "",
    brief.offer ? `Offer: ${brief.offer}` : "",
    brief.contactEmail ? `Contact email: ${brief.contactEmail}` : "",
    brief.contactPhone ? `Contact phone: ${brief.contactPhone}` : "",
    brief.contactAddress ? `Contact address: ${brief.contactAddress}` : "",
    "Write every field for THIS request only. Do not switch topics or invent another business.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function hasContactDetails(input: {
  contactEmail?: string;
  contactPhone?: string;
  contactAddress?: string;
}): boolean {
  return Boolean(input.contactEmail || input.contactPhone || input.contactAddress);
}
