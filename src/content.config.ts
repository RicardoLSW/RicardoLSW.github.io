import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const hostedTravelImage = z
  .url()
  .regex(/^https:\/\/figure-b\.ricardolsw\.com\/blog-images\/[a-z0-9][a-z0-9-]*(?:~[a-f0-9]+)?\/v1-[a-f0-9]{64}\.jpg$/);

const travel = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/travel' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      location: z.string(),
      coordinates: z.object({
        lat: z.number(),
        lng: z.number(),
      }),
      cover: z.union([image(), hostedTravelImage]),
      description: z.string(),
      tags: z.array(z.string()).default([]),
      gallery: z
        .array(
          z.object({
            src: z.union([image(), hostedTravelImage]),
            alt: z.string(),
            caption: z.string().optional(),
            width: z.number().int().positive(),
            height: z.number().int().positive(),
          }),
        )
        .optional(),
      legacyPath: z.string().optional(),
      draft: z.boolean().default(false),
    }).superRefine((data, context) => {
      if (typeof data.cover === 'string' && !data.gallery?.some((image) => image.src === data.cover)) {
        context.addIssue({
          code: 'custom',
          path: ['cover'],
          message: 'Hosted cover must match a gallery image with declared dimensions.',
        });
      }
    }),
});

export const collections = { travel };
