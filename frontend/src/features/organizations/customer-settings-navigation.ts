export type CustomerSettingsTab = 'delivery' | 'departments' | 'defaults' | 'people'

export type CustomerSettingsSearch = {
  settingsTab?: CustomerSettingsTab
  settingsDepartmentId?: string
}

export function parseCustomerSettingsSearch(value: Record<string, unknown>): CustomerSettingsSearch {
  const tab = value.settingsTab
  const departmentId = value.settingsDepartmentId
  return {
    settingsTab: tab === 'delivery' || tab === 'departments' || tab === 'defaults' || tab === 'people' ? tab : undefined,
    settingsDepartmentId: typeof departmentId === 'string' && /^[0-9a-f-]{36}$/i.test(departmentId) ? departmentId : undefined,
  }
}
