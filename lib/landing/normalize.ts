import { decodeLandingBrief, hasContactDetails } from "@/lib/landing/brief";
import { queryFitsTopic, topicFromPrompt } from "@/lib/landing/photo";
import {
  LandingPageContentSchema,
  type LandingPageContent,
} from "@/lib/validations/artifact";

const SECTION_SPLIT =
  /\s*\*{0,2}\b(offer|features?|how it works|closing cta|steps?|benefits?)\b\*{0,2}\s*[:.\-–]?\s*/i;

function cleanProse(value: string, max = 220): string {
  const cut = value.split(SECTION_SPLIT)[0] ?? value;
  const next = cut
    .replace(/\*\*/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/^[•●▪◦*-]\s+/gm, "")
    .replace(/^\d+️⃣\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  if (next.length <= max) {
    return next;
  }
  const slice = next.slice(0, max);
  const stop = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("! "));
  return (stop > 80 ? slice.slice(0, stop + 1) : `${slice.trim()}…`).trim();
}

function text(value: unknown, fallback: string): string {
  const raw = typeof value === "string" && value.trim() ? value.trim() : fallback;
  return cleanProse(raw);
}

function optionalText(value: unknown, max = 160): string | undefined {
  const next = typeof value === "string" ? cleanProse(value, max) : "";
  return next || undefined;
}

function optionalUrl(value: unknown): string | undefined {
  const next = optionalText(value);
  return next && /^https?:\/\//i.test(next) ? next : undefined;
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const items = value
    .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    .map((item) => item.trim())
    .slice(0, 3);
  return items.length ? items : undefined;
}

function urlList(value: unknown): string[] | undefined {
  const items = stringList(value)?.filter((item) => /^https?:\/\//i.test(item));
  return items?.length ? items : undefined;
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 4)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function brandFromPrompt(prompt: string): string {
  const topic = topicFromPrompt(prompt);
  return titleCase(topic) || "Studio";
}

const GENERIC_FEATURE =
  /\b(template|templates|page metrics?|performance analysis|editable|cms|seo|responsive design|optimize every element)\b/i;

function topicFallbackFeatures(topic: string): Array<{ title: string; description: string }> {
  const name = titleCase(topic) || "this";
  if (/coach|coash|mentor|tutor/i.test(topic)) {
    return [
      {
        title: "1:1 coaching",
        description: `Personal sessions shaped around ${topic}.`,
      },
      {
        title: "A weekly plan",
        description: `Clear practice so ${topic} is easy to follow.`,
      },
      {
        title: "Progress checks",
        description: `See what improved after each ${topic} session.`,
      },
    ];
  }
  if (/pizza|pizzeria|ice cream|bakery|cafe|coffee|food|restaurant|shop|store|fruit|vegetable/i.test(topic)) {
    return [
      {
        title: `Fresh ${name}`,
        description: `What you see is what you get — ${topic} made for today.`,
      },
      {
        title: "Easy to start",
        description: `Pick what you want from ${topic} without a long menu of extras.`,
      },
      {
        title: "Made nearby",
        description: `A local feel for ${topic}, not a generic catalog.`,
      },
    ];
  }
  if (/shoe|sneaker|boot|fashion|cloth/i.test(topic)) {
    return [
      {
        title: "Fit first",
        description: `Pairs chosen for how ${topic} should feel, not just look.`,
      },
      {
        title: "Everyday wear",
        description: `Styles you can put on for work, travel, or a night out.`,
      },
      {
        title: "Clear details",
        description: `Materials and care, written in plain language.`,
      },
    ];
  }
  return [
    {
      title: `${name} help`,
      description: `Support built for ${topic}, not a generic website.`,
    },
    {
      title: `${name} plan`,
      description: `A simple way to start ${topic} this week.`,
    },
    {
      title: `${name} results`,
      description: `Know what changed after you try ${topic}.`,
    },
  ];
}

function topicFallbackSteps(topic: string): Array<{ title: string; description: string }> {
  return [
    { title: "Share the need", description: `Tell us what you want from ${topic}.` },
    { title: "See a clear fit", description: `We stay on ${topic} — nothing extra.` },
    { title: "Take the next step", description: `Start ${topic} when you are ready.` },
  ];
}

function topicFallbackProblem(topic: string): { title: string; body: string } {
  return {
    title: `Finding the right ${topic} is messy`,
    body: `Too many options, too little clarity. This page keeps ${topic} simple so you can decide without the noise.`,
  };
}

function topicFallbackClose(topic: string, shop: string): { title: string; body: string } {
  return {
    title: `Ready for ${shop}?`,
    body: `Say what you need. We stay on ${topic} and help you start.`,
  };
}

function items(
  value: unknown,
): Array<{ title: string; description: string }> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const row = item as { title?: unknown; description?: unknown };
      const title = cleanProse(typeof row.title === "string" ? row.title : "", 48);
      let description = cleanProse(
        typeof row.description === "string" ? row.description : "",
        140,
      );
      if (!title && !description) {
        return null;
      }
      if (
        title &&
        description.toLowerCase().startsWith(title.toLowerCase())
      ) {
        description = description.slice(title.length).replace(/^[\s:.\-–—]+/, "");
      }
      if (description.toLowerCase() === title.toLowerCase()) {
        description = "";
      }
      return { title: title || description, description };
    })
    .filter((item): item is { title: string; description: string } => item !== null)
    .slice(0, 3);
}

function keepOnTopicItems(
  rows: Array<{ title: string; description: string }>,
  prompt: string,
  fallback: Array<{ title: string; description: string }>,
): Array<{ title: string; description: string }> {
  const onTopic = rows.filter((row) => {
    const blob = `${row.title} ${row.description}`;
    if (GENERIC_FEATURE.test(blob)) {
      return false;
    }
    return queryFitsTopic(blob, prompt);
  });
  if (onTopic.length === 0) {
    return fallback;
  }
  const extra = fallback.filter(
    (row) =>
      !onTopic.some((kept) => kept.title.toLowerCase() === row.title.toLowerCase()),
  );
  return [...onTopic, ...extra].slice(0, 3);
}

export function normalizeLandingPage(
  raw: unknown,
  prompt: string,
): LandingPageContent {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const { brief, userPrompt } = decodeLandingBrief(prompt);
  const shop = cleanProse(
    typeof data.brandName === "string" && data.brandName.trim()
      ? data.brandName
      : (brief.brandName ?? brandFromPrompt(userPrompt)),
    40,
  );
  const topic = brief.offer || topicFromPrompt(userPrompt) || shop;
  const contactEmail = brief.contactEmail;
  const contactPhone = brief.contactPhone;
  const contactAddress = brief.contactAddress;
  const showContact = hasContactDetails({
    contactEmail,
    contactPhone,
    contactAddress,
  });
  const fallbackCta = showContact ? "/#contact" : "/#start";
  const rawCta = text(data.ctaUrl, fallbackCta);
  const ctaUrl =
    !showContact && /#contact/i.test(rawCta)
      ? "/#start"
      : rawCta.startsWith("/")
        ? rawCta
        : fallbackCta;

  const features = keepOnTopicItems(
    items(data.features),
    userPrompt,
    topicFallbackFeatures(topic),
  );
  const steps = keepOnTopicItems(
    items(data.steps),
    userPrompt,
    topicFallbackSteps(topic),
  );

  const content = {
    headline: text(data.headline, shop),
    body: text(
      data.body,
      brief.offer || `A landing page about ${topic}.`,
    ),
    ctaLabel: cleanProse(
      typeof data.ctaLabel === "string" && data.ctaLabel.trim()
        ? data.ctaLabel
        : showContact
          ? "Get in touch"
          : "Get started",
      28,
    ),
    ctaUrl,
    brandName: shop,
    eyebrow: optionalText(data.eyebrow) ?? brief.offer ?? optionalText(topic.split(" ").slice(0, 4).join(" ")),
    proofStat: undefined,
    proofLabel: undefined,
    problemTitle:
      optionalText(data.problemTitle) ?? topicFallbackProblem(topic).title,
    problemBody:
      optionalText(data.problemBody) ?? topicFallbackProblem(topic).body,
    visualQuery: optionalText(data.visualQuery) ?? `${topic} product photograph`,
    features,
    steps,
    testimonial: undefined,
    testimonialAuthor: undefined,
    closingHeadline:
      optionalText(data.closingHeadline) ?? topicFallbackClose(topic, shop).title,
    closingBody:
      optionalText(data.closingBody) ?? topicFallbackClose(topic, shop).body,
    contactEmail: showContact ? contactEmail : undefined,
    contactPhone: showContact ? contactPhone : undefined,
    contactAddress: showContact ? contactAddress : undefined,
    productHeading:
      optionalText(data.productHeading) ?? `What you get with ${shop}`,
    heroPhotoQuery: optionalText(data.heroPhotoQuery),
    storePhotoQuery: optionalText(data.storePhotoQuery),
    customerPhotoQuery: optionalText(data.customerPhotoQuery),
    featurePhotoQueries: stringList(data.featurePhotoQueries),
    heroImageUrl: optionalUrl(data.heroImageUrl),
    storeImageUrl: optionalUrl(data.storeImageUrl),
    customerImageUrl: optionalUrl(data.customerImageUrl),
    featureImageUrls: urlList(data.featureImageUrls),
  };

  return LandingPageContentSchema.parse(content);
}

export function canNormalizeLanding(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") {
    return false;
  }
  const data = raw as Record<string, unknown>;
  return Boolean(text(data.headline, "") || text(data.body, "") || text(data.brandName, ""));
}
