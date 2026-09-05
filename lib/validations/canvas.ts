import { z } from "zod";
import { ArtifactContentSchema } from "./artifact";
import { CreditsStatusSchema } from "./credit-phases";
import { CreativeKindSchema, DispatchStatusSchema } from "./dispatch";

export const CanvasRunSchema = z.object({
  runId: z.string().uuid(),
  artifactId: z.string().uuid().nullable(),
  prompt: z.string(),
  kind: CreativeKindSchema.nullable(),
  confidence: z.number().nullable(),
  status: DispatchStatusSchema,
  content: ArtifactContentSchema.nullable(),
  parentArtifactId: z.string().uuid().nullable(),
  createdAt: z.string(),
  errorMessage: z.string().nullable(),
  creditsSettled: z.number().int(),
  creditsReserved: z.number().int(),
});
type CanvasRun = z.infer<typeof CanvasRunSchema>;

export type LiveArtifactContent =
  | { kind: "image"; content: { url?: string } }
  | {
      kind: "landing-page";
      content: {
        headline?: string;
        body?: string;
        ctaLabel?: string;
        ctaUrl?: string;
        brandName?: string;
        eyebrow?: string;
        proofStat?: string;
        proofLabel?: string;
        problemTitle?: string;
        problemBody?: string;
        visualQuery?: string;
        features?: Array<{ title?: string; description?: string }>;
        steps?: Array<{ title?: string; description?: string }>;
        testimonial?: string;
        testimonialAuthor?: string;
        closingHeadline?: string;
        closingBody?: string;
        contactEmail?: string;
        contactPhone?: string;
        contactAddress?: string;
        productHeading?: string;
        heroPhotoQuery?: string;
        storePhotoQuery?: string;
        customerPhotoQuery?: string;
        featurePhotoQueries?: string[];
        heroImageUrl?: string;
        storeImageUrl?: string;
        customerImageUrl?: string;
        featureImageUrls?: string[];
      };
    }
  | {
      kind: "email";
      content: {
        headline?: string;
        body?: string;
        ctaLabel?: string;
        ctaUrl?: string;
      };
    };

export type LiveCanvasRun = Omit<CanvasRun, "content"> & {
  content: LiveArtifactContent | null;
};

export const CreditActivityEntrySchema = z.object({
  runId: z.string().uuid(),
  projectId: z.string().uuid(),
  projectName: z.string(),
  kind: CreativeKindSchema.nullable(),
  prompt: z.string(),
  status: DispatchStatusSchema,
  creditsStatus: CreditsStatusSchema,
  reserved: z.number().int(),
  settled: z.number().int(),
  createdAt: z.string(),
});
export type CreditActivityEntry = z.infer<typeof CreditActivityEntrySchema>;

export const CreditBalanceSchema = z.object({
  signup: z.number().int(),
  available: z.number().int(),
  held: z.number().int(),
  used: z.number().int(),
  settled: z.number().int(),
  released: z.number().int(),
  activity: z.array(CreditActivityEntrySchema),
});
export type CreditBalance = z.infer<typeof CreditBalanceSchema>;

export const CanvasListSchema = z.object({
  runs: z.array(CanvasRunSchema),
});
export const UuidSchema = z.string().uuid();
