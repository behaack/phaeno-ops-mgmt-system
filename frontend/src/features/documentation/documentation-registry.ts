import type { ComponentType, ElementType } from 'react'

import CustomerAccountAndAccess from '#/content/docs/en-US/customer/account-and-access.mdx'
import CustomerDataAndOrganization from '#/content/docs/en-US/customer/data-and-organization.mdx'
import CustomerGettingStarted from '#/content/docs/en-US/customer/getting-started.mdx'
import CustomerLabServices from '#/content/docs/en-US/customer/lab-services.mdx'
import CustomerResultsAndBilling from '#/content/docs/en-US/customer/results-and-billing.mdx'
import CustomerStatusesAndTroubleshooting from '#/content/docs/en-US/customer/statuses-and-troubleshooting.mdx'
import PartnerAccountAndAccess from '#/content/docs/en-US/partner/account-and-access.mdx'
import PartnerDataAndOrganization from '#/content/docs/en-US/partner/data-and-organization.mdx'
import PartnerDataAssembly from '#/content/docs/en-US/partner/data-assembly.mdx'
import PartnerGettingStarted from '#/content/docs/en-US/partner/getting-started.mdx'
import PartnerReagentOrders from '#/content/docs/en-US/partner/reagent-orders.mdx'
import PartnerStatusesAndTroubleshooting from '#/content/docs/en-US/partner/statuses-and-troubleshooting.mdx'
import PhaenoConfigurationAndRecovery from '#/content/docs/phaeno/configuration-and-recovery.mdx'
import PhaenoDataProvisioningAndAccounts from '#/content/docs/phaeno/data-provisioning-and-accounts.mdx'
import PhaenoGettingStarted from '#/content/docs/phaeno/getting-started.mdx'
import PhaenoOrderOperations from '#/content/docs/phaeno/order-operations.mdx'
import PhaenoOrganizationAndUserAdministration from '#/content/docs/phaeno/organization-and-user-administration.mdx'
import PhaenoStatusesAndRecovery from '#/content/docs/phaeno/statuses-and-recovery.mdx'
import {
  defaultExternalDocumentationLocale,
  type ExternalDocumentationLocale,
} from './documentation-localization'

export const documentationAudienceKeys = [
  'customer',
  'partner',
  'phaeno',
] as const

export type DocumentationAudience = (typeof documentationAudienceKeys)[number]

export type DocumentationContent = ComponentType<{
  components?: Record<string, ElementType>
}>

export type DocumentationEntry = {
  audience: DocumentationAudience
  locale: ExternalDocumentationLocale | null
  slug: string
  title: string
  summary: string
  section: string
  order: number
  reviewedAt: string
  Content: DocumentationContent
}

export const documentationAudiences: Record<
  DocumentationAudience,
  { landingSlug: string }
> = {
  customer: {
    landingSlug: 'getting-started',
  },
  partner: {
    landingSlug: 'getting-started',
  },
  phaeno: {
    landingSlug: 'getting-started',
  },
}

export const documentationEntries: readonly DocumentationEntry[] = [
  {
    audience: 'customer',
    locale: 'en-US',
    slug: 'getting-started',
    title: 'Getting started',
    summary: 'Choose the right organization, understand access, and find Customer work.',
    section: 'Basics',
    order: 10,
    reviewedAt: '2026-07-14',
    Content: CustomerGettingStarted,
  },
  {
    audience: 'customer',
    locale: 'en-US',
    slug: 'account-and-access',
    title: 'Account and access',
    summary: 'Accept invitations, select an organization, understand roles, and resolve access problems.',
    section: 'Basics',
    order: 20,
    reviewedAt: '2026-07-14',
    Content: CustomerAccountAndAccess,
  },
  {
    audience: 'customer',
    locale: 'en-US',
    slug: 'lab-services',
    title: 'Request laboratory services',
    summary: 'Create a request, submit samples, accept a quote, and track laboratory work.',
    section: 'Laboratory work',
    order: 30,
    reviewedAt: '2026-07-14',
    Content: CustomerLabServices,
  },
  {
    audience: 'customer',
    locale: 'en-US',
    slug: 'results-and-billing',
    title: 'Results and billing',
    summary: 'Understand result readiness, credit and payment gates, and QuickBooks documents.',
    section: 'Laboratory work',
    order: 40,
    reviewedAt: '2026-07-14',
    Content: CustomerResultsAndBilling,
  },
  {
    audience: 'customer',
    locale: 'en-US',
    slug: 'data-and-organization',
    title: 'Data Library and organization access',
    summary: 'Use assigned data packages and understand Customer organization membership and its current interface boundary.',
    section: 'Data and access',
    order: 50,
    reviewedAt: '2026-07-14',
    Content: CustomerDataAndOrganization,
  },
  {
    audience: 'customer',
    locale: 'en-US',
    slug: 'statuses-and-troubleshooting',
    title: 'Statuses and troubleshooting',
    summary: 'Interpret job, sample, quote, payment, scan, and release states and resolve common problems.',
    section: 'Support',
    order: 60,
    reviewedAt: '2026-07-14',
    Content: CustomerStatusesAndTroubleshooting,
  },
  {
    audience: 'partner',
    locale: 'en-US',
    slug: 'getting-started',
    title: 'Getting started',
    summary: 'Choose the right Partner, understand access, and find Partner work.',
    section: 'Basics',
    order: 10,
    reviewedAt: '2026-07-14',
    Content: PartnerGettingStarted,
  },
  {
    audience: 'partner',
    locale: 'en-US',
    slug: 'account-and-access',
    title: 'Account and access',
    summary: 'Accept invitations, select a Partner, understand roles, and resolve access problems.',
    section: 'Basics',
    order: 20,
    reviewedAt: '2026-07-14',
    Content: PartnerAccountAndAccess,
  },
  {
    audience: 'partner',
    locale: 'en-US',
    slug: 'reagent-orders',
    title: 'Order reagents',
    summary: 'Use negotiated offerings, place orders, approve changes, and track shipments.',
    section: 'Partner work',
    order: 30,
    reviewedAt: '2026-07-14',
    Content: PartnerReagentOrders,
  },
  {
    audience: 'partner',
    locale: 'en-US',
    slug: 'data-assembly',
    title: 'Request data assembly',
    summary: 'Submit inputs, accept a job quote, follow processing, and download outputs.',
    section: 'Partner work',
    order: 40,
    reviewedAt: '2026-07-14',
    Content: PartnerDataAssembly,
  },
  {
    audience: 'partner',
    locale: 'en-US',
    slug: 'data-and-organization',
    title: 'Data Library, billing, and organization access',
    summary: 'Use curated data, understand commercial documents, and understand Partner membership and its current interface boundary.',
    section: 'Data and access',
    order: 50,
    reviewedAt: '2026-07-14',
    Content: PartnerDataAndOrganization,
  },
  {
    audience: 'partner',
    locale: 'en-US',
    slug: 'statuses-and-troubleshooting',
    title: 'Statuses and troubleshooting',
    summary: 'Interpret reagent, assembly, commercial, scan, shipment, and release states.',
    section: 'Support',
    order: 60,
    reviewedAt: '2026-07-14',
    Content: PartnerStatusesAndTroubleshooting,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'getting-started',
    title: 'Phaeno operations guide',
    summary: 'Select the Phaeno workspace, find operational tools, and support users safely.',
    section: 'Basics',
    order: 10,
    reviewedAt: '2026-07-14',
    Content: PhaenoGettingStarted,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'organization-and-user-administration',
    title: 'Organization and user administration',
    summary: 'Understand organization and user administration rules, procedures, and the current mock-interface boundary.',
    section: 'Platform operations',
    order: 20,
    reviewedAt: '2026-07-14',
    Content: PhaenoOrganizationAndUserAdministration,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'data-provisioning-and-accounts',
    title: 'Data provisioning and accounts',
    summary: 'Manage organizations, source data, packages, grants, and governance events.',
    section: 'Platform operations',
    order: 30,
    reviewedAt: '2026-07-14',
    Content: PhaenoDataProvisioningAndAccounts,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'order-operations',
    title: 'Order operations',
    summary: 'Operate Customer lab, Partner reagent, and Partner assembly workflows.',
    section: 'Platform operations',
    order: 40,
    reviewedAt: '2026-07-14',
    Content: PhaenoOrderOperations,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'configuration-and-recovery',
    title: 'Configuration and integration recovery',
    summary: 'Maintain scientific and commercial rules and recover durable integrations.',
    section: 'Platform operations',
    order: 50,
    reviewedAt: '2026-07-14',
    Content: PhaenoConfigurationAndRecovery,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'statuses-and-recovery',
    title: 'Statuses and recovery',
    summary: 'Triage operational states and safely recover integrations, files, releases, and notifications.',
    section: 'Support',
    order: 60,
    reviewedAt: '2026-07-14',
    Content: PhaenoStatusesAndRecovery,
  },
] as const

export function isDocumentationAudience(
  value: string,
): value is DocumentationAudience {
  return documentationAudienceKeys.includes(value as DocumentationAudience)
}

export function getDocumentationEntries(
  audience: DocumentationAudience,
  locale: ExternalDocumentationLocale = defaultExternalDocumentationLocale,
) {
  return documentationEntries
    .filter(
      (entry) =>
        entry.audience === audience &&
        (entry.locale === null || entry.locale === locale),
    )
    .sort((left, right) => left.order - right.order)
}

export function getDocumentationEntry(
  audience: DocumentationAudience,
  slug: string,
  locale: ExternalDocumentationLocale = defaultExternalDocumentationLocale,
) {
  return documentationEntries.find(
    (entry) =>
      entry.audience === audience &&
      entry.slug === slug &&
      (entry.locale === null || entry.locale === locale),
  )
}

export function getDocumentationSearchIdentity(entry: DocumentationEntry) {
  return entry.locale
    ? `${entry.audience}/${entry.locale}/${entry.slug}`
    : `${entry.audience}/${entry.slug}`
}
