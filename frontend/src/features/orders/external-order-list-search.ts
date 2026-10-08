export type ExternalOrderListSearch = { q?: string; status?: string; from?: string; through?: string; mine?: boolean; page?: number }
export function parseExternalOrderListSearch(value: Record<string, unknown>): ExternalOrderListSearch {
  const date = (input: unknown) => typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input) && !Number.isNaN(Date.parse(input)) && new Date(input).toISOString().slice(0, 10) === input ? input : undefined
  const page = Number(value.page)
  return {
    q: typeof value.q === 'string' && value.q ? value.q : undefined,
    status: typeof value.status === 'string' && value.status ? value.status : undefined,
    from: date(value.from), through: date(value.through),
    mine: value.mine === true || value.mine === 'true' ? true : undefined,
    page: Number.isSafeInteger(page) && page > 1 ? page : undefined,
  }
}
