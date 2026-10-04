import { Building2, FileText, Scale, Upload, Wallet } from 'lucide-react'
import type { WorkspaceSidebarItem } from '#/components/WorkspaceSidebar'

export type FinanceSection = 'invoices' | 'receipts' | 'customers' | 'imports' | 'reconciliation'
type FinanceAccess = { canBill: boolean; canManageCash: boolean; canReconcile: boolean }

const sections: ReadonlyArray<WorkspaceSidebarItem<FinanceSection>> = [
  { value: 'invoices', label: 'Invoices and aging', description: 'Review invoices and outstanding balances', icon: FileText },
  { value: 'receipts', label: 'Receipts', description: 'Record payments and allocate cash', icon: Wallet },
  { value: 'customers', label: 'Customer billing', description: 'Maintain billing details and tax approval', icon: Building2 },
  { value: 'imports', label: 'Import receipts', description: 'Review and import payment records', icon: Upload },
  { value: 'reconciliation', label: 'Reconciliation', description: 'Balance cash and approve reconciliations', icon: Scale },
]

export function getFinanceSections({ canBill, canManageCash, canReconcile }: FinanceAccess) {
  return sections.filter(item => item.value === 'invoices' || item.value === 'customers'
    ? canBill
    : item.value === 'reconciliation' ? canManageCash || canReconcile : canManageCash)
}
