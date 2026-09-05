import { documentationCatalog, type DocumentationMetadata } from './documentation-metadata'
import PhaenoTrialProjects from '#/content/docs/phaeno/trial-projects.mdx'
import PartnerTrialHistory from '#/content/docs/en-US/partner/trial-history.mdx'
import CustomerTrialHistory from '#/content/docs/en-US/customer/trial-history.mdx'
import ProspectTrialProjects from '#/content/docs/en-US/prospect/trial-projects.mdx'
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

export type DocumentationEntry = DocumentationMetadata & {
  section: string
  Content: DocumentationContent
}

const documentationComponents: Record<string, DocumentationContent> = {
  'phaeno/trial-projects': PhaenoTrialProjects,
  'partner/en-US/trial-history': PartnerTrialHistory,
  'customer/en-US/trial-history': CustomerTrialHistory,
  'prospect/en-US/trial-projects': ProspectTrialProjects,
  'prospect/en-US/getting-started': ProspectGettingStarted,
  'prospect/en-US/account-and-access': ProspectAccountAndAccess,
  'prospect/en-US/sample-shipping': ProspectSampleShipping,
  'prospect/en-US/data-library': ProspectDataLibrary,
  'prospect/en-US/data-governance-and-downloads': ProspectDataGovernanceAndDownloads,
  'prospect/en-US/organization-and-transition': ProspectOrganizationAndTransition,
  'prospect/en-US/statuses-and-troubleshooting': ProspectStatusesAndTroubleshooting,
  'customer/en-US/getting-started': CustomerGettingStarted,
  'customer/en-US/account-and-access': CustomerAccountAndAccess,
  'customer/en-US/lab-services': CustomerLabServices,
  'customer/en-US/sample-shipping': CustomerSampleShipping,
  'customer/en-US/results-and-billing': CustomerResultsAndBilling,
  'customer/en-US/data-and-organization': CustomerDataAndOrganization,
  'customer/en-US/statuses-and-troubleshooting': CustomerStatusesAndTroubleshooting,
  'partner/en-US/getting-started': PartnerGettingStarted,
  'partner/en-US/account-and-access': PartnerAccountAndAccess,
  'partner/en-US/reagent-orders': PartnerReagentOrders,
  'partner/en-US/data-assembly': PartnerDataAssembly,
  'partner/en-US/data-and-organization': PartnerDataAndOrganization,
  'partner/en-US/statuses-and-troubleshooting': PartnerStatusesAndTroubleshooting,
  'phaeno/getting-started': PhaenoGettingStarted,
  'phaeno/crm': PhaenoCrm,
  'phaeno/crm-companies-contacts': PhaenoCrmCompaniesContacts,
  'phaeno/crm-leads-conversion': PhaenoCrmLeadsConversion,
  'phaeno/crm-opportunities-pipelines': PhaenoCrmOpportunitiesPipelines,
  'phaeno/crm-activities-tasks': PhaenoCrmActivitiesTasks,
  'phaeno/crm-reports-administration': PhaenoCrmReportsAdministration,
  'phaeno/crm-portal-handoffs': PhaenoCrmPortalHandoffs,
  'phaeno/crm-troubleshooting': PhaenoCrmTroubleshooting,
  'phaeno/organization-and-user-administration': PhaenoOrganizationAndUserAdministration,
  'phaeno/data-provisioning-and-accounts': PhaenoDataProvisioningAndAccounts,
  'phaeno/data-source-registry': PhaenoDataSourceRegistry,
  'phaeno/data-curated-publishing': PhaenoDataCuratedPublishing,
  'phaeno/data-organization-grants': PhaenoDataOrganizationGrants,
  'phaeno/data-governance-recovery': PhaenoDataGovernanceRecovery,
  'phaeno/order-operations': PhaenoOrderOperations,
  'phaeno/order-customer-lab-authorization': PhaenoOrderCustomerLabAuthorization,
  'phaeno/order-reagent-fulfillment': PhaenoOrderReagentFulfillment,
  'phaeno/order-data-assembly': PhaenoOrderDataAssembly,
  'phaeno/order-holds-cancellations-adjustments': PhaenoOrderHoldsCancellationsAdjustments,
  'phaeno/order-billing-payment-release': PhaenoOrderBillingPaymentRelease,
  'phaeno/order-integration-recovery': PhaenoOrderIntegrationRecovery,
  'phaeno/lab-operations': PhaenoLabOperations,
  'phaeno/lab-receipt-accession': PhaenoLabReceiptAccession,
  'phaeno/lab-protocol-execution': PhaenoLabProtocolExecution,
  'phaeno/lab-materials-equipment': PhaenoLabMaterialsEquipment,
  'phaeno/lab-libraries-batches-sequencing': PhaenoLabLibrariesBatchesSequencing,
  'phaeno/lab-exceptions-rework': PhaenoLabExceptionsRework,
  'phaeno/lab-scientific-approval': PhaenoLabScientificApproval,
  'phaeno/configuration-and-recovery': PhaenoConfigurationAndRecovery,
  'phaeno/statuses-and-recovery': PhaenoStatusesAndRecovery,
}

export const documentationEntries: readonly DocumentationEntry[] = documentationCatalog.guides
  .filter((entry) => entry.publicationStatus === 'published')
  .map((entry) => ({
    ...entry,
    section: documentationCatalog.taxonomy.navigationGroups[entry.navigationGroup]['en-US'],
    Content: documentationComponents[getDocumentationSearchIdentity(entry)],
  }))

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

export function getDocumentationSearchIdentity(entry: Pick<DocumentationMetadata, 'audience' | 'locale' | 'slug'>) {
  return entry.locale
    ? `${entry.audience}/${entry.locale}/${entry.slug}`
    : `${entry.audience}/${entry.slug}`
}
