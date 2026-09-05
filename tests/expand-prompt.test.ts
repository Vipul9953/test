import { describe, expect, it } from "vitest";
import { expandPromptForKind } from "@/lib/prompt/expand";

describe("expandPromptForKind", () => {
  it("turns a short subject into an image request", () => {
    expect(expandPromptForKind("cat", "image")).toBe(
      "Create a high-quality image of cat.",
    );
  });

  it("turns a short subject into a landing-page brief", () => {
    const next = expandPromptForKind("cat", "landing-page");
    expect(next).toContain("landing page about cat");
    expect(next).not.toMatch(/Offer|Features|Closing CTA/);
  });

  it("turns a short subject into an email brief", () => {
    const next = expandPromptForKind("cat", "email");
    expect(next).toContain("email about cat");
  });

  it("treats Hinglish email prompts as already naming email", () => {
    expect(expandPromptForKind("ek email bana do", "email")).toBe(
      "ek email bana do",
    );
  });

  it("keeps a prompt that already names the template", () => {
    const prompt = "landing page for ice cream";
    expect(expandPromptForKind(prompt, "landing-page")).toBe(prompt);
  });
});
