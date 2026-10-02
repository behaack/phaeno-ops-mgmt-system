export const accessionIntakeStatuses = { Received: 'Received', Accepted: 'Accepted', OnHold: 'On hold', Rejected: 'Rejected', Cancelled: 'Cancelled' } as const
export type AccessionIntakeStatus = keyof typeof accessionIntakeStatuses
export const accessionUseStatuses = { Used: 'Used', NotUsed: 'Not used' } as const
export type AccessionUseStatus = keyof typeof accessionUseStatuses
export type AccessionSearch = { accessionView?: 'packages' | 'samples'; accessionSearch?: string; accessionPage?: number; accessionStatus?: AccessionIntakeStatus; accessionUse?: AccessionUseStatus }

export function parseAccessionSearch(search: Record<string, unknown>): AccessionSearch {
  const page = Number(search.accessionPage)
  return {
    accessionView: search.accessionView === 'packages' || search.accessionView === 'samples' ? search.accessionView : undefined,
    accessionSearch: typeof search.accessionSearch === 'string' ? search.accessionSearch.slice(0, 255) : undefined,
    accessionPage: Number.isSafeInteger(page) && page > 0 && page <= 2147483647 ? page : undefined,
    accessionStatus: typeof search.accessionStatus === 'string' && Object.hasOwn(accessionIntakeStatuses, search.accessionStatus) ? search.accessionStatus as AccessionIntakeStatus : undefined,
    accessionUse: typeof search.accessionUse === 'string' && Object.hasOwn(accessionUseStatuses, search.accessionUse) ? search.accessionUse as AccessionUseStatus : undefined,
  }
}
