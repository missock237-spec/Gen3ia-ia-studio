import { z } from "zod";

export const ResearchSourceSchema = z.object({
  id: z.string(),

  url: z.string().url(),

  title: z.string(),

  domain: z.string(),

  snippet: z.string().optional(),

  content: z.string().optional(),

  publishedAt: z.string().optional(),

  accessedAt: z.string(),

  sourceType: z.enum([
    "official",
    "documentation",
    "academic",
    "news",
    "company",
    "community",
    "unknown",
  ]),

  authorityScore: z
    .number()
    .min(0)
    .max(1),

  relevanceScore: z
    .number()
    .min(0)
    .max(1),

  freshnessScore: z
    .number()
    .min(0)
    .max(1),

  verified: z.boolean(),
});

export type ResearchSource =
  z.infer<typeof ResearchSourceSchema>;

export const ResearchClaimSchema =
  z.object({
    id: z.string(),

    claim: z.string(),

    sourceIds: z.array(
      z.string(),
    ),

    confidence: z
      .number()
      .min(0)
      .max(1),

    status: z.enum([
      "supported",
      "contradicted",
      "uncertain",
    ]),
  });

export type ResearchClaim =
  z.infer<typeof ResearchClaimSchema>;

export const ResearchReportSchema =
  z.object({
    query: z.string(),

    summary: z.string(),

    claims: z.array(
      ResearchClaimSchema,
    ),

    sources: z.array(
      ResearchSourceSchema,
    ),

    citations: z.array(
      z.object({
        claimId: z.string(),
        sourceId: z.string(),
      }),
    ),

    generatedAt: z.string(),
  });

export type ResearchReport =
  z.infer<typeof ResearchReportSchema>;
