export type LabJobWorkspaceSearch = {
  shipmentId?: string
  shippingView?: 'samples' | 'tubes'
  samplePage?: number
  orderKits?: boolean
}

export type ChangeLabJobWorkspace = (patch: Partial<LabJobWorkspaceSearch>, options?: { afterSave?: boolean }) => Promise<void>

export function parseLabJobWorkspaceSearch(search: Record<string, unknown>): LabJobWorkspaceSearch {
  const page = typeof search.samplePage === 'string' || typeof search.samplePage === 'number' ? Number(search.samplePage) : NaN
  return {
    shipmentId: typeof search.shipmentId === 'string' && search.shipmentId.length <= 100 && search.shipmentId.trim() ? search.shipmentId : undefined,
    shippingView: search.shippingView === 'tubes' ? 'tubes' : undefined,
    samplePage: Number.isSafeInteger(page) && page > 1 ? page : undefined,
    orderKits: search.orderKits === true || search.orderKits === 'true' ? true : undefined,
  }
}
