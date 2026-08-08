import type { IMenuItem } from '@/layouts/header/menu-versions/IMenuItem'
import { ar } from './catalogs/ar'
import { enUS } from './catalogs/en-US'
import type { PluralLabels, WebsiteMessages } from './catalogs/types'
import { prefixPathForLocale, type SupportedLocale } from './locales'

export type { WebsiteMessages } from './catalogs/types'

export const messages: Record<SupportedLocale, WebsiteMessages> = {
  'en-US': enUS,
  ar,
}

export function getMessages(locale: SupportedLocale) {
  return messages[locale]
}

export function formatMessage(
  template: string,
  values: Record<string, string | number>,
) {
  return template.replace(/{{(\w+)}}/g, (_, key: string) => String(values[key] ?? ''))
}

export function getPluralLabel(
  locale: SupportedLocale,
  count: number,
  labels: PluralLabels,
) {
  const category = new Intl.PluralRules(locale).select(count)
  return labels[category] ?? labels.other
}

export function getSearchResultsFound(locale: SupportedLocale, count: number) {
  const search = getMessages(locale).search
  return formatMessage(search.resultsFound, {
    count,
    resultLabel: getPluralLabel(locale, count, search.resultLabels),
  })
}

export function getPageCountLabel(locale: SupportedLocale, count: number) {
  const labels = getMessages(locale).article.pageLabels
  return `${count} ${getPluralLabel(locale, count, labels)}`
}

export function getVersionLabel(locale: SupportedLocale, version: string) {
  const normalized = version.trim()
  if (/^version\b/i.test(normalized) || /^الإصدار\b/.test(normalized)) {
    return normalized
  }

  return formatMessage(getMessages(locale).article.version, { version: normalized })
}

export function getMenu(locale: SupportedLocale): IMenuItem[] {
  const navigation = getMessages(locale).navigation

  return [
    { index: 0, label: navigation.home, path: prefixPathForLocale(locale, '/'), submenu: null },
    {
      index: 1,
      label: navigation.technology,
      path: prefixPathForLocale(locale, '/technology'),
      submenu: [
        { index: 1.1, label: navigation.pseqPlatform, path: prefixPathForLocale(locale, '/technology/pseq-platform'), submenu: null },
        { index: 1.2, label: navigation.multiOmics, path: prefixPathForLocale(locale, '/technology/multi-omics'), submenu: null },
        { index: 1.3, label: navigation.whyIsoforms, path: prefixPathForLocale(locale, '/technology/why-isoforms-matter'), submenu: null },
      ],
    },
    {
      index: 2,
      label: navigation.about,
      path: prefixPathForLocale(locale, '/about'),
      submenu: [
        { index: 2.1, label: navigation.aboutUs, path: prefixPathForLocale(locale, '/about/about-us'), submenu: null },
        { index: 2.2, label: navigation.jobs, path: prefixPathForLocale(locale, '/about/job-openings'), submenu: null },
      ],
    },
    {
      index: 3,
      label: navigation.media,
      path: prefixPathForLocale(locale, '/media'),
      submenu: [
        { index: 3.1, label: navigation.blog, path: prefixPathForLocale(locale, '/media/blog'), submenu: null },
        { index: 3.2, label: navigation.whitePapers, path: prefixPathForLocale(locale, '/media/white-papers'), submenu: null },
      ],
    },
    { index: 4, label: navigation.contact, path: prefixPathForLocale(locale, '/contact'), submenu: null },
  ]
}
