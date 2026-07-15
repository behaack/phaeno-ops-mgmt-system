export const externalDocumentationLocales = ['en-US'] as const

export type ExternalDocumentationLocale =
  (typeof externalDocumentationLocales)[number]

export const defaultExternalDocumentationLocale: ExternalDocumentationLocale =
  'en-US'

const documentationMessagesByLocale = {
  'en-US': {
    helpCenter: 'Help center',
    guides: 'Guides',
    documentation: 'Documentation',
    documentationAudience: 'Documentation audience',
    previousAndNextGuides: 'Previous and next guides',
    viewGuidesAs: 'View guides as',
    previous: 'Previous',
    next: 'Next',
    guideNotFound: 'Guide not found',
    documentationUnavailable: 'Documentation unavailable',
    missingGuideDescription:
      'This guide does not exist or is not available for the selected organization.',
    unavailableDescription:
      'Select an active Customer, Partner, or Phaeno organization to open its guides.',
    documentationHeading: (audienceLabel: string) =>
      `${audienceLabel} documentation`,
    guidesNavigationLabel: (audienceLabel: string) =>
      `${audienceLabel} guides`,
    reviewed: (formattedDate: string) => `Reviewed ${formattedDate}`,
    audiences: {
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
