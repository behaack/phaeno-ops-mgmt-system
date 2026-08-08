import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const translationStatus = z.enum([
  'not_started',
  'draft',
  'review',
  'published',
  'stale',
  'withdrawn',
])

const localizationFields = {
  locale: z.string().default('en-US'),
  translationKey: z.string().trim().min(1).optional(),
  sourceLocale: z.string().default('en-US'),
  translationStatus: translationStatus.default('published'),
  sourceRevision: z.string().trim().min(1).optional(),
  translatedFromRevision: z.string().trim().min(1).optional(),
  translator: z.string().trim().min(1).optional(),
  reviewer: z.string().trim().min(1).optional(),
  reviewedAt: z.coerce.date().optional(),
}

const normalizedPublicationTerms = z
  .array(z.string().trim().min(1))
  .min(1)
  .transform((values) => {
    const seen = new Set<string>();

    return values
      .map((value) => value.replace(/\s+/g, ' ').trim())
      .filter((value) => {
        const normalized = value.toLocaleLowerCase('en-US');
        if (seen.has(normalized)) {
          return false;
        }

        seen.add(normalized);
        return true;
      });
  });

const jobs = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/jobs' }),
  schema: z.object({
    ...localizationFields,
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
    ...localizationFields,
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
    ...localizationFields,
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
    ...localizationFields,
    title: z.string(),
    image: z.string(),
    date: z.coerce.date(),
    summary: z.string().max(200, 'Maximum length is 200 characters'),
  }),
});

const press = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/press' }),
  schema: z.object({
    ...localizationFields,
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
  }),
});

const scientific_papers = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/scientific_papers' }),
  schema: z.object({
    ...localizationFields,
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
  schema: z
    .object({
      ...localizationFields,
      title: z.string().trim().min(1),
      image: z.string().trim().startsWith('/images/'),
      date: z.coerce.date(),
      dateModified: z.coerce.date().optional(),
      summary: z.string().trim().min(1).max(200, 'Maximum length is 200 characters'),
      pageCount: z.number().int().positive(),
      version: z.string().trim().min(1).optional(),
      topics: normalizedPublicationTerms,
      searchKeywords: normalizedPublicationTerms,
      assetLanguage: z.string().default('en-US'),
      assetTranslationStatus: translationStatus.default('published'),
      assetVersion: z.string().trim().min(1).optional(),
      assetChecksum: z.string().trim().min(1).optional(),
    })
    .superRefine((paper, context) => {
      if (paper.dateModified && paper.dateModified < paper.date) {
        context.addIssue({
          code: 'custom',
          path: ['dateModified'],
          message: 'dateModified cannot be earlier than date',
        });
      }
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
