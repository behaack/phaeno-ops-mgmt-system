export interface PluralLabels {
  zero?: string
  one: string
  two?: string
  few?: string
  many?: string
  other: string
}

export interface ContactValidationMessages {
  firstNameRequired: string
  lastNameRequired: string
  organizationRequired: string
  emailRequired: string
  emailInvalid: string
  descriptionRequired: string
  maximum60: string
  maximum250: string
  maximum256: string
  maximum1000: string
}

export interface WebsiteMessages {
  skipToContent: string
  homeLabel: string
  mainNavigation: string
  mainMenu: string
  toggleMenu: string
  requestDemo: string
  requestDemoSegments: string[]
  navigation: {
    home: string
    technology: string
    pseqPlatform: string
    multiOmics: string
    whyIsoforms: string
    about: string
    aboutUs: string
    jobs: string
    media: string
    blog: string
    whitePapers: string
    contact: string
  }
  search: {
    open: string
    title: string
    label: string
    close: string
    placeholder: string
    empty: string
    keepTyping: string
    noMatches: string
    resultsHeading: string
    requestFailed: string
    serverError: string
    resultsFound: string
    resultLabels: PluralLabels
    matchLabels: PluralLabels
    resultTypes: Record<'White Paper' | 'Blog Post' | 'Web Page', string>
    linkedPdfMatch: string
  }
  language: {
    selectorLabel: string
    suggestionTitle: string
    suggestionBody: string
    accept: string
    dismiss: string
  }
  brand: {
    logoAlt: string
    bannerKicker: string
    copyright: string
  }
  social: {
    linkedInTitle: string
    linkedInLabel: string
    youTubeTitle: string
    youTubeLabel: string
  }
  team: {
    photoAlt: string
    linkedInTitle: string
    linkedInLabel: string
    titles: Record<string, string>
  }
  article: {
    backArrow: string
    viewPdf: string
    pdfNewTab: string
    pageLabels: PluralLabels
    version: string
    shareHeading: string
    shareOn: string
    opensNewTab: string
    shareByEmail: string
  }
  contact: {
    previewDisabled: string
    recaptchaUnavailable: string
    recaptchaTokenFailed: string
    recaptchaFailed: string
    duplicateEmail: string
    serverError: string
    unexpectedError: string
    networkError: string
    requestFailed: string
    firstName: string
    lastName: string
    organization: string
    email: string
    emailPlaceholder: string
    validation: ContactValidationMessages
    demo: {
      audience: string
      searchTitle: string
      searchSummary: string
      title: string
      introduction: string
      expectationsLabel: string
      expectations: string[]
      projectDescription: string
      projectPlaceholder: string
      projectHint: string
      replyTime: string
      submit: string
      success: string
    }
    updates: {
      eyebrow: string
      searchTitle: string
      searchSummary: string
      title: string
      introduction: string
      brochureOptIn: string
      privacyNote: string
      submit: string
      successWithBrochure: string
      success: string
    }
    recaptcha: {
      prefix: string
      privacyPolicy: string
      conjunction: string
      termsOfService: string
      suffix: string
    }
  }
  arabicPreview: {
    reviewNotice: string
    englishSource: string
    whitePaperSeries: string
    noPublishedContent: string
    backToWhitePapers: string
    downloadEnglishPdf: string
    englishPdfDisclosure: string
    pdfLanguageEnglish: string
  }
  footer: {
    resources: string
    siteMap: string
    follow: string
    jobs: string
    investors: string
    blog: string
    whitePapers: string
    customerPortal: string
    home: string
    pseqPlatform: string
    multiOmics: string
    whyIsoforms: string
    about: string
    contact: string
    privacy: string
    dataPolicies: string
    legal: string
  }
}
