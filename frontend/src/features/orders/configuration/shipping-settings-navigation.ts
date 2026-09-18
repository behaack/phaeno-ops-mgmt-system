import { Boxes, FileText, MapPin, ClipboardList } from 'lucide-react'
import type { WorkspaceSidebarItem } from '#/components/WorkspaceSidebar'

export type ShippingSettingsSection = 'containers' | 'destinations' | 'instructions' | 'submission'

export const shippingSettingsSections: ReadonlyArray<WorkspaceSidebarItem<ShippingSettingsSection>> = [
  { value: 'containers', label: 'Container sizes', description: 'Sizes, capacities, and handling compatibility', icon: Boxes },
  { value: 'destinations', label: 'Ship-to destinations', description: 'Receiving addresses, hours, and restrictions', icon: MapPin },
  { value: 'instructions', label: 'Sample shipping instructions', description: 'Packing and shipping instructions for each destination and sample type', icon: FileText },
  { value: 'submission', label: 'Default submission instructions', description: 'General guidance for new lab orders', icon: ClipboardList },
]

export function parseShippingSettingsSection(value: unknown): ShippingSettingsSection {
  if (value === 'preview') return 'instructions'
  return shippingSettingsSections.find(item => item.value === value)?.value ?? 'containers'
}
