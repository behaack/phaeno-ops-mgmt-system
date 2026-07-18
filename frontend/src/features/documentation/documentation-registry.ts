import type { ComponentType, ElementType } from 'react'

import CustomerAccountAndAccess from '#/content/docs/en-US/customer/account-and-access.mdx'
import CustomerDataAndOrganization from '#/content/docs/en-US/customer/data-and-organization.mdx'
import CustomerGettingStarted from '#/content/docs/en-US/customer/getting-started.mdx'
import CustomerLabServices from '#/content/docs/en-US/customer/lab-services.mdx'
import CustomerResultsAndBilling from '#/content/docs/en-US/customer/results-and-billing.mdx'
import CustomerStatusesAndTroubleshooting from '#/content/docs/en-US/customer/statuses-and-troubleshooting.mdx'
import ProspectAccountAndAccess from '#/content/docs/en-US/prospect/account-and-access.mdx'
import ProspectDataGovernanceAndDownloads from '#/content/docs/en-US/prospect/data-governance-and-downloads.mdx'
import ProspectDataLibrary from '#/content/docs/en-US/prospect/data-library.mdx'
import ProspectGettingStarted from '#/content/docs/en-US/prospect/getting-started.mdx'
import ProspectOrganizationAndTransition from '#/content/docs/en-US/prospect/organization-and-transition.mdx'
import ProspectStatusesAndTroubleshooting from '#/content/docs/en-US/prospect/statuses-and-troubleshooting.mdx'
import PartnerAccountAndAccess from '#/content/docs/en-US/partner/account-and-access.mdx'
import PartnerDataAndOrganization from '#/content/docs/en-US/partner/data-and-organization.mdx'
import PartnerDataAssembly from '#/content/docs/en-US/partner/data-assembly.mdx'
import PartnerGettingStarted from '#/content/docs/en-US/partner/getting-started.mdx'
import PartnerReagentOrders from '#/content/docs/en-US/partner/reagent-orders.mdx'
import PartnerStatusesAndTroubleshooting from '#/content/docs/en-US/partner/statuses-and-troubleshooting.mdx'
import PhaenoConfigurationAndRecovery from '#/content/docs/phaeno/configuration-and-recovery.mdx'
import PhaenoDataCuratedPublishing from '#/content/docs/phaeno/data-curated-publishing.mdx'
import PhaenoDataGovernanceRecovery from '#/content/docs/phaeno/data-governance-recovery.mdx'
import PhaenoDataOrganizationGrants from '#/content/docs/phaeno/data-organization-grants.mdx'
import PhaenoDataProvisioningAndAccounts from '#/content/docs/phaeno/data-provisioning-and-accounts.mdx'
import PhaenoDataSourceRegistry from '#/content/docs/phaeno/data-source-registry.mdx'
import PhaenoGettingStarted from '#/content/docs/phaeno/getting-started.mdx'
import PhaenoLabExceptionsRework from '#/content/docs/phaeno/lab-exceptions-rework.mdx'
import PhaenoLabLibrariesBatchesSequencing from '#/content/docs/phaeno/lab-libraries-batches-sequencing.mdx'
import PhaenoLabMaterialsEquipment from '#/content/docs/phaeno/lab-materials-equipment.mdx'
import PhaenoLabOperations from '#/content/docs/phaeno/lab-operations.mdx'
import PhaenoLabProtocolExecution from '#/content/docs/phaeno/lab-protocol-execution.mdx'
import PhaenoLabReceiptAccession from '#/content/docs/phaeno/lab-receipt-accession.mdx'
import PhaenoLabScientificApproval from '#/content/docs/phaeno/lab-scientific-approval.mdx'
import PhaenoOrderBillingPaymentRelease from '#/content/docs/phaeno/order-billing-payment-release.mdx'
import PhaenoOrderCustomerLabAuthorization from '#/content/docs/phaeno/order-customer-lab-authorization.mdx'
import PhaenoOrderDataAssembly from '#/content/docs/phaeno/order-data-assembly.mdx'
import PhaenoOrderHoldsCancellationsAdjustments from '#/content/docs/phaeno/order-holds-cancellations-adjustments.mdx'
import PhaenoOrderIntegrationRecovery from '#/content/docs/phaeno/order-integration-recovery.mdx'
import PhaenoOrderOperations from '#/content/docs/phaeno/order-operations.mdx'
import PhaenoOrderReagentFulfillment from '#/content/docs/phaeno/order-reagent-fulfillment.mdx'
import PhaenoOrganizationAndUserAdministration from '#/content/docs/phaeno/organization-and-user-administration.mdx'
import PhaenoStatusesAndRecovery from '#/content/docs/phaeno/statuses-and-recovery.mdx'
import {
  defaultExternalDocumentationLocale,
  type ExternalDocumentationLocale,
} from './documentation-localization'

export const documentationAudienceKeys = [
  'prospect',
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
  parentSlug?: string
  overviewTitle?: string
  title: string
  summary: string
  section: string
  order: number
  reviewedAt: string
  Content: DocumentationContent
}

export const documentationEntries: readonly DocumentationEntry[] = [
  {
    audience: 'prospect',
    locale: 'en-US',
    slug: 'getting-started',
    title: 'Getting started',
    summary:
      'Confirm the current organization, understand Prospect access, and find granted data.',
    section: 'Basics',
    order: 10,
    reviewedAt: '2026-07-16',
    Content: ProspectGettingStarted,
  },
  {
    audience: 'prospect',
    locale: 'en-US',
    slug: 'account-and-access',
    title: 'Account and access',
    summary:
      'Accept invitations, confirm the current organization, understand roles, and resolve access problems.',
    section: 'Basics',
    order: 20,
    reviewedAt: '2026-07-16',
    Content: ProspectAccountAndAccess,
  },
  {
    audience: 'prospect',
    locale: 'en-US',
    slug: 'data-library',
    title: 'Use the Data Library',
    summary:
      'Review explicitly granted package versions and verify file or archive downloads.',
    section: 'Data access',
    order: 30,
    reviewedAt: '2026-07-16',
    Content: ProspectDataLibrary,
  },
  {
    audience: 'prospect',
    locale: 'en-US',
    slug: 'data-governance-and-downloads',
    title: 'Data governance and downloads',
    summary:
      'Understand revocation, quarantine, retirement, download history, and safe governance responses.',
    section: 'Data access',
    order: 40,
    reviewedAt: '2026-07-16',
    Content: ProspectDataGovernanceAndDownloads,
  },
  {
    audience: 'prospect',
    locale: 'en-US',
    slug: 'organization-and-transition',
    title: 'Organization access and transition',
    summary:
      'Understand membership boundaries and what changes when Phaeno converts a Prospect relationship.',
    section: 'Organization',
    order: 50,
    reviewedAt: '2026-07-16',
    Content: ProspectOrganizationAndTransition,
  },
  {
    audience: 'prospect',
    locale: 'en-US',
    slug: 'statuses-and-troubleshooting',
    title: 'Statuses and troubleshooting',
    summary:
      'Resolve common grant, package, download, checksum, organization, and access problems.',
    section: 'Support',
    order: 60,
    reviewedAt: '2026-07-16',
    Content: ProspectStatusesAndTroubleshooting,
  },
  {
    audience: 'customer',
    locale: 'en-US',
    slug: 'getting-started',
    title: 'Getting started',
    summary: 'Confirm the current organization, understand access, and find Customer work.',
    section: 'Basics',
    order: 10,
    reviewedAt: '2026-07-16',
    Content: CustomerGettingStarted,
  },
  {
    audience: 'customer',
    locale: 'en-US',
    slug: 'account-and-access',
    title: 'Account and access',
    summary: 'Accept invitations, confirm the current organization, understand roles, and resolve access problems.',
    section: 'Basics',
    order: 20,
    reviewedAt: '2026-07-16',
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
    reviewedAt: '2026-07-16',
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
    reviewedAt: '2026-07-16',
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
    reviewedAt: '2026-07-16',
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
    reviewedAt: '2026-07-16',
    Content: CustomerStatusesAndTroubleshooting,
  },
  {
    audience: 'partner',
    locale: 'en-US',
    slug: 'getting-started',
    title: 'Getting started',
    summary: 'Confirm the current Partner, understand access, and find Partner work.',
    section: 'Basics',
    order: 10,
    reviewedAt: '2026-07-16',
    Content: PartnerGettingStarted,
  },
  {
    audience: 'partner',
    locale: 'en-US',
    slug: 'account-and-access',
    title: 'Account and access',
    summary: 'Accept invitations, confirm the current Partner, understand roles, and resolve access problems.',
    section: 'Basics',
    order: 20,
    reviewedAt: '2026-07-16',
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
    reviewedAt: '2026-07-16',
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
    reviewedAt: '2026-07-16',
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
    reviewedAt: '2026-07-16',
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
    reviewedAt: '2026-07-16',
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
    reviewedAt: '2026-07-17',
    Content: PhaenoGettingStarted,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'organization-and-user-administration',
    title: 'Organization and user administration',
    summary: 'Manage organizations, Portal requests, readiness, service entitlements, invitations, and access.',
    section: 'Platform operations',
    order: 20,
    reviewedAt: '2026-07-16',
    Content: PhaenoOrganizationAndUserAdministration,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'data-provisioning-and-accounts',
    overviewTitle: 'Overview and access',
    title: 'Data provisioning',
    summary: 'Manage Phaeno-owned sources, immutable packages, exact-version grants, and governance events.',
    section: 'Data provisioning',
    order: 30,
    reviewedAt: '2026-07-16',
    Content: PhaenoDataProvisioningAndAccounts,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'data-source-registry',
    parentSlug: 'data-provisioning-and-accounts',
    title: 'Source registry',
    summary: 'Register Phaeno-owned sources, managed files, evidence, and immutable ready revisions.',
    section: 'Data provisioning',
    order: 31,
    reviewedAt: '2026-07-16',
    Content: PhaenoDataSourceRegistry,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'data-curated-publishing',
    parentSlug: 'data-provisioning-and-accounts',
    title: 'Curated catalog and publishing',
    summary: 'Snapshot ready sources, validate complete packages, publish immutable versions, and retire safely.',
    section: 'Data provisioning',
    order: 32,
    reviewedAt: '2026-07-16',
    Content: PhaenoDataCuratedPublishing,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'data-organization-grants',
    parentSlug: 'data-provisioning-and-accounts',
    title: 'Organization grants',
    summary: 'Grant, upgrade, and revoke exact package versions without implicit access changes.',
    section: 'Data provisioning',
    order: 33,
    reviewedAt: '2026-07-16',
    Content: PhaenoDataOrganizationGrants,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'data-governance-recovery',
    parentSlug: 'data-provisioning-and-accounts',
    title: 'Governance and recovery',
    summary: 'Quarantine unsafe content, investigate with purpose, close out incidents, and retry safely.',
    section: 'Data provisioning',
    order: 34,
    reviewedAt: '2026-07-16',
    Content: PhaenoDataGovernanceRecovery,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'order-operations',
    overviewTitle: 'Overview and queue triage',
    title: 'Order operations',
    summary: 'Operate Customer lab, Partner PSeq kit, and Partner assembly workflows.',
    section: 'Order operations',
    order: 40,
    reviewedAt: '2026-07-17',
    Content: PhaenoOrderOperations,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'order-customer-lab-authorization',
    parentSlug: 'order-operations',
    title: 'Customer lab authorization',
    summary: 'Review Customer submissions, issue synchronized quotes, and create the Lab authorization safely.',
    section: 'Order operations',
    order: 41,
    reviewedAt: '2026-07-16',
    Content: PhaenoOrderCustomerLabAuthorization,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'order-reagent-fulfillment',
    parentSlug: 'order-operations',
    title: 'Partner reagent fulfillment',
    summary: 'Review negotiated order snapshots, manage substitutions and backorders, and ship immutably.',
    section: 'Order operations',
    order: 42,
    reviewedAt: '2026-07-16',
    Content: PhaenoOrderReagentFulfillment,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'order-data-assembly',
    parentSlug: 'order-operations',
    title: 'Partner data assembly',
    summary: 'Validate inputs, quote work, record processing, and approve immutable output releases.',
    section: 'Order operations',
    order: 43,
    reviewedAt: '2026-07-16',
    Content: PhaenoOrderDataAssembly,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'order-holds-cancellations-adjustments',
    parentSlug: 'order-operations',
    title: 'Holds, cancellations, and adjustments',
    summary: 'Pause work safely, decide cancellation requests, preserve completed work, and synchronize adjustments.',
    section: 'Order operations',
    order: 44,
    reviewedAt: '2026-07-16',
    Content: PhaenoOrderHoldsCancellationsAdjustments,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'order-billing-payment-release',
    parentSlug: 'order-operations',
    title: 'Billing, payment, and release gates',
    summary: 'Apply QuickBooks document, credit, payment, file, and readiness gates without conflating state.',
    section: 'Order operations',
    order: 45,
    reviewedAt: '2026-07-16',
    Content: PhaenoOrderBillingPaymentRelease,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'order-integration-recovery',
    parentSlug: 'order-operations',
    title: 'Integration failures and recovery',
    summary: 'Triage and safely retry durable QuickBooks and notification deliveries.',
    section: 'Order operations',
    order: 46,
    reviewedAt: '2026-07-16',
    Content: PhaenoOrderIntegrationRecovery,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'lab-operations',
    overviewTitle: 'Overview and access',
    title: 'Laboratory operations',
    summary: 'Accession specimens, execute controlled protocols, manage batches and sendouts, and record scientific release readiness.',
    section: 'Laboratory operations',
    order: 50,
    reviewedAt: '2026-07-16',
    Content: PhaenoLabOperations,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'lab-receipt-accession',
    parentSlug: 'lab-operations',
    title: 'Receipt and accession',
    summary: 'Record physical receipt, accession, labels, intake decisions, and container lineage.',
    section: 'Laboratory operations',
    order: 51,
    reviewedAt: '2026-07-16',
    Content: PhaenoLabReceiptAccession,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'lab-protocol-execution',
    parentSlug: 'lab-operations',
    title: 'Protocol control and execution',
    summary: 'Approve versioned protocols, pin assignments, capture controlled execution, and recover safely.',
    section: 'Laboratory operations',
    order: 52,
    reviewedAt: '2026-07-16',
    Content: PhaenoLabProtocolExecution,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'lab-materials-equipment',
    parentSlug: 'lab-operations',
    title: 'Materials and equipment',
    summary: 'Qualify lots and equipment, record consumption and use, and preserve traceability.',
    section: 'Laboratory operations',
    order: 53,
    reviewedAt: '2026-07-16',
    Content: PhaenoLabMaterialsEquipment,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'lab-libraries-batches-sequencing',
    parentSlug: 'lab-operations',
    title: 'Libraries, batches, and sequencing',
    summary: 'Prepare QC-approved libraries, build cross-order batches, and track sendout custody.',
    section: 'Laboratory operations',
    order: 54,
    reviewedAt: '2026-07-16',
    Content: PhaenoLabLibrariesBatchesSequencing,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'lab-exceptions-rework',
    parentSlug: 'lab-operations',
    title: 'Exceptions, rework, and cancellation',
    summary: 'Classify exceptions, preserve rework history, and respond safely to cancellation requests.',
    section: 'Laboratory operations',
    order: 55,
    reviewedAt: '2026-07-16',
    Content: PhaenoLabExceptionsRework,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'lab-scientific-approval',
    parentSlug: 'lab-operations',
    title: 'Scientific approval and release readiness',
    summary: 'Review complete lineage, record scientific approval, and publish the controlled readiness milestone.',
    section: 'Laboratory operations',
    order: 56,
    reviewedAt: '2026-07-16',
    Content: PhaenoLabScientificApproval,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'configuration-and-recovery',
    title: 'Configuration and integration recovery',
    summary: 'Maintain scientific and commercial rules and recover durable integrations.',
    section: 'Platform operations',
    order: 60,
    reviewedAt: '2026-07-17',
    Content: PhaenoConfigurationAndRecovery,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'statuses-and-recovery',
    title: 'Statuses and recovery',
    summary: 'Triage operational states and safely recover integrations, files, releases, and notifications.',
    section: 'Support',
    order: 70,
    reviewedAt: '2026-07-16',
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
