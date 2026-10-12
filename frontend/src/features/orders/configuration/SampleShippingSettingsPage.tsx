import { CustomerText } from '#/features/customer-i18n/customer-text'
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
  if (!canManage) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle><CustomerText message="m_f85fd14bbed9" /></AlertTitle><AlertDescription><CustomerText message="m_4a97295b8423" /></AlertDescription></Alert></main>

  return <SampleShippingSettingsLayout section={section} onSectionChange={onSectionChange}>
    {authProvider === 'mock' ? <Alert><AlertTitle><CustomerText message="m_ad76fe290c74" /></AlertTitle><AlertDescription><CustomerText message="m_c7e09074830d" /></AlertDescription></Alert> : null}
    {section === 'submission' ? <SubmissionInstructionsPanel apiEnabled={authProvider !== 'mock'} /> : <SampleShippingConfigurationPanel key={section} apiEnabled={authProvider !== 'mock'} section={section} sampleTypeId={sampleTypeId} destinationId={destinationId} procedureId={procedureId} />}
  </SampleShippingSettingsLayout>
}
