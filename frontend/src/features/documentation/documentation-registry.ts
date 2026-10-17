import { documentationCatalog, type DocumentationMetadata } from './documentation-metadata'
import { lazy, type ComponentType, type ElementType } from 'react'
import { useCustomerSourceText } from '#/features/customer-i18n/customer-text'

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
  'phaeno/how-to-record-research': lazy(() => import('#/content/docs/phaeno/how-to-record-research.mdx')),
  'phaeno/research-notebooks': lazy(() => import('#/content/docs/phaeno/research-notebooks.mdx')),
  'phaeno/how-to-onboard-customer': lazy(() => import('#/content/docs/phaeno/how-to-onboard-customer.mdx')),
  'phaeno/how-to-place-customer-order': lazy(() => import('#/content/docs/phaeno/how-to-place-customer-order.mdx')),
  'phaeno/how-to-configure-samples-shipping': lazy(() => import('#/content/docs/phaeno/how-to-configure-samples-shipping.mdx')),
  'phaeno/how-to-lab-protocol': lazy(() => import('#/content/docs/phaeno/how-to-lab-protocol.mdx')),
  'phaeno/trial-projects': lazy(() => import('#/content/docs/phaeno/trial-projects.mdx')),
  'partner/en-US/trial-history': lazy(() => import('#/content/docs/en-US/partner/trial-history.mdx')),
  'customer/en-US/trial-history': lazy(() => import('#/content/docs/en-US/customer/trial-history.mdx')),
  'prospect/en-US/trial-projects': lazy(() => import('#/content/docs/en-US/prospect/trial-projects.mdx')),
  'prospect/en-US/getting-started': lazy(() => import('#/content/docs/en-US/prospect/getting-started.mdx')),
  'prospect/en-US/account-and-access': lazy(() => import('#/content/docs/en-US/prospect/account-and-access.mdx')),
  'prospect/en-US/sample-shipping': lazy(() => import('#/content/docs/en-US/prospect/sample-shipping.mdx')),
  'prospect/en-US/data-library': lazy(() => import('#/content/docs/en-US/prospect/data-library.mdx')),
  'prospect/en-US/data-governance-and-downloads': lazy(() => import('#/content/docs/en-US/prospect/data-governance-and-downloads.mdx')),
  'prospect/en-US/organization-and-transition': lazy(() => import('#/content/docs/en-US/prospect/organization-and-transition.mdx')),
  'prospect/en-US/statuses-and-troubleshooting': lazy(() => import('#/content/docs/en-US/prospect/statuses-and-troubleshooting.mdx')),
  'customer/en-US/getting-started': lazy(() => import('#/content/docs/en-US/customer/getting-started.mdx')),
  'customer/en-US/account-and-access': lazy(() => import('#/content/docs/en-US/customer/account-and-access.mdx')),
  'customer/en-US/lab-services': lazy(() => import('#/content/docs/en-US/customer/lab-services.mdx')),
  'customer/en-US/sample-shipping': lazy(() => import('#/content/docs/en-US/customer/sample-shipping.mdx')),
  'customer/en-US/results-and-billing': lazy(() => import('#/content/docs/en-US/customer/results-and-billing.mdx')),
  'customer/en-US/data-and-organization': lazy(() => import('#/content/docs/en-US/customer/data-and-organization.mdx')),
  'customer/en-US/statuses-and-troubleshooting': lazy(() => import('#/content/docs/en-US/customer/statuses-and-troubleshooting.mdx')),
  'partner/en-US/getting-started': lazy(() => import('#/content/docs/en-US/partner/getting-started.mdx')),
  'partner/en-US/account-and-access': lazy(() => import('#/content/docs/en-US/partner/account-and-access.mdx')),
  'partner/en-US/lab-services': lazy(() => import('#/content/docs/en-US/partner/lab-services.mdx')),
  'partner/en-US/reagent-orders': lazy(() => import('#/content/docs/en-US/partner/reagent-orders.mdx')),
  'partner/en-US/data-assembly': lazy(() => import('#/content/docs/en-US/partner/data-assembly.mdx')),
  'partner/en-US/data-and-organization': lazy(() => import('#/content/docs/en-US/partner/data-and-organization.mdx')),
  'partner/en-US/statuses-and-troubleshooting': lazy(() => import('#/content/docs/en-US/partner/statuses-and-troubleshooting.mdx')),
  'phaeno/getting-started': lazy(() => import('#/content/docs/phaeno/getting-started.mdx')),
  'phaeno/crm': lazy(() => import('#/content/docs/phaeno/crm.mdx')),
  'phaeno/crm-companies-contacts': lazy(() => import('#/content/docs/phaeno/crm-companies-contacts.mdx')),
  'phaeno/crm-leads-conversion': lazy(() => import('#/content/docs/phaeno/crm-leads-conversion.mdx')),
  'phaeno/crm-opportunities-pipelines': lazy(() => import('#/content/docs/phaeno/crm-opportunities-pipelines.mdx')),
  'phaeno/crm-activities-tasks': lazy(() => import('#/content/docs/phaeno/crm-activities-tasks.mdx')),
  'phaeno/crm-reports-administration': lazy(() => import('#/content/docs/phaeno/crm-reports-administration.mdx')),
  'phaeno/crm-portal-handoffs': lazy(() => import('#/content/docs/phaeno/crm-portal-handoffs.mdx')),
  'phaeno/crm-troubleshooting': lazy(() => import('#/content/docs/phaeno/crm-troubleshooting.mdx')),
  'phaeno/organization-and-user-administration': lazy(() => import('#/content/docs/phaeno/organization-and-user-administration.mdx')),
  'phaeno/data-provisioning-and-accounts': lazy(() => import('#/content/docs/phaeno/data-provisioning-and-accounts.mdx')),
  'phaeno/data-source-registry': lazy(() => import('#/content/docs/phaeno/data-source-registry.mdx')),
  'phaeno/data-curated-publishing': lazy(() => import('#/content/docs/phaeno/data-curated-publishing.mdx')),
  'phaeno/data-organization-grants': lazy(() => import('#/content/docs/phaeno/data-organization-grants.mdx')),
  'phaeno/data-governance-recovery': lazy(() => import('#/content/docs/phaeno/data-governance-recovery.mdx')),
  'phaeno/order-operations': lazy(() => import('#/content/docs/phaeno/order-operations.mdx')),
  'phaeno/order-customer-lab-authorization': lazy(() => import('#/content/docs/phaeno/order-customer-lab-authorization.mdx')),
  'phaeno/order-reagent-fulfillment': lazy(() => import('#/content/docs/phaeno/order-reagent-fulfillment.mdx')),
  'phaeno/order-data-assembly': lazy(() => import('#/content/docs/phaeno/order-data-assembly.mdx')),
  'phaeno/order-holds-cancellations-adjustments': lazy(() => import('#/content/docs/phaeno/order-holds-cancellations-adjustments.mdx')),
  'phaeno/order-billing-payment-release': lazy(() => import('#/content/docs/phaeno/order-billing-payment-release.mdx')),
  'phaeno/order-integration-recovery': lazy(() => import('#/content/docs/phaeno/order-integration-recovery.mdx')),
  'phaeno/lab-operations': lazy(() => import('#/content/docs/phaeno/lab-operations.mdx')),
  'phaeno/lab-receipt-accession': lazy(() => import('#/content/docs/phaeno/lab-receipt-accession.mdx')),
  'phaeno/lab-protocol-execution': lazy(() => import('#/content/docs/phaeno/lab-protocol-execution.mdx')),
  'phaeno/lab-materials-equipment': lazy(() => import('#/content/docs/phaeno/lab-materials-equipment.mdx')),
  'phaeno/lab-libraries-batches-sequencing': lazy(() => import('#/content/docs/phaeno/lab-libraries-batches-sequencing.mdx')),
  'phaeno/lab-exceptions-rework': lazy(() => import('#/content/docs/phaeno/lab-exceptions-rework.mdx')),
  'phaeno/lab-scientific-approval': lazy(() => import('#/content/docs/phaeno/lab-scientific-approval.mdx')),
  'phaeno/configuration-and-recovery': lazy(() => import('#/content/docs/phaeno/configuration-and-recovery.mdx')),
  'phaeno/statuses-and-recovery': lazy(() => import('#/content/docs/phaeno/statuses-and-recovery.mdx')),
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

export function useDocumentationEntries(audience: DocumentationAudience | null | undefined) {
  const text = useCustomerSourceText()
  return (audience ? getDocumentationEntries(audience) : []).map(entry => ({ ...entry, title: text(entry.title),
    summary: text(entry.summary), section: text(entry.section), overviewTitle: entry.overviewTitle ? text(entry.overviewTitle) : undefined }))
}
