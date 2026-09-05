import { decodeEmailBrief, resolveEmailCta } from "@/lib/email/brief";
import { latestUserPrompt } from "@/lib/landing/photo";

export function emailFromName(prompt?: string): string {
  if (!prompt) {
    return "Your team";
  }

  const decoded = decodeEmailBrief(prompt);
  if (decoded.brief.senderName) {
    return decoded.brief.senderName;
  }

  const source = latestUserPrompt(prompt);
  const labelledBrand = source.match(
    /\b(?:for|from|by)\s+([A-Z][A-Za-z0-9&'-]*(?:\s+[A-Z][A-Za-z0-9&'-]*){0,2})/,
  )?.[1];
  if (labelledBrand) {
    return labelledBrand;
  }

  const distinctiveBrand = source.match(
    /\b[A-Z][A-Za-z0-9]*(?:[A-Z][A-Za-z0-9]*)+\b/,
  )?.[0];

  return distinctiveBrand ?? "Your team";
}

export function gmailComposeUrl(input: {
  headline?: string;
  body?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  prompt?: string;
}): string {
  const { brief } = decodeEmailBrief(input.prompt ?? "");
  const cta = resolveEmailCta(input.prompt ?? "", input);
  const body = [input.body?.trim() || "", formatCtaBlock(cta)]
    .join("\n")
    .trim();
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: brief.recipientEmail ?? "",
    su: input.headline?.trim() ?? "",
    body,
  });

  return `https://mail.google.com/mail/?${params.toString()}`;
}

export function emailCopyText(input: {
  headline?: string;
  body?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  prompt?: string;
}): string {
  const from = emailFromName(input.prompt);
  const { brief } = decodeEmailBrief(input.prompt ?? "");
  const cta = resolveEmailCta(input.prompt ?? "", input);
  return [
    `From: ${from}`,
    `To: ${brief.recipientEmail ?? ""}`,
    `Subject: ${input.headline?.trim() || ""}`,
    "",
    input.body?.trim() || "",
    formatCtaBlock(cta),
  ]
    .join("\n")
    .trim();
}

function formatCtaBlock(cta: { ctaLabel?: string; ctaUrl?: string }): string {
  if (!cta.ctaUrl) {
    return "";
  }
  return `\n${cta.ctaLabel || "Open link"}\n${cta.ctaUrl}`;
}
