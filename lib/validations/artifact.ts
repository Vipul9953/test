import { z } from "zod";
import { AspectRatioSchema, ImageStyleSchema } from "./image-options";

export const ImageContentSchema = z.object({
  url: z.string().url(),
  aspectRatio: AspectRatioSchema.optional(),
  imageStyle: ImageStyleSchema.optional(),
});
export type ImageContent = z.infer<typeof ImageContentSchema>;

export const CopyContentSchema = z.object({
  headline: z.string(),
  body: z.string(),
  ctaLabel: z.string(),
  ctaUrl: z.string(),
});
export type CopyContent = z.infer<typeof CopyContentSchema>;

export const LandingFeatureSchema = z.object({
  title: z.string(),
  description: z.string(),
});
export const LandingStepSchema = z.object({
  title: z.string(),
  description: z.string(),
});

/** Stored / streamed landing copy. Core 4 fields stay AC4-compatible. */
export const LandingPageContentSchema = CopyContentSchema.extend({
  brandName: z.string().optional(),
  eyebrow: z.string().optional(),
  proofStat: z.string().optional(),
  proofLabel: z.string().optional(),
  problemTitle: z.string().optional(),
  problemBody: z.string().optional(),
  visualQuery: z.string().optional(),
  features: z.array(LandingFeatureSchema).max(3).optional(),
  steps: z.array(LandingStepSchema).max(3).optional(),
  testimonial: z.string().optional(),
  testimonialAuthor: z.string().optional(),
  closingHeadline: z.string().optional(),
  closingBody: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  contactAddress: z.string().optional(),
  productHeading: z.string().optional(),
  heroPhotoQuery: z.string().optional(),
  storePhotoQuery: z.string().optional(),
  customerPhotoQuery: z.string().optional(),
  featurePhotoQueries: z.array(z.string()).max(3).optional(),
  heroImageUrl: z.string().optional(),
  storeImageUrl: z.string().optional(),
  customerImageUrl: z.string().optional(),
  featureImageUrls: z.array(z.string()).max(3).optional(),
});
export type LandingPageContent = z.infer<typeof LandingPageContentSchema>;

export const LandingExtrasSchema = z.object({
  brandName: z.string().optional(),
  eyebrow: z.string().optional(),
  problemTitle: z.string().optional(),
  problemBody: z.string().optional(),
  productHeading: z.string().optional(),
  features: z.array(LandingFeatureSchema).max(3).optional(),
  steps: z.array(LandingStepSchema).max(3).optional(),
  closingHeadline: z.string().optional(),
  closingBody: z.string().optional(),
  heroPhotoQuery: z.string().optional(),
  storePhotoQuery: z.string().optional(),
  customerPhotoQuery: z.string().optional(),
  featurePhotoQueries: z.array(z.string()).max(3).optional(),
});

/** Loose generate schema — models often miss exact array lengths. */
export const LandingPageGenerateSchema = z.object({
  headline: z.string(),
  body: z.string(),
  ctaLabel: z.string(),
  ctaUrl: z.string(),
  brandName: z.string().optional(),
  eyebrow: z.string().optional(),
  proofStat: z.string().optional(),
  proofLabel: z.string().optional(),
  problemTitle: z.string().optional(),
  problemBody: z.string().optional(),
  visualQuery: z.string().optional(),
  features: z.array(LandingFeatureSchema.partial()).min(1).max(4).optional(),
  steps: z.array(LandingStepSchema.partial()).min(1).max(4).optional(),
  testimonial: z.string().optional(),
  testimonialAuthor: z.string().optional(),
  closingHeadline: z.string().optional(),
  closingBody: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  contactAddress: z.string().optional(),
  heroPhotoQuery: z.string().optional(),
  storePhotoQuery: z.string().optional(),
  customerPhotoQuery: z.string().optional(),
  featurePhotoQueries: z.array(z.string()).max(3).optional(),
});

export const PartialLandingPageContentSchema = LandingPageContentSchema.partial().extend({
  features: z.array(LandingFeatureSchema.partial()).max(3).optional(),
  steps: z.array(LandingStepSchema.partial()).max(3).optional(),
});
export type PartialLandingPageContent = z.infer<typeof PartialLandingPageContentSchema>;

export const ArtifactContentSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("image"), content: ImageContentSchema }),
  z.object({ kind: z.literal("landing-page"), content: LandingPageContentSchema }),
  z.object({ kind: z.literal("email"), content: CopyContentSchema }),
]);
export type ArtifactContent = z.infer<typeof ArtifactContentSchema>;
