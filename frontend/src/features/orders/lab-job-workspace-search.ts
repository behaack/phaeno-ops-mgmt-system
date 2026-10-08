export type LabJobWorkspaceSearch = {
  detailTab?: 'phases' | 'results' | 'billing' | 'history'
  detailPhaseId?: string
  resultPhaseId?: string
  shipmentId?: string
  shippingView?: 'samples' | 'tubes'
  samplePage?: number
  orderKits?: boolean
  phaseId?: string
}

export type ChangeLabJobWorkspace = (patch: Partial<LabJobWorkspaceSearch>, options?: { afterSave?: boolean }) => Promise<void>

export function parseLabJobWorkspaceSearch(search: Record<string, unknown>): LabJobWorkspaceSearch {
  const page = typeof search.samplePage === 'string' || typeof search.samplePage === 'number' ? Number(search.samplePage) : NaN
  return {
    detailTab: typeof search.detailTab === 'string' && ['phases', 'results', 'billing', 'history'].includes(search.detailTab) ? search.detailTab as LabJobWorkspaceSearch['detailTab'] : undefined,
    detailPhaseId: typeof search.detailPhaseId === 'string' && /^[0-9a-f-]{36}$/i.test(search.detailPhaseId) ? search.detailPhaseId : undefined,
    resultPhaseId: typeof search.resultPhaseId === 'string' && /^[0-9a-f-]{36}$/i.test(search.resultPhaseId) ? search.resultPhaseId : undefined,
    shipmentId: typeof search.shipmentId === 'string' && search.shipmentId.length <= 100 && search.shipmentId.trim() ? search.shipmentId : undefined,
    shippingView: search.shippingView === 'tubes' ? 'tubes' : undefined,
    samplePage: Number.isSafeInteger(page) && page > 1 ? page : undefined,
    orderKits: search.orderKits === true || search.orderKits === 'true' ? true : undefined,
    phaseId: typeof search.phaseId === 'string' && /^[0-9a-f-]{36}$/i.test(search.phaseId) ? search.phaseId : undefined,
  }
}
