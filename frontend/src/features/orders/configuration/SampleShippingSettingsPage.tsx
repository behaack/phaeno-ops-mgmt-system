import { WorkspaceSidebar } from '#/components/WorkspaceSidebar'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { usePhaenoSession } from '#/features/auth/session-context'
import { SampleShippingConfigurationPanel } from './SampleShippingConfigurationPanel'
import { SubmissionInstructionsPanel } from './SubmissionInstructionsPanel'
import { shippingSettingsSections, type ShippingSettingsSection } from './shipping-settings-navigation'

export function SampleShippingSettingsPage({ section, onSectionChange }: {
  section: ShippingSettingsSection
  onSectionChange: (section: ShippingSettingsSection) => void
}) {
  const { session, authProvider } = usePhaenoSession()
  const canManage = Boolean(session?.capabilities.canManageOrderConfiguration)
  if (!canManage) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Sample Shipping Settings unavailable</AlertTitle><AlertDescription>A Phaeno platform administrator is required.</AlertDescription></Alert></main>

  return <main className="py-8">
    <WorkspaceSidebar workspaceLabel="Sample Shipping Settings" items={shippingSettingsSections} value={section} onValueChange={onSectionChange}>
      <div className="page-wrap px-4 pt-6 lg:pt-0">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold">Sample Shipping Settings</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Maintain container sizes, receiving destinations, and shipping instructions. New definitions start inactive until approved content is ready. Revisions apply to future shipments; saved shipment instructions are preserved.</p>
        </header>
        {authProvider === 'mock' ? <Alert><AlertTitle>Connected configuration is paused in mock-session mode</AlertTitle><AlertDescription>Use a real Phaeno session to load and change shipping settings.</AlertDescription></Alert> : null}
        {section === 'submission' ? <SubmissionInstructionsPanel apiEnabled={authProvider !== 'mock'} /> : <SampleShippingConfigurationPanel key={section} apiEnabled={authProvider !== 'mock'} section={section} />}
      </div>
    </WorkspaceSidebar>
  </main>
}
