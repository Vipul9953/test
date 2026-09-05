import { decodeLandingBrief } from "@/lib/landing/brief";

const STOP = new Set([
  "make",
  "create",
  "build",
  "write",
  "generate",
  "a",
  "an",
  "the",
  "for",
  "and",
  "with",
  "from",
  "this",
  "that",
  "landing",
  "page",
  "website",
  "site",
  "please",
  "want",
  "need",
  "improve",
  "original",
  "direction",
  "prompt",
  "marketing",
  "about",
  "only",
  "stay",
  "high-quality",
  "short",
  "promotional",
]);

const SYNONYMS: Array<{ match: RegExp; tags: string[] }> = [
  { match: /vegetab|sabzi|produce|greens|groc/i, tags: ["vegetables", "produce", "market"] },
  { match: /fruit|mango|apple|berry/i, tags: ["fruits", "farmers-market", "fresh"] },
  { match: /shoe|sneaker|footwear|boot/i, tags: ["shoes", "sneakers", "footwear"] },
  { match: /coffee|cafe|espresso/i, tags: ["coffee", "cafe", "espresso"] },
  { match: /bakery|bread|cake/i, tags: ["bakery", "bread", "pastry"] },
  { match: /fashion|apparel|cloth/i, tags: ["fashion", "clothing", "boutique"] },
  { match: /jewel|gold|ring/i, tags: ["jewelry", "gold", "boutique"] },
  { match: /fitness|gym|yoga/i, tags: ["fitness", "gym", "training"] },
  { match: /saas|software|app/i, tags: ["laptop", "workspace", "startup"] },
  { match: /hotel|resort|grandstay|guest|booking/i, tags: ["hotel", "resort", "lobby"] },
  { match: /ice\s*cream|gelato|sundae|dessert|scoop/i, tags: ["ice-cream", "gelato", "dessert"] },
  { match: /pizz|pizaa|pizzeria|pepperoni/i, tags: ["pizza", "pizzeria", "italian"] },
  { match: /coach|coash|mentor|tutor|lesson/i, tags: ["coaching", "mentor", "classroom"] },
];

const SLOT_TAGS = {
  hero: [],
  feature: [],
  store: ["storefront"],
  customer: [],
} as const;

export type LandingPhotoSlot = keyof typeof SLOT_TAGS;

export function latestUserPrompt(prompt: string): string {
  const direction = prompt.match(/Direction:\s*([\s\S]+)$/i)?.[1];
  return decodeLandingBrief(direction || prompt).userPrompt.replace(/\s+/g, " ").trim();
}

export function topicFromPrompt(prompt: string): string {
  const source = latestUserPrompt(prompt);
  const words = source
    .split(" ")
    .map((word) => word.replace(/[^\p{L}\p{N}+-]/gu, ""))
    .filter((word) => word.length > 1 && !STOP.has(word.toLowerCase()));

  return (words.join(" ") || source || "shop").slice(0, 80);
}

export function landingPhotoTags(input: {
  prompt: string;
  brand?: string;
  headline?: string;
  featureTitle?: string;
  slot: LandingPhotoSlot;
}): string[] {
  const topic = latestUserPrompt(input.prompt);
  const tags = new Set<string>();
  for (const word of topicFromPrompt(topic).split(" ")) {
    const clean = word.toLowerCase();
    if (clean.length > 2) {
      tags.add(clean);
    }
  }

  for (const rule of SYNONYMS) {
    if (rule.match.test(topic)) {
      for (const tag of rule.tags) {
        tags.add(tag);
      }
    }
  }

  for (const tag of SLOT_TAGS[input.slot]) {
    tags.add(tag);
  }

  const list = [...tags].slice(0, 6);
  return list.length > 0 ? list : ["shop", "store", "product"];
}

export function queryFitsTopic(query: string, prompt: string): boolean {
  const topic = topicFromPrompt(prompt).toLowerCase();
  const tokens = topic
    .split(/\s+/)
    .filter((word) => word.length > 3 && !word.includes("@") && !/^\d+$/.test(word));
  const haystack = query.toLowerCase();
  if (tokens.some((token) => haystack.includes(token))) {
    return true;
  }
  return SYNONYMS.some(
    (rule) =>
      rule.match.test(latestUserPrompt(prompt)) &&
      rule.tags.some((tag) => haystack.includes(tag)),
  );
}
