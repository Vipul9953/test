import type { CreativeKind } from "@/lib/types/creative";

export const IMAGE_HINT =
  /\b(image|photo|picture|pic|poster|illustration|draw|render|shot|tasveer|tasvir)\b/i;
export const LANDING_HINT =
  /\b(landing\s*page|website|web\s*page|waitlist|hero section|saas page|marketing page|shop page|वेबसाइट)\b/i;
export const EMAIL_HINT =
  /\b(e[\s-]?mails?|emails?|newsletter|inbox|subject[\s-]?line|promo mail|mails?|emali|emial|emaill)\b|ईमेल|इमेल/i;
export const CREATE_VERB =
  /\b(make|create|build|write|compose|draft|send|banao?|banado|likho|likh|bhejo|bhejna)\b|बना\s*दो|बनाओ|लिखो/i;

export function normalizeKindPrompt(prompt: string): string {
  return prompt
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\b(emali|emial|emaill)\b/g, "email")
    .replace(/\be[\s-]+mail\b/g, "email");
}

function looksLikeKind(prompt: string, kind: CreativeKind): boolean {
  const text = normalizeKindPrompt(prompt);
  if (kind === "image") {
    return IMAGE_HINT.test(text);
  }
  if (kind === "landing-page") {
    return LANDING_HINT.test(text);
  }
  return EMAIL_HINT.test(text);
}

/** Turn a short subject into a full generation prompt for the chosen template. */
export function expandPromptForKind(prompt: string, kind: CreativeKind): string {
  const text = prompt.trim().replace(/\s+/g, " ");
  if (!text) {
    return text;
  }

  if (looksLikeKind(text, kind)) {
    return text;
  }

  if (kind === "image") {
    return `Create a high-quality image of ${text}.`;
  }

  if (kind === "landing-page") {
    return `Create a marketing landing page about ${text}. Stay only on ${text}.`;
  }

  return `Write a short promotional email about ${text}.`;
}
