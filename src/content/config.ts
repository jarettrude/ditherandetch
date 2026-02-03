import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const gallery = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/assets/gallery' }),
  schema: z.object({
    title: z.string(),
    alt: z.string(),
    caption: z.string().optional(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    size: z.enum(['small', 'medium', 'large']).default('small'),
    order: z.number().default(50), // 1-100, lower = earlier in grid
  }),
});

const journal = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/journal' }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
    category: z
      .enum(['process', 'experiments', 'commissions', 'brand'])
      .default('process'),
    excerpt: z.string().optional(),
    cover: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { gallery, journal };
