export const externalDocumentationLocales = ['en-US'] as const

export type ExternalDocumentationLocale =
  (typeof externalDocumentationLocales)[number]

export const defaultExternalDocumentationLocale: ExternalDocumentationLocale =
  'en-US'

const documentationMessagesByLocale = {
  'en-US': {
    search: {
      label: 'Search documentation', submit: 'Search guides',
      placeholder: 'Search by task, topic, or keyword',
      hint: 'Search guides for your current organization. Use at least 2 characters, or choose a filter.',
      filters: 'Filters', topic: 'Topic', workflow: 'Workflow', contentType: 'Guide type', all: 'All',
      clearFilters: 'Clear filters', unknownFilter: 'Unavailable filter',
      results: 'Documentation search', loading: 'Searching guides…',
      initial: 'Enter a task or keyword, or select a topic or workflow.',
      count: (count: number) => `${count} ${count === 1 ? 'guide' : 'guides'} found`,
      changed: 'Documentation has been updated. Refresh this page to search the current guides. If the update is still in progress, you can continue browsing guides.',
      invalid: 'Use 2 to 200 characters and valid documentation filters.',
      denied: 'Select an active organization to search its documentation.',
      unavailable: 'Documentation search is temporarily unavailable. Try again, or browse the guides below.',
      refresh: 'Refresh page', retry: 'Try again',
      noMatches: 'No guides matched. Try fewer words, another term, or clear the filters.',
      pagination: 'Search result pages', previous: 'Previous', next: 'Next',
      page: (page: number, total: number) => `Page ${page} of ${total}`,
      browseAll: 'Browse all guides', browse: 'Browse by topic', related: 'Related guides',
    },
    helpCenter: 'Help center',
    guides: 'Guides',
    documentation: 'Documentation',
    previousAndNextGuides: 'Previous and next guides',
    previous: 'Previous',
    next: 'Next',
    guideNotFound: 'Guide not found',
    documentationUnavailable: 'Documentation unavailable',
    missingGuideDescription:
      'This guide does not exist or is not available for the selected organization.',
    unavailableDescription:
      'Select an active Prospect, Customer, Partner, or Phaeno organization to open its guides.',
    documentationHeading: (audienceLabel: string) =>
      `${audienceLabel} documentation`,
    reviewed: (formattedDate: string) => `Reviewed ${formattedDate}`,
    audiences: {
      prospect: {
        label: 'Prospect',
        description:
          'Granted curated data, downloads, governance, organization access, and support.',
      },
      customer: {
        label: 'Customer',
        description:
          'Laboratory requests, sample progress, results, billing, data, and organization access.',
      },
      partner: {
        label: 'Partner',
        description:
          'Reagent orders, data assembly, commercial documents, data, and organization access.',
      },
      phaeno: {
        label: 'Phaeno',
        description:
          'Platform operations, provisioning, order workflows, configuration, and support.',
      },
    },
  },
} as const

export function getDocumentationMessages(
  locale: ExternalDocumentationLocale = defaultExternalDocumentationLocale,
) {
  return documentationMessagesByLocale[locale]
}
