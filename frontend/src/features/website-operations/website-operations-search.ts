export type WebsiteOperationsSection = 'mailing-list' | 'demo-requests' | 'email-delivery'
export type WebsiteOperationsSearch = {
  section?: WebsiteOperationsSection
  mailingListPage?: number
  demoRequestPage?: number
  requestId?: string
  deliveryId?: string
}

function readId(value: unknown) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value.toLowerCase() : undefined
}

function readPage(value: unknown) {
  const page = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN
  return Number.isSafeInteger(page) && page > 1 ? Math.min(page, 100000) : undefined
}

export function parseWebsiteOperationsSearch(search: Record<string, unknown>): WebsiteOperationsSearch {
  return {
    section: search.section === 'mailing-list' || search.section === 'demo-requests' || search.section === 'email-delivery' ? search.section : undefined,
    mailingListPage: readPage(search.mailingListPage),
    demoRequestPage: readPage(search.demoRequestPage),
    requestId: readId(search.requestId),
    deliveryId: readId(search.deliveryId),
  }
}

export function websiteOperationsSection(search: WebsiteOperationsSearch): WebsiteOperationsSection {
  return search.section ?? (search.deliveryId ? 'email-delivery' : search.requestId ? 'demo-requests' : 'mailing-list')
}
