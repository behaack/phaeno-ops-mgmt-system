import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { usePhaenoSession } from '#/features/auth/session-context'
import { SampleShippingConfigurationPanel } from './SampleShippingConfigurationPanel'
import { SampleShippingSettingsLayout } from './SampleShippingSettingsLayout'
import { SubmissionInstructionsPanel } from './SubmissionInstructionsPanel'
import type { ShippingSettingsSection } from './shipping-settings-navigation'

export function SampleShippingSettingsPage({ section, onSectionChange, sampleTypeId, destinationId, procedureId }: {
  sampleTypeId?: string
  destinationId?: string
  procedureId?: string
  section: ShippingSettingsSection
  onSectionChange: (section: ShippingSettingsSection) => void
}) {
  const { session, authProvider } = usePhaenoSession()
  const canManage = Boolean(session?.capabilities.canManageOrderConfiguration)
  if (!canManage) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Samples & shipping settings unavailable</AlertTitle><AlertDescription>A Phaeno platform administrator is required.</AlertDescription></Alert></main>

  return <SampleShippingSettingsLayout section={section} onSectionChange={onSectionChange}>
    {authProvider === 'mock' ? <Alert><AlertTitle>Connected configuration is paused in mock-session mode</AlertTitle><AlertDescription>Use a real Phaeno session to load and change shipping settings.</AlertDescription></Alert> : null}
    {section === 'submission' ? <SubmissionInstructionsPanel apiEnabled={authProvider !== 'mock'} /> : <SampleShippingConfigurationPanel key={section} apiEnabled={authProvider !== 'mock'} section={section} sampleTypeId={sampleTypeId} destinationId={destinationId} procedureId={procedureId} />}
  </SampleShippingSettingsLayout>
}
