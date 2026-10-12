import type { WorkKind, WorkView } from '#/api/work-attention'
export type WorkSearch = { workView?: WorkView; workKind?: WorkKind; workDomain?: string; workPage?: number; workPriority?: number }
export function parseWorkSearch(input: Record<string, unknown>): WorkSearch {
  return { workView: input.workView === 'team' || input.workView === 'unassigned' ? input.workView : 'mine',
    workKind: input.workKind === 'waiting' || input.workKind === 'update' ? input.workKind : 'action',
    workDomain: ['commercial', 'crm', 'laboratory', 'scientific', 'fulfillment', 'shipping', 'finance', 'recovery', 'web', 'data', 'access'].includes(String(input.workDomain)) ? String(input.workDomain) : '',
    workPriority: input.workPriority !== undefined && input.workPriority !== '' && Number.isInteger(Number(input.workPriority)) && Number(input.workPriority) >= 0 && Number(input.workPriority) <= 4 ? Number(input.workPriority) : undefined,
    workPage: Number.isSafeInteger(Number(input.workPage)) && Number(input.workPage) > 0 ? Math.min(Number(input.workPage), 100000) : 1 }
}
