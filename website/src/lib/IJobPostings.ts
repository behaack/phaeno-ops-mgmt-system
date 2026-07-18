/* ---------------------------------------------------------------
   types/JobPosting.ts
   Simplified—but expandable—Schema.org JobPosting definitions
   --------------------------------------------------------------- */

/* --- Enumerations ------------------------------------------------ */

export type EmploymentType =
  | 'FULL_TIME'
  | 'PART_TIME'
  | 'CONTRACTOR'
  | 'TEMPORARY'
  | 'INTERN'
  | 'VOLUNTEER'
  | 'PER_DIEM'
  | 'OTHER';

/** Flag for remote / hybrid roles (omit for on-site only) */
export type JobLocationType = 'TELECOMMUTE';

/* --- Reusable nested objects ------------------------------------ */

export interface PostalAddress {
  '@type': 'PostalAddress';
  /** City — e.g. "San Francisco" */
  addressLocality: string;
  /** State, province, or region — e.g. "CA" */
  addressRegion?: string;
  /** Two-letter ISO 3166-1 country code — e.g. "US" */
  addressCountry: string;
  /** Optional extras (you can drop these to keep JSON short) */
  streetAddress?: string;
  postalCode?: string;
}

export interface Place {
  '@type': 'Place';
  address: PostalAddress;
}

export interface Organization {
  '@type': 'Organization';
  name: string;
  /** Home page or profile */
  url?: string;
  /** Social or Wiki URL — helps Google link the org */
  sameAs?: string;
  /** Logo URL */
  logo?: string;
}

export interface PropertyValue {
  '@type': 'PropertyValue';
  /** Internal job ID or requisition number */
  value: string;
}

export interface ApplicantLocation {
  /** Country or sub-region where the candidate must reside */
  '@type': 'Country' | 'AdministrativeArea';
  name: string;       // “United States”, “California”, …
  sameAs?: string;    // Optional WikiData/Wikipedia link
}

/* --- Main JobPosting interface ---------------------------------- */

export interface JobPosting {
  '@context': 'https://schema.org/';
  '@type': 'JobPosting';

  /* Required by Google ------------------------------------------- */
  title: string;
  description: string;                         // HTML allowed
  datePosted: string;                          // ISO 8601
  employmentType: EmploymentType | EmploymentType[];
  hiringOrganization: Organization;

  /* Strongly recommended ----------------------------------------- */
  identifier?: PropertyValue;
  industry?: string;                           // e.g. "Biotechnology"

  /* Location logic ------------------------------------------------
     - On-site only: provide jobLocation; omit jobLocationType & applicantLocationRequirements
     - Remote / hybrid: set jobLocationType: 'TELECOMMUTE' and at least one applicantLocationRequirements
  ----------------------------------------------------------------- */
  jobLocation?: Place | Place[];
  jobLocationType?: JobLocationType;
  applicantLocationRequirements?: ApplicantLocation | ApplicantLocation[];

  /* Allow future extensions without TS edits --------------------- */
  [prop: string]: unknown;
}
