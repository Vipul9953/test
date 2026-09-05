import { describe, expect, it } from "vitest";
import {
  applyEmailBrief,
  decodeEmailBrief,
  encodeEmailBrief,
} from "@/lib/email/brief";

describe("email brief", () => {
  it("encodes only filled fields", () => {
    const stored = encodeEmailBrief(
      { ctaUrl: "https://shop.example/sale" },
      "30% off summer email",
    );
    expect(stored).toContain("[EMAIL_BRIEF]");
    expect(stored).toContain("url: https://shop.example/sale");
    expect(decodeEmailBrief(stored).userPrompt).toBe("30% off summer email");
  });

  it("keeps the user CTA url on the streamed object", () => {
    const prompt = encodeEmailBrief(
      { ctaUrl: "https://shop.example/sale" },
      "sale email",
    );
    const page = applyEmailBrief(
      {
        headline: "Summer is here",
        body: "Take 30% off.",
        ctaLabel: "Learn more",
        ctaUrl: "/offer",
      },
      prompt,
    );
    expect(page.ctaUrl).toBe("https://shop.example/sale");
    expect(page.ctaLabel).toBe("Learn more");
  });

  it("drops a model CTA when the user did not supply a url", () => {
    const email = applyEmailBrief(
      {
        headline: "Medical leave",
        body: "Hi HR,\n\nI need two days off.",
        ctaLabel: "Submit Request",
        ctaUrl: "/request-leave",
      },
      "medical leave email",
    );

    expect(email.ctaUrl).toBe("");
    expect(email.ctaLabel).toBe("");
  });

  it("defaults email tone to professional", () => {
    expect(decodeEmailBrief("sick leave email").brief.tone).toBe(
      "professional",
    );
  });

  it("cleans escaped lines and subject labels from final copy", () => {
    const email = applyEmailBrief(
      {
        headline: "Subject: Sick leave made simpler",
        body: "Hi there,\\n\\nSubmit your request in a few steps.\\n\\nBest,\\nIQSetters",
        ctaLabel: "**Submit request**",
        ctaUrl: "/request",
      },
      "email for IQSetters",
    );

    expect(email.headline).toBe("Sick leave made simpler");
    expect(email.body).toContain("Hi there,\n\nSubmit");
    expect(email.ctaLabel).toBe("");
    expect(email.ctaUrl).toBe("");
  });

  it("personalizes greeting and appends supplied contact details", () => {
    const prompt = encodeEmailBrief(
      {
        senderName: "Raj",
        recipientName: "Vipul",
        recipientEmail: "vipul@example.com",
        contactPhone: "+91 90000 00000",
      },
      "sick leave email",
    );
    const email = applyEmailBrief(
      {
        headline: "A simpler leave request",
        body: "Hi there,\n\nYour request only takes a minute.",
        ctaLabel: "Submit request",
        ctaUrl: "/leave",
      },
      prompt,
    );

    expect(email.body).toContain("Hi Vipul,");
    expect(email.body).toContain("Raj");
    expect(email.body).toContain("+91 90000 00000");
  });

  it("replaces a generated signature instead of duplicating it", () => {
    const prompt = encodeEmailBrief(
      { senderName: "Vipul", contactPhone: "7303374944" },
      "medical leave request",
    );
    const email = applyEmailBrief(
      {
        headline: "Medical leave request",
        body: "Hi HR,\n\nI need two days of medical leave.\n\nSincerely,\nVipul\n7303374944",
        ctaLabel: "Submit request",
        ctaUrl: "/submit",
      },
      prompt,
    );

    expect(email.body.match(/Vipul/g)).toHaveLength(1);
    expect(email.body.match(/7303374944/g)).toHaveLength(1);
    expect(email.body).not.toContain("Sincerely");
    expect(email.body.match(/^Best,/gm)).toHaveLength(1);
  });

  it("keeps a single Best even when the model already signed off twice", () => {
    const email = applyEmailBrief(
      {
        headline: "Take the rest you need",
        body: "Hi there,\n\nLet’s give your team breathing room.\n\nBest,\n\nBest,",
        ctaLabel: "Explore",
        ctaUrl: "/leave",
      },
      "leave platform email",
    );

    expect(email.body.match(/^Best,/gm)).toHaveLength(1);
    expect(email.body).not.toMatch(/Best,\s*\n\s*Best,/);
  });

  it("does not duplicate Best when applied twice", () => {
    const prompt = encodeEmailBrief(
      { senderName: "Vipul", contactPhone: "07303374944" },
      "leave email",
    );
    const once = applyEmailBrief(
      {
        headline: "Leave made simple",
        body: "Hi there,\n\nApprovals happen fast.\n\nBest,",
        ctaLabel: "",
        ctaUrl: "",
      },
      prompt,
    );
    const twice = applyEmailBrief(once, prompt);

    expect(twice.body.match(/^Best,/gm)).toHaveLength(1);
    expect(twice.body.match(/Vipul/g)).toHaveLength(1);
  });

  it("treats an email typed in the name field as To, not a greeting", () => {
    const prompt = encodeEmailBrief(
      { recipientName: "vipul@example.com" },
      "sick leave email",
    );
    expect(prompt).toContain("to: vipul@example.com");
    expect(prompt).not.toContain("recipient:");
    expect(decodeEmailBrief(prompt).brief.recipientEmail).toBe(
      "vipul@example.com",
    );

    const email = applyEmailBrief(
      {
        headline: "Medical leave",
        body: "Hi vipul@example.com,\n\nPlease approve two days.\n\nBest,\nvipul@example.com\nvipul@example.com",
        ctaLabel: "Submit",
        ctaUrl: "/leave",
      },
      prompt,
    );

    expect(email.body).toMatch(/^Hi there,/);
    expect(email.body).not.toContain("vipul@example.com");
  });

  it("strips a leftover Submit Request path from the body", () => {
    const email = applyEmailBrief(
      {
        headline: "Medical leave",
        body: "Hi HR,\n\nI need two days off.\n\nBest,\nVipul\n\nSubmit Request: /request-leave",
        ctaLabel: "Submit Request",
        ctaUrl: "/request-leave",
      },
      "medical leave email",
    );

    expect(email.body).not.toMatch(/submit request/i);
    expect(email.body).not.toContain("/request-leave");
    expect(email.body).toContain("Hi HR,");
  });

  it("still reads the older email: brief key", () => {
    const stored =
      "[EMAIL_BRIEF]\nemail: hr@example.com\n[/EMAIL_BRIEF]\nleave note";
    expect(decodeEmailBrief(stored).brief.recipientEmail).toBe("hr@example.com");
  });
});
