import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const jobs = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/jobs' }),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    locationType: z.enum(['Remote', 'On-Site']),
    locationDescription: z.string(),
    city: z.string().nullable().optional(),
    region: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    employmentType: z.enum(['Full-time', 'Part-time', 'Contract', 'Temporary', 'Intern', 'Other']),
    date: z.coerce.date(),
    summary: z.string().max(200, 'Maximum length is 150 characters'),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    summary: z.string().max(200, 'Maximum length is 200 characters'),
    image: z.string(),
    authors: z.array(z.string()),
    date: z.coerce.date(),
  }),
});

const events = defineCollection({
  loader: file('src/content/events/events.json'),
  schema: z.object({
    id: z.number(),
    name: z.string(),
    location: z.string(),
    path: z.string(),
    dates: z.string(),
    lastdate: z.coerce.date(),
  }),
});

const news = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    image: z.string(),
    date: z.coerce.date(),
    summary: z.string().max(200, 'Maximum length is 200 characters'),
  }),
});

const press = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/press' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
  }),
});

const scientific_papers = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/scientific_papers' }),
  schema: z.object({
    title: z.string(),
    image: z.string(),
    authors: z.array(z.string()),
    journal: z.string(),
    date: z.coerce.date(),
    link: z.string(),
    summary: z.string().max(200, 'Maximum length is 200 characters'),
  }),
});

const white_papers = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/white_papers' }),
  schema: z.object({
    title: z.string(),
    image: z.string(),
    authors: z.array(z.string()),
    date: z.coerce.date(),
    summary: z.string().max(200, 'Maximum length is 200 characters'),
  }),
});

export const collections = {
  blog,
  events,
  jobs,
  news,
  press,
  scientific_papers,
  white_papers,
};
