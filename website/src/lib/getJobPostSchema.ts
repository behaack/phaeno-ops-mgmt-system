// src/utils/getJobPostingSchema.ts
import type { CollectionEntry } from 'astro:content';
import type {
  JobPosting,
  EmploymentType,
  Organization,
} from './IJobPostings';

/* ------------------------------------------------------------------
   1.  Static data about your company (edit once, reuse everywhere)
   ------------------------------------------------------------------ */
const PHANEO_ORG: Organization = {
  '@type': 'Organization',
  name: 'Phaeno',
  url: 'https://www.phaenobiotech.com',
  sameAs: 'https://www.phaenobiotech.com',
  logo: 'https://7579-52288.el-alt.com/public/phaeno180x58.png',
};

/* ------------------------------------------------------------------
   2.  Map UI-friendly strings to the schema enums we defined
   ------------------------------------------------------------------ */
const employmentMap: Record<
  CollectionEntry<'jobs'>['data']['employmentType'],
  EmploymentType
> = {
  'Full-time': 'FULL_TIME',
  'Part-time': 'PART_TIME',
  Contract: 'CONTRACTOR',
  Temporary: 'TEMPORARY',
  Intern: 'INTERN',
  Other: 'OTHER',
};

/* ------------------------------------------------------------------
   3.  Main helper
   ------------------------------------------------------------------ */
export function getJobPostingSchema(
  job: CollectionEntry<'jobs'>
): JobPosting {
  const {
    id,
    title,
    summary,
    employmentType,
    date,
    locationType,
    city,
    region,
    country,
  } = job.data;

  const schema: JobPosting = {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title,
    description: summary,
    datePosted: date.toISOString(),
    employmentType: employmentMap[employmentType],
    hiringOrganization: PHANEO_ORG,
    identifier: { '@type': 'PropertyValue', value: id },
    industry: 'Biotechnology',
  };

  // ► Location logic
  if (locationType === 'Remote') {
    // Remote‐only or field-sales roles
    schema.jobLocationType = 'TELECOMMUTE';
    schema.applicantLocationRequirements = {
      '@type': country ? 'Country' : 'AdministrativeArea',
      name: country ?? region ?? 'Worldwide',
    };
  } else {
    // On-site role (city / state / country only)
    schema.jobLocation = {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: city ?? '',
        addressRegion: region ?? '',
        addressCountry: country ?? 'US',
      },
    };
  }

  return schema;
}
