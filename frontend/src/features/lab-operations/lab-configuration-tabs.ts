export const labConfigurationTabs = [
  { value: 'protocols', label: 'Protocols' },
  { value: 'workflows', label: 'Workflows' },
  { value: 'tray-formats', label: 'Tray formats' },
] as const

export type LabConfigurationTab = typeof labConfigurationTabs[number]['value']

export function parseLabConfigurationTab(value: unknown): LabConfigurationTab | undefined {
  return labConfigurationTabs.find(tab => tab.value === value)?.value
}
