import { WorkspaceSidebar } from '#/components/WorkspaceSidebar'
import { Link } from '@tanstack/react-router'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { usePhaenoSession } from '#/features/auth/session-context'
import { SampleShippingConfigurationPanel } from './SampleShippingConfigurationPanel'
import { SubmissionInstructionsPanel } from './SubmissionInstructionsPanel'
import { shippingSettingsSections, type ShippingSettingsSection } from './shipping-settings-navigation'

export function SampleShippingSettingsPage({ section, onSectionChange, sampleTypeId, procedureId }: {
  sampleTypeId?: string
  procedureId?: string
  section: ShippingSettingsSection
  onSectionChange: (section: ShippingSettingsSection) => void
}) {
  const { session, authProvider } = usePhaenoSession()
  const canManage = Boolean(session?.capabilities.canManageOrderConfiguration)
  if (!canManage) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Samples & shipping settings unavailable</AlertTitle><AlertDescription>A Phaeno platform administrator is required.</AlertDescription></Alert></main>

  return <main className="py-8">
    <WorkspaceSidebar workspaceLabel="Samples & shipping settings" items={shippingSettingsSections} value={section} onValueChange={onSectionChange}>
      <div className="page-wrap px-4 pt-6 lg:pt-0">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold">Samples &amp; shipping settings</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Define sample requirements, connect them to a destination and shared procedure, then approve packing for each container size.</p>
          <details className="mt-3 max-w-3xl rounded-lg border p-3 text-sm"><summary className="cursor-pointer font-medium">Setup guide: where each instruction belongs</summary><ol className="mt-3 list-decimal space-y-2 pl-5">
            <li><Link className="underline" to="/sample-shipping-settings" search={{ shippingSection: 'sample-types' }}>Sample types</Link>: material, quantity, sample tube, preservation, labels and safety.</li>
            <li><Link className="underline" to="/sample-shipping-settings" search={{ shippingSection: 'destinations' }}>Ship-to destinations</Link>: address, receiving hours, contacts and delivery directions.</li>
            <li><Link className="underline" to="/sample-shipping-settings" search={{ shippingSection: 'procedures' }}>Shipping procedures</Link>: common steps for carriers, dispatch, documents and handling problems.</li>
            <li><Link className="underline" to="/sample-shipping-settings" search={{ shippingSection: 'instructions' }}>Shipping assignments</Link>: choose a sample, destination and approved procedure. Add only exceptions for that pairing.</li>
            <li><Link className="underline" to="/sample-shipping-settings" search={{ shippingSection: 'containers' }}>Container sizes</Link>: approved capacity and each sample combination's temperature-control method, amount and packing steps.</li>
          </ol><p className="mt-3 text-muted-foreground">Review the assembled setup under a sample type's Shipping &amp; packing section. Order submission guidance is the introduction copied to new orders; keep detailed packing in the configuration above. Issued shipments retain their saved instructions.</p></details>
        </header>
        {authProvider === 'mock' ? <Alert><AlertTitle>Connected configuration is paused in mock-session mode</AlertTitle><AlertDescription>Use a real Phaeno session to load and change shipping settings.</AlertDescription></Alert> : null}
        {section === 'submission' ? <SubmissionInstructionsPanel apiEnabled={authProvider !== 'mock'} /> : <SampleShippingConfigurationPanel key={section} apiEnabled={authProvider !== 'mock'} section={section} sampleTypeId={sampleTypeId} procedureId={procedureId} />}
      </div>
    </WorkspaceSidebar>
  </main>
}
