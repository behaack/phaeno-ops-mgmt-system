export type DataProvisioningSection = 'sources' | 'catalog' | 'grants' | 'governance'

export function parseDataProvisioningSection(value: unknown): DataProvisioningSection {
  return value === 'catalog' || value === 'grants' || value === 'governance' ? value : 'sources'
}
