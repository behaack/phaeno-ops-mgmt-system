import { Boxes, FileText, MapPin, ClipboardList, TestTubeDiagonal, BookOpen } from 'lucide-react'
import type { WorkspaceSidebarItem } from '#/components/WorkspaceSidebar'

export type ShippingSettingsSection = 'sample-types' | 'procedures' | 'containers' | 'destinations' | 'instructions' | 'submission'

export const shippingSettingsSections: ReadonlyArray<WorkspaceSidebarItem<ShippingSettingsSection>> = [
  { value: 'sample-types', label: 'Sample types', description: 'Material, quantity and preservation', icon: TestTubeDiagonal },
  { value: 'destinations', label: 'Ship-to destinations', description: 'Receiving addresses, hours, and restrictions', icon: MapPin },
  { value: 'procedures', label: 'Shipping procedures', description: 'Reusable common shipping steps', icon: BookOpen },
  { value: 'instructions', label: 'Shipping assignments', description: 'Approved procedures for samples and destinations', icon: FileText },
  { value: 'containers', label: 'Kit specifications', description: 'Capacity, temperature control and packing', icon: Boxes },
  { value: 'submission', label: 'Order submission guidance', description: 'Introductory guidance for new lab orders', icon: ClipboardList },
]

export function parseShippingSettingsSection(value: unknown): ShippingSettingsSection {
  if (value === 'preview') return 'instructions'
  return shippingSettingsSections.find(item => item.value === value)?.value ?? 'sample-types'
}
