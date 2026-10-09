export const specimenTabs = [
  { value: 'overview', label: 'Overview' }, { value: 'processing', label: 'Processing' },
  { value: 'libraries', label: 'Libraries' },
  { value: 'sequencing', label: 'Sequencing & analysis' }, { value: 'results', label: 'Results & delivery' },
  { value: 'history', label: 'History' },
] as const
export type SpecimenTab = typeof specimenTabs[number]['value']
export const parseSpecimenTab = (value: unknown): SpecimenTab | undefined => specimenTabs.find(tab => tab.value === value)?.value
export type SpecimenSearch = { specimenSearch?: string; specimenPage?: number; specimenScope?: 'Active' | 'Historical'; specimenState?: string; specimenBlocked?: boolean }
export const processingStates = ['Ready', 'Planned', 'InProgress', 'OnHold', 'Failed', 'Succeeded'] as const
export function parseSpecimenSearch(search: Record<string, unknown>): SpecimenSearch {
  const page = Number(search.specimenPage)
  return { specimenSearch: typeof search.specimenSearch === 'string' ? search.specimenSearch.slice(0, 255) : undefined,
    specimenPage: Number.isSafeInteger(page) && page > 0 && page <= 2147483647 ? page : undefined,
    specimenScope: search.specimenScope === 'Active' || search.specimenScope === 'Historical' ? search.specimenScope : undefined,
    specimenState: processingStates.find(state => state === search.specimenState),
    specimenBlocked: search.specimenBlocked === true || search.specimenBlocked === 'true' ? true : undefined }
}

const jobTabs = ['overview', 'specimens', 'execution', 'lineage', 'libraries', 'sequencing', 'exceptions', 'review'] as const
export const parseJobTab = (value: unknown) => jobTabs.find(tab => tab === value)

export type ExecutionReturnSearch = { returnSpecimenId?: string; returnSpecimenTab?: SpecimenTab }
export function parseExecutionReturnSearch(search: Record<string, unknown>): ExecutionReturnSearch {
  return {
    returnSpecimenId: typeof search.returnSpecimenId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(search.returnSpecimenId) ? search.returnSpecimenId : undefined,
    returnSpecimenTab: parseSpecimenTab(search.returnSpecimenTab),
  }
}
