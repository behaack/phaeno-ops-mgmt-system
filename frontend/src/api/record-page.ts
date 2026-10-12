export function requireRecordPage<T extends { items: unknown[]; totalCount: number; page: number; pageSize: number }>(value: T): T {
  if (!value || !Array.isArray(value.items) || !Number.isSafeInteger(value.totalCount) || value.totalCount < 0
    || !Number.isSafeInteger(value.page) || value.page < 1 || !Number.isSafeInteger(value.pageSize) || value.pageSize < 1)
    throw new Error('Record pages are unavailable. Refresh after the matching service update; your filters are preserved.')
  return value
}
