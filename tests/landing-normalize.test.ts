import { describe, expect, it } from "vitest";
import { landingPhotoTags, topicFromPrompt } from "@/lib/landing/photo";
import { normalizeLandingPage } from "@/lib/landing/normalize";

describe("normalizeLandingPage", () => {
  it("strips outline junk from the hero body", () => {
    const page = normalizeLandingPage(
      {
        headline: "GrandStay Web",
        body: "Elevate your hotel. **Offer** All-in-one package. **Features** Mobile first. **How it works** Sign up.",
        features: [
          { title: "Responsive Design", description: "Responsive Design A site that looks stunning." },
        ],
      },
      "landing page for a hotel website",
    );
    expect(page.body.toLowerCase()).not.toMatch(/offer|features|how it works/);
    expect(page.body).toMatch(/Elevate your hotel/i);
    expect(page.features?.[0]?.description).not.toMatch(/^Responsive Design/i);
  });

  it("fills a vegetable shop page from a thin model object", () => {
    const page = normalizeLandingPage(
      {
        headline: "Fresh fruit for Vipul Bhai",
        features: [{ title: "Mangoes" }],
      },
      "make a vegetable shop landing page fresh fruits vipul bhai",
    );

    expect(page.headline).toContain("Vipul");
    expect((page.visualQuery ?? "").toLowerCase()).toMatch(/fruit|vegetable|vipul/);
    expect(page.ctaLabel.length).toBeGreaterThan(0);
    expect(page.features?.some((feature) => /mango|fruit|vegetable/i.test(feature.title))).toBe(
      true,
    );
    expect(page.steps?.length).toBe(3);
    expect(page.problemTitle).toBeTruthy();
    expect(page.problemBody).toBeTruthy();
    expect(page.productHeading).toBeTruthy();
    expect(page.closingHeadline).toBeTruthy();
    expect(page.closingBody).toBeTruthy();
    expect(page.steps?.[0]?.description.toLowerCase()).toMatch(
      /vegetable|fruit|vipul/,
    );
    expect(page.proofStat).toBeUndefined();
    expect(page.testimonial).toBeUndefined();
    expect(page.ctaUrl.startsWith("/")).toBe(true);
    expect(page.contactEmail).toBeUndefined();
    expect(page.contactPhone).toBeUndefined();
    expect(page.contactAddress).toBeUndefined();
  });

  it("drops invented proof and testimonials", () => {
    const page = normalizeLandingPage(
      {
        proofStat: "1k+",
        proofLabel: "customers this year",
        testimonial: "Loved it",
        testimonialAuthor: "A. Customer",
      },
      "landing page for a vegetable shop",
    );
    expect(page.proofStat).toBeUndefined();
    expect(page.testimonial).toBeUndefined();
    expect(page.testimonialAuthor).toBeUndefined();
  });

  it("does not keep invented model contact when the user never gave it", () => {
    const page = normalizeLandingPage(
      { contactEmail: "hello@fakeshop.com", contactPhone: "+91 98765 43210" },
      "landing page for a vegetable shop",
    );
    expect(page.contactEmail).toBeUndefined();
    expect(page.contactPhone).toBeUndefined();
    expect(page.ctaUrl).not.toMatch(/contact/i);
  });

  it("keeps contact only when the prompt includes it", () => {
    const page = normalizeLandingPage(
      {},
      "landing page for Green Cart email hello@greencart.in phone +91 90000 11111",
    );
    expect(page.contactEmail).toBe("hello@greencart.in");
    expect(page.contactPhone).toMatch(/90000/);
  });

  it("keeps contact from the landing brief block", () => {
    const page = normalizeLandingPage(
      {},
      "[LANDING_BRIEF]\nbrand: Green Cart\nemail: shop@greencart.in\n[/LANDING_BRIEF]\nvegetable shop",
    );
    expect(page.brandName).toBe("Green Cart");
    expect(page.contactEmail).toBe("shop@greencart.in");
  });

  it("does not inject fruit copy when the prompt is a shoe brand", () => {
    const page = normalizeLandingPage(
      { headline: "Stride sneakers" },
      "landing page for a premium shoes company",
    );

    expect(page.headline).toBe("Stride sneakers");
    expect(page.body.toLowerCase()).not.toMatch(/fruit|mango|vegetable/);
    expect((page.visualQuery ?? "").toLowerCase()).toMatch(/shoe/);
    expect((page.visualQuery ?? "").toLowerCase()).not.toMatch(/fruit/);
  });

  it("replaces generic website features with coaching copy", () => {
    const page = normalizeLandingPage(
      {
        headline: "Online coaching that sticks",
        features: [
          { title: "Personalized Guidance", description: "Optimize every element." },
          { title: "Hands-On Templates", description: "Use ready-made editable templates." },
          { title: "Performance Analysis", description: "Track page metrics." },
        ],
      },
      "online coaching landing page",
    );

    expect(page.features?.join(" ")).not.toMatch(/template|page metrics|performance analysis/i);
    expect(
      page.features?.some((feature) =>
        /coach/i.test(`${feature.title} ${feature.description}`),
      ),
    ).toBe(true);
  });

  it("takes the brand from the subject, not the expand wrapper", () => {
    const page = normalizeLandingPage(
      {},
      "Create a marketing landing page about ice cream. Stay only on ice cream.",
    );
    expect(page.brandName?.toLowerCase()).toContain("ice");
    expect(page.brandName?.toLowerCase()).not.toMatch(/create|marketing/);
    expect(page.body.toLowerCase()).toMatch(/ice cream/);
    expect(page.features?.length).toBe(3);
  });

  it("extracts vegetable words and drops landing-page chrome", () => {
    expect(topicFromPrompt("make a vegetable shop landing page fresh fruits")).toMatch(
      /vegetable|fruits/i,
    );
    expect(topicFromPrompt("make a vegetable shop landing page")).not.toMatch(/landing|page/i);
  });

  it("uses the latest pizza direction, not a vegetable parent", () => {
    const tags = landingPhotoTags({
      prompt:
        "Improve this landing-page. Original: vegetable shop. Direction: pizaa landing page",
      slot: "hero",
    }).join(" ");
    expect(tags).toMatch(/pizza|pizaa|pizzeria/i);
    expect(tags).not.toMatch(/vegetable|produce/i);
  });

  it("maps a vegetable prompt to produce photo tags", () => {
    const tags = landingPhotoTags({
      prompt: "make a vegetable shop landing page fresh fruits",
      slot: "hero",
    }).join(" ");
    expect(tags).toMatch(/vegetable|produce|fruit/i);
    expect(tags).not.toMatch(/dog|sneaker/i);
  });
});
