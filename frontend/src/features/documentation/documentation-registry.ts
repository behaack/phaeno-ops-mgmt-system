import type { ComponentType, ElementType } from 'react'

import CustomerAccountAndAccess from '#/content/docs/en-US/customer/account-and-access.mdx'
import CustomerDataAndOrganization from '#/content/docs/en-US/customer/data-and-organization.mdx'
import CustomerGettingStarted from '#/content/docs/en-US/customer/getting-started.mdx'
import CustomerLabServices from '#/content/docs/en-US/customer/lab-services.mdx'
import CustomerResultsAndBilling from '#/content/docs/en-US/customer/results-and-billing.mdx'
import CustomerSampleShipping from '#/content/docs/en-US/customer/sample-shipping.mdx'
import CustomerStatusesAndTroubleshooting from '#/content/docs/en-US/customer/statuses-and-troubleshooting.mdx'
import ProspectAccountAndAccess from '#/content/docs/en-US/prospect/account-and-access.mdx'
import ProspectDataGovernanceAndDownloads from '#/content/docs/en-US/prospect/data-governance-and-downloads.mdx'
import ProspectDataLibrary from '#/content/docs/en-US/prospect/data-library.mdx'
import ProspectGettingStarted from '#/content/docs/en-US/prospect/getting-started.mdx'
import ProspectOrganizationAndTransition from '#/content/docs/en-US/prospect/organization-and-transition.mdx'
import ProspectSampleShipping from '#/content/docs/en-US/prospect/sample-shipping.mdx'
import ProspectStatusesAndTroubleshooting from '#/content/docs/en-US/prospect/statuses-and-troubleshooting.mdx'
import PartnerAccountAndAccess from '#/content/docs/en-US/partner/account-and-access.mdx'
import PartnerDataAndOrganization from '#/content/docs/en-US/partner/data-and-organization.mdx'
import PartnerDataAssembly from '#/content/docs/en-US/partner/data-assembly.mdx'
import PartnerGettingStarted from '#/content/docs/en-US/partner/getting-started.mdx'
import PartnerReagentOrders from '#/content/docs/en-US/partner/reagent-orders.mdx'
import PartnerStatusesAndTroubleshooting from '#/content/docs/en-US/partner/statuses-and-troubleshooting.mdx'
import PhaenoConfigurationAndRecovery from '#/content/docs/phaeno/configuration-and-recovery.mdx'
import PhaenoCrm from '#/content/docs/phaeno/crm.mdx'
import PhaenoCrmActivitiesTasks from '#/content/docs/phaeno/crm-activities-tasks.mdx'
import PhaenoCrmCompaniesContacts from '#/content/docs/phaeno/crm-companies-contacts.mdx'
import PhaenoCrmLeadsConversion from '#/content/docs/phaeno/crm-leads-conversion.mdx'
import PhaenoCrmOpportunitiesPipelines from '#/content/docs/phaeno/crm-opportunities-pipelines.mdx'
import PhaenoCrmPortalHandoffs from '#/content/docs/phaeno/crm-portal-handoffs.mdx'
import PhaenoCrmReportsAdministration from '#/content/docs/phaeno/crm-reports-administration.mdx'
import PhaenoCrmTroubleshooting from '#/content/docs/phaeno/crm-troubleshooting.mdx'
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
    reviewedAt: '2026-08-19',
    Content: ProspectGettingStarted,
  },
  {
    audience: 'prospect',
    locale: 'en-US',
    slug: 'account-and-access',
    title: 'Account and access',
    summary:
      'Accept invitations, complete MFA, confirm the current organization, understand roles, and resolve access problems.',
    section: 'Basics',
    order: 20,
    reviewedAt: '2026-08-29',
    Content: ProspectAccountAndAccess,
  },
  {
    audience: 'prospect',
    locale: 'en-US',
    slug: 'sample-shipping',
    title: 'Prepare and ship samples',
    summary:
      'Associate Phaeno-supplied tube barcodes with your sample identifiers, retain the crosswalk, and ship an authorized Trial Project package.',
    section: 'Trial Project',
    order: 25,
    reviewedAt: '2026-08-18',
    Content: ProspectSampleShipping,
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
    reviewedAt: '2026-08-29',
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
    reviewedAt: '2026-08-20',
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
    reviewedAt: '2026-08-20',
    Content: CustomerGettingStarted,
  },
  {
    audience: 'customer',
    locale: 'en-US',
    slug: 'account-and-access',
    title: 'Account and access',
    summary: 'Accept invitations, complete MFA, confirm the current organization, understand roles, and resolve access problems.',
    section: 'Basics',
    order: 20,
    reviewedAt: '2026-08-29',
    Content: CustomerAccountAndAccess,
  },
  {
    audience: 'customer',
    locale: 'en-US',
    slug: 'lab-services',
    title: 'Request laboratory services',
    summary: 'Price a Job from its sample profile, then enter or import, finalize, and ship its sample list.',
    section: 'Laboratory work',
    order: 30,
    reviewedAt: '2026-08-29',
    Content: CustomerLabServices,
  },
  {
    audience: 'customer',
    locale: 'en-US',
    slug: 'sample-shipping',
    title: 'Prepare and ship samples',
    summary:
      'Match each Phaeno-supplied tube to a finalized sample tube slot, retain the crosswalk, and ship the package.',
    section: 'Laboratory work',
    order: 35,
    reviewedAt: '2026-08-22',
    Content: CustomerSampleShipping,
  },
  {
    audience: 'customer',
    locale: 'en-US',
    slug: 'results-and-billing',
    title: 'Results and billing',
    summary: 'Understand governed sample-level result release and POMS invoices, payments, and adjustments.',
    section: 'Laboratory work',
    order: 40,
    reviewedAt: '2026-08-29',
    Content: CustomerResultsAndBilling,
  },
  {
    audience: 'customer',
    locale: 'en-US',
    slug: 'data-and-organization',
    title: 'Data Library and organization access',
    summary: 'Use released lab-job data, assigned curated packages, and Customer organization access.',
    section: 'Data and access',
    order: 50,
    reviewedAt: '2026-08-20',
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
    reviewedAt: '2026-08-26',
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
    reviewedAt: '2026-08-19',
    Content: PartnerGettingStarted,
  },
  {
    audience: 'partner',
    locale: 'en-US',
    slug: 'account-and-access',
    title: 'Account and access',
    summary: 'Accept invitations, complete MFA, confirm the current Partner, understand roles, and resolve access problems.',
    section: 'Basics',
    order: 20,
    reviewedAt: '2026-08-20',
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
    reviewedAt: '2026-08-26',
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
    reviewedAt: '2026-08-26',
    Content: PartnerDataAssembly,
  },
  {
    audience: 'partner',
    locale: 'en-US',
    slug: 'data-and-organization',
    title: 'Data Library, billing, and organization access',
    summary: 'Use curated data, understand commercial records, and manage Partner membership.',
    section: 'Data and access',
    order: 50,
    reviewedAt: '2026-08-26',
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
    reviewedAt: '2026-08-26',
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
    reviewedAt: '2026-08-27',
    Content: PhaenoGettingStarted,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'crm',
    overviewTitle: 'Overview and navigation',
    title: 'Customer relationship management',
    summary: 'Manage Companies, Contacts, Leads, Opportunities, Activities, Tasks, reporting, data quality, and reviewed Portal handoffs.',
    section: 'Customer relationship management',
    order: 15,
    reviewedAt: '2026-08-27',
    Content: PhaenoCrm,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'crm-companies-contacts',
    parentSlug: 'crm',
    title: 'Companies and Contacts',
    summary: 'Create durable relationship records, manage effective-dated associations, and resolve duplicates safely.',
    section: 'Customer relationship management',
    order: 16,
    reviewedAt: '2026-08-27',
    Content: PhaenoCrmCompaniesContacts,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'crm-leads-conversion',
    parentSlug: 'crm',
    title: 'Leads and conversion',
    summary: 'Capture signals, record qualification decisions, and convert without granting Portal access.',
    section: 'Customer relationship management',
    order: 17,
    reviewedAt: '2026-08-27',
    Content: PhaenoCrmLeadsConversion,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'crm-opportunities-pipelines',
    parentSlug: 'crm',
    title: 'Opportunities and pipelines',
    summary: 'Run commercial pursuits through controlled stages, immutable history, and currency-safe reporting.',
    section: 'Customer relationship management',
    order: 18,
    reviewedAt: '2026-08-27',
    Content: PhaenoCrmOpportunitiesPipelines,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'crm-activities-tasks',
    parentSlug: 'crm',
    title: 'Activities and Tasks',
    summary: 'Record commercial interactions and manage owned, recurring follow-up in record context.',
    section: 'Customer relationship management',
    order: 19,
    reviewedAt: '2026-08-27',
    Content: PhaenoCrmActivitiesTasks,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'crm-reports-administration',
    parentSlug: 'crm',
    title: 'Reports and administration',
    summary: 'Interpret commercial reports and manage pipelines, fields, views, duplicates, imports, and exports.',
    section: 'Customer relationship management',
    order: 20,
    reviewedAt: '2026-08-27',
    Content: PhaenoCrmReportsAdministration,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'crm-portal-handoffs',
    parentSlug: 'crm',
    title: 'Portal handoffs and account links',
    summary: 'Send commercial context into reviewed Portal workflows without creating access or work.',
    section: 'Customer relationship management',
    order: 21,
    reviewedAt: '2026-08-27',
    Content: PhaenoCrmPortalHandoffs,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'crm-troubleshooting',
    parentSlug: 'crm',
    title: 'Troubleshooting and recovery',
    summary: 'Resolve access, duplicate, stale-update, conversion, stage, import, Task, and handoff problems safely.',
    section: 'Customer relationship management',
    order: 22,
    reviewedAt: '2026-08-27',
    Content: PhaenoCrmTroubleshooting,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'organization-and-user-administration',
    title: 'Organization and user administration',
    summary: 'Manage organizations, Portal requests, readiness, service entitlements, invitations, and access.',
    section: 'Platform operations',
    order: 25,
    reviewedAt: '2026-08-27',
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
    reviewedAt: '2026-08-29',
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
    summary: 'Operate staging, attention, governed PSeq release, native AR, Customer lab, and Partner workflows.',
    section: 'Order operations',
    order: 40,
    reviewedAt: '2026-08-29',
    Content: PhaenoOrderOperations,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'order-customer-lab-authorization',
    parentSlug: 'order-operations',
    title: 'Customer lab authorization',
    summary: 'Review Job pricing profiles, issue POMS quotes, and authorize Lab work after roster finalization.',
    section: 'Order operations',
    order: 41,
    reviewedAt: '2026-08-27',
    Content: PhaenoOrderCustomerLabAuthorization,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'order-reagent-fulfillment',
    parentSlug: 'lab-operations',
    title: 'PSeq kit fulfillment',
    summary: 'Consume the Commercial order snapshot, manage substitutions and backorders, and ship immutably.',
    section: 'Laboratory operations',
    order: 52,
    reviewedAt: '2026-08-27',
    Content: PhaenoOrderReagentFulfillment,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'order-data-assembly',
    parentSlug: 'lab-operations',
    title: 'Data assembly',
    summary: 'Validate accepted inputs, record processing, and approve immutable output releases.',
    section: 'Laboratory operations',
    order: 53,
    reviewedAt: '2026-08-27',
    Content: PhaenoOrderDataAssembly,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'order-holds-cancellations-adjustments',
    parentSlug: 'order-operations',
    title: 'Holds, cancellations, and adjustments',
    summary: 'Pause work safely, decide cancellation requests, preserve completed work, and account for adjustments.',
    section: 'Order operations',
    order: 44,
    reviewedAt: '2026-08-26',
    Content: PhaenoOrderHoldsCancellationsAdjustments,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'order-billing-payment-release',
    parentSlug: 'order-operations',
    title: 'PSeq billing, cash, and result release',
    summary: 'Operate POMS invoices, receipts, allocation, reconciliation, and scientifically governed PSeq release.',
    section: 'Order operations',
    order: 45,
    reviewedAt: '2026-08-29',
    Content: PhaenoOrderBillingPaymentRelease,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'order-integration-recovery',
    parentSlug: 'order-operations',
    title: 'Integration failures and recovery',
    summary: 'Triage invitation, projection, result-pipeline, notification, and retained legacy-connector failures.',
    section: 'Order operations',
    order: 46,
    reviewedAt: '2026-08-29',
    Content: PhaenoOrderIntegrationRecovery,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'lab-operations',
    overviewTitle: 'Overview',
    title: 'Laboratory operations',
    summary: 'Fulfill kits, receive and accession specimens, execute controlled work, assemble data, and record release readiness.',
    section: 'Laboratory operations',
    order: 50,
    reviewedAt: '2026-08-27',
    Content: PhaenoLabOperations,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'lab-receipt-accession',
    parentSlug: 'lab-operations',
    title: 'Receipt and accession',
    summary: 'Record physical receipt, supplier or POMS barcode accession, intake decisions, and container lineage.',
    section: 'Laboratory operations',
    order: 51,
    reviewedAt: '2026-08-27',
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
    order: 54,
    reviewedAt: '2026-07-18',
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
    order: 55,
    reviewedAt: '2026-08-26',
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
    order: 56,
    reviewedAt: '2026-07-18',
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
    order: 57,
    reviewedAt: '2026-08-26',
    Content: PhaenoLabExceptionsRework,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'lab-scientific-approval',
    parentSlug: 'lab-operations',
    title: 'Scientific approval and release readiness',
    summary: 'Review complete lineage and clean final artifacts, enforce actor separation, and pin the approved package.',
    section: 'Laboratory operations',
    order: 58,
    reviewedAt: '2026-08-29',
    Content: PhaenoLabScientificApproval,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'configuration-and-recovery',
    title: 'Configuration and accounting recovery',
    summary: 'Maintain scientific, commercial, accounting, credit, and sample-shipping rules.',
    section: 'Platform operations',
    order: 60,
    reviewedAt: '2026-08-27',
    Content: PhaenoConfigurationAndRecovery,
  },
  {
    audience: 'phaeno',
    locale: null,
    slug: 'statuses-and-recovery',
    title: 'Statuses and recovery',
    summary: 'Triage operational states and safely recover accounting records, files, releases, and notifications.',
    section: 'Support',
    order: 70,
    reviewedAt: '2026-08-26',
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
