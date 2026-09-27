import type { ReactNode } from 'react'
import { WorkspaceSidebar } from '#/components/WorkspaceSidebar'
import { SampleShippingSettingsHeader } from './SampleShippingSettingsHeader'
import { shippingSettingsSections, type ShippingSettingsSection } from './shipping-settings-navigation'

export function SampleShippingSettingsLayout({ section, onSectionChange, children }: {
  section: ShippingSettingsSection
  onSectionChange: (section: ShippingSettingsSection) => void
  children: ReactNode
}) {
  return <main className="py-8">
    <WorkspaceSidebar workspaceLabel="Samples & shipping settings" items={shippingSettingsSections} value={section} onValueChange={onSectionChange}>
      <div className="page-wrap px-4 pt-6 lg:pt-0">
        <SampleShippingSettingsHeader />
        {children}
      </div>
    </WorkspaceSidebar>
  </main>
}
