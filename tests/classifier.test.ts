import { describe, expect, it, vi } from "vitest";
import { CLASSIFIER_MIN_CONFIDENCE, CLASSIFIER_MODEL } from "@/lib/constants";
import {
  PROMPT_KIND_UNCLEAR_MESSAGE,
  PROMPT_UNCLEAR_MESSAGE,
  rejectIfPromptJunk,
  resolveIntent,
  type GenerateIntent,
} from "@/services/classifier";
import { AmbiguousIntentError } from "@/services/errors";

describe("resolveIntent", () => {
  it("skips the model when an explicit intent is provided", async () => {
    const generateIntent = vi.fn<GenerateIntent>();

    const result = await resolveIntent(
      { prompt: "make something", intent: "email" },
      generateIntent,
    );

    expect(generateIntent).not.toHaveBeenCalled();
    expect(result).toEqual({
      kind: "email",
      confidence: 1,
      source: "explicit",
      model: CLASSIFIER_MODEL,
    });
  });

  it("uses the parent kind for a short improvise prompt without calling the model", async () => {
    const generateIntent = vi.fn<GenerateIntent>();

    const result = await resolveIntent(
      { prompt: "make better", parentKind: "image" },
      generateIntent,
    );

    expect(generateIntent).not.toHaveBeenCalled();
    expect(result.kind).toBe("image");
    expect(result.confidence).toBe(1);
  });

  it("returns a classified intent when confidence is at or above the floor", async () => {
    const generateIntent: GenerateIntent = async () => ({
      kind: "image",
      confidence: 0.91,
    });

    const result = await resolveIntent(
      { prompt: "a summer product display for the catalog launch" },
      generateIntent,
    );

    expect(result.source).toBe("classified");
    expect(result.kind).toBe("image");
    expect(result.confidence).toBe(0.91);
  });

  it("throws AmbiguousIntentError when confidence is below 0.6", async () => {
    const generateIntent: GenerateIntent = async () => ({
      kind: "email",
      confidence: 0.4,
    });

    await expect(
      resolveIntent({ prompt: "make something nice" }, generateIntent),
    ).rejects.toBeInstanceOf(AmbiguousIntentError);
  });

  it("rejects mixed image+email prompts before the model", () => {
    expect(() =>
      rejectIfPromptJunk(
        "make a best image for vat and dog and email and dog acat",
      ),
    ).toThrow(AmbiguousIntentError);
    expect(() =>
      rejectIfPromptJunk(
        "make a best image for vat and dog and email and dog acat",
      ),
    ).toThrow(PROMPT_UNCLEAR_MESSAGE);
  });

  it("treats confidence exactly at the floor as usable", async () => {
    const generateIntent: GenerateIntent = async () => ({
      kind: "landing-page",
      confidence: CLASSIFIER_MIN_CONFIDENCE,
    });

    const result = await resolveIntent(
      { prompt: "a product story for founders who want faster onboarding" },
      generateIntent,
    );

    expect(result.kind).toBe("landing-page");
    expect(result.source).toBe("classified");
  });

  it("rejects make + subject in Auto when no kind is named", async () => {
    const generateIntent = vi.fn<GenerateIntent>();
    await expect(
      resolveIntent({ prompt: "make kite" }, generateIntent),
    ).rejects.toBeInstanceOf(AmbiguousIntentError);
    await expect(
      resolveIntent({ prompt: "make kite" }, generateIntent),
    ).rejects.toThrow(PROMPT_KIND_UNCLEAR_MESSAGE);
    expect(generateIntent).not.toHaveBeenCalled();
  });

  it("guesses image for a short subject in Auto", async () => {
    const generateIntent = vi.fn<GenerateIntent>();
    const result = await resolveIntent({ prompt: "orange cat" }, generateIntent);
    expect(generateIntent).not.toHaveBeenCalled();
    expect(result.kind).toBe("image");
  });

  it("guesses landing-page when the prompt names that template", async () => {
    const generateIntent = vi.fn<GenerateIntent>();
    const result = await resolveIntent(
      { prompt: "landing page for ice cream" },
      generateIntent,
    );
    expect(generateIntent).not.toHaveBeenCalled();
    expect(result.kind).toBe("landing-page");
  });

  it.each([
    "ek email bana do",
    "ek emali bana do",
    "email likho",
    "mail bhejo sick leave",
    "e-mail for two day medical leave",
    "ईमेल बना दो",
  ])("guesses email in Auto for %s", async (prompt) => {
    const generateIntent = vi.fn<GenerateIntent>();
    const result = await resolveIntent({ prompt }, generateIntent);
    expect(generateIntent).not.toHaveBeenCalled();
    expect(result.kind).toBe("email");
  });
});
