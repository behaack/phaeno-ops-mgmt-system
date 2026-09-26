import { Boxes, MapPin, ClipboardList, TestTubeDiagonal, BookOpen } from 'lucide-react'
import type { WorkspaceSidebarItem } from '#/components/WorkspaceSidebar'

export type ShippingSettingsSection = 'sample-types' | 'procedures' | 'containers' | 'destinations' | 'submission'

export const shippingSettingsSections: ReadonlyArray<WorkspaceSidebarItem<ShippingSettingsSection>> = [
  { value: 'sample-types', label: 'Sample types', description: 'Requirements, procedure and linked kits', icon: TestTubeDiagonal },
  { value: 'destinations', label: 'Phaeno ship-to destinations', description: 'Receiving addresses, hours, and restrictions', icon: MapPin },
  { value: 'procedures', label: 'Shipping procedures', description: 'Reusable common shipping steps', icon: BookOpen },
  { value: 'containers', label: 'Kit specifications', description: 'All kits, capacity and packing', icon: Boxes },
  { value: 'submission', label: 'Order submission guidance', description: 'Introductory guidance for new lab orders', icon: ClipboardList },
]

export function parseShippingSettingsSection(value: unknown): ShippingSettingsSection {
  if (value === 'preview' || value === 'instructions') return 'sample-types'
  return shippingSettingsSections.find(item => item.value === value)?.value ?? 'sample-types'
}
