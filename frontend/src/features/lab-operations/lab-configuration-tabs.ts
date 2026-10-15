import { CalendarDays, ClipboardList, Clock3, Layers3, LayoutGrid, Warehouse, Workflow } from 'lucide-react'

export const labConfigurationTabs = [
  { value: 'protocols', label: 'Protocols', description: 'Versioned steps and execution rules', icon: Layers3 },
  { value: 'workflows', label: 'Workflows', description: 'Approved protocols and service stages', icon: Workflow },
  { value: 'steps', label: 'Historical Lab steps', description: 'Archived source definitions and provenance', icon: ClipboardList },
  { value: 'stage-durations', label: 'Stage durations', description: 'Estimated time and day basis by stage', icon: Clock3 },
  { value: 'holiday-calendar', label: 'Holiday calendar', description: 'Business-day holidays and closures', icon: CalendarDays },
  { value: 'tray-formats', label: 'Library tray formats', description: 'Tray layouts and usable positions', icon: LayoutGrid },
  { value: 'storage-locations', label: 'Storage locations', description: 'Named locations for material lots', icon: Warehouse },
] as const

export type LabConfigurationTab = typeof labConfigurationTabs[number]['value']

export function parseLabConfigurationTab(value: unknown): LabConfigurationTab | undefined {
  return labConfigurationTabs.find(tab => tab.value === value)?.value
}
