import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

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
      cover: image(),
      description: z.string(),
      tags: z.array(z.string()).default([]),
      gallery: z
        .array(
          z.object({
            src: image(),
            alt: z.string(),
            caption: z.string().optional(),
            width: z.number().int().positive(),
            height: z.number().int().positive(),
          }),
        )
        .optional(),
      legacyPath: z.string().optional(),
      draft: z.boolean().default(false),
    }),
});

const legacy = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/legacy' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string(),
    categories: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    legacyPath: z.string(),
    lastModified: z.coerce.date().optional(),
  }),
});

export const collections = { travel, legacy };
