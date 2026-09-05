import { latestUserPrompt, type LandingPhotoSlot } from "@/lib/landing/photo";

const SLOT_INDEX: Record<LandingPhotoSlot, number> = {
  hero: 0,
  store: 1,
  customer: 2,
  feature: 3,
};

const CATALOG: Record<string, string[]> = {
  vegetables: [
    "photo-1540420773420-3366772f4999",
    "photo-1488459716781-31db52582fe9",
    "photo-1512621776951-a57141f2eefd",
    "photo-1461354464878-ad92f492a5a0",
    "photo-1542838132-92c53300491e",
    "photo-1566385101042-1a0aa0c1268c",
  ],
  fruits: [
    "photo-1619566636858-adf3ef464360",
    "photo-1610832958506-aa56368176cf",
    "photo-1560806887-1e4cd0b6cbd6",
    "photo-1567306301408-9b74779a11af",
    "photo-1519996529931-28324d5a630e",
    "photo-1490474418585-ba9bad8fd0ea",
  ],
  shoes: [
    "photo-1542291026-7eec264c27ff",
    "photo-1549298916-b41d501d3772",
    "photo-1460353581641-37baddab0fa2",
    "photo-1525966222134-fcfa99b8ae77",
    "photo-1595950653106-6c9ebd614d3a",
    "photo-1560769629-975ec94e6a86",
  ],
  coffee: [
    "photo-1495474472287-4d71bcdd2085",
    "photo-1509042239860-f550ce710b93",
    "photo-1498804103079-a6351b050096",
    "photo-1507133750040-4a8f57021535",
    "photo-1511920170033-f8396924c348",
    "photo-1442512595331-e89e73882519",
  ],
  bakery: [
    "photo-1509440159596-0249088772ff",
    "photo-1555507036-ab1f4038808a",
    "photo-1517433670267-08bbd4be890f",
    "photo-1549931319-a545dcf3bc73",
    "photo-1486427944299-d1955d23e34d",
    "photo-1470119693884-47d3a1d1f180",
  ],
  fashion: [
    "photo-1441984904996-e0b6ba687e04",
    "photo-1483985988355-763728e1935b",
    "photo-1490481651871-ab68de25d43d",
    "photo-1469334031218-e382a71b716b",
    "photo-1445205170230-053b83016050",
    "photo-1487222477894-8943e31ef7b2",
  ],
  jewelry: [
    "photo-1515562141207-7a88fb7ce338",
    "photo-1611591437281-460bfbe1220a",
    "photo-1599643478518-a784e5dc4c8f",
    "photo-1573408301185-9146fe634ad0",
    "photo-1601121141461-9d6647bca1ed",
    "photo-1617038260897-41a1f14a8ca0",
  ],
  fitness: [
    "photo-1534438327276-14e5300c3a48",
    "photo-1517836357463-d25dfeac3438",
    "photo-1571019614242-c5c5dee9f50b",
    "photo-1518611012118-696072aa579a",
    "photo-1576678927484-cc907957088c",
    "photo-1549060279-7e168fcee0c2",
  ],
  saas: [
    "photo-1498050108023-c5249f4df085",
    "photo-1460925895917-afdab827c52f",
    "photo-1551650975-87deedd944c3",
    "photo-1519389950473-47ba0277781c",
    "photo-1522071820081-009f0129c71c",
    "photo-1553877522-43269d4ea984",
  ],
  hotel: [
    "photo-1566073771259-6a8506099945",
    "photo-1551882547-ff40c63fe5fa",
    "photo-1542314831-068cd1dbfeeb",
    "photo-1571896349842-33c89424de2d",
    "photo-1611892440504-42a792e24d32",
    "photo-1445019980597-93fa8acb246c",
  ],
  dessert: [
    "photo-1497034825429-c343d7c6a68f",
    "photo-1501443762994-82addb388246",
    "photo-1563805042-7684c019e1cb",
    "photo-1488900128323-21503983a07e",
    "photo-1505394033641-40c6ad1178d7",
    "photo-1551024506-0bccd828d307",
  ],
  pizza: [
    "photo-1513104890138-7c749659a591",
    "photo-1574071318508-1cdbab80d002",
    "photo-1565299624946-b28f40a0ae38",
    "photo-1593560708920-61dd98c46a4e",
    "photo-1571407970349-bc81e7e96d47",
    "photo-1604382354936-07c5d9983bd3",
  ],
  shop: [
    "photo-1441986300917-64674bd600d8",
    "photo-1472851294608-062f824d29cc",
    "photo-1556740738-b6a63e27c4df",
    "photo-1523275335684-37898b6baf30",
    "photo-1556742049-0cfed4f6a45d",
    "photo-1604719312566-8912e9227c6a",
  ],
};

const TOPIC_RULES: Array<{ match: RegExp; key: keyof typeof CATALOG }> = [
  { match: /vegetab|sabzi|produce|greens|groc/i, key: "vegetables" },
  { match: /fruit|mango|apple|berry/i, key: "fruits" },
  { match: /shoe|sneaker|footwear|boot/i, key: "shoes" },
  { match: /coffee|cafe|espresso/i, key: "coffee" },
  { match: /bakery|bread|cake/i, key: "bakery" },
  { match: /fashion|apparel|cloth/i, key: "fashion" },
  { match: /jewel|gold|ring/i, key: "jewelry" },
  { match: /fitness|gym|yoga/i, key: "fitness" },
  { match: /saas|software|app|startup/i, key: "saas" },
  { match: /hotel|resort|grandstay|guest|booking/i, key: "hotel" },
  { match: /ice\s*cream|gelato|sundae|dessert|scoop/i, key: "dessert" },
  { match: /pizz|pizaa|pizzeria|pepperoni/i, key: "pizza" },
];

function landingPhotoTopic(prompt: string): keyof typeof CATALOG {
  const text = latestUserPrompt(prompt);
  return TOPIC_RULES.find((rule) => rule.match.test(text))?.key ?? "shop";
}

export function staticPhotoUrl(input: {
  prompt: string;
  slot: LandingPhotoSlot;
  index?: number;
  width?: number;
}): string {
  const photos = CATALOG[landingPhotoTopic(input.prompt)];
  const offset = SLOT_INDEX[input.slot] + (input.index ?? 0);
  const id = photos[offset % photos.length];
  const width = input.width ?? 900;
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=75`;
}
