import { WorkspaceSidebar } from '#/components/WorkspaceSidebar'
import { Link } from '@tanstack/react-router'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { usePhaenoSession } from '#/features/auth/session-context'
import { SampleShippingConfigurationPanel } from './SampleShippingConfigurationPanel'
import { SubmissionInstructionsPanel } from './SubmissionInstructionsPanel'
import { shippingSettingsSections, type ShippingSettingsSection } from './shipping-settings-navigation'

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

  return <main className="py-8">
    <WorkspaceSidebar workspaceLabel="Samples & shipping settings" items={shippingSettingsSections} value={section} onValueChange={onSectionChange}>
      <div className="page-wrap px-4 pt-6 lg:pt-0">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold">Samples &amp; shipping settings</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Define each Sample type, select its Shipping procedure, and link usable Transportation kits. Set one Default Phaeno destination for Orders using customer-held kits.</p>
          <details className="mt-3 max-w-3xl rounded-lg border p-3 text-sm"><summary className="cursor-pointer font-medium">Setup guide: where each instruction belongs</summary><ol className="mt-3 list-decimal space-y-2 pl-5">
            <li><Link className="underline" to="/sample-shipping-settings" search={{ shippingSection: 'sample-types' }}>Sample types</Link>: specimen requirements, one selected procedure, and linked kits.</li>
            <li><Link className="underline" to="/sample-shipping-settings" search={{ shippingSection: 'destinations' }}>Phaeno ship-to destinations</Link>: address, receiving hours, contacts and delivery directions.</li>
            <li><Link className="underline" to="/sample-shipping-settings" search={{ shippingSection: 'procedures' }}>Shipping procedures</Link>: reusable common steps for carriers, dispatch, documents and handling problems.</li>
            <li><Link className="underline" to="/sample-shipping-settings" search={{ shippingSection: 'containers' }}>Transportation kits</Link>: one Sample type per kit, bill of materials, capacity, dry ice, and packing.</li>
          </ol><p className="mt-3 text-muted-foreground">Every Active destination can receive any orderable Sample type. Phaeno fixes the destination when first dispatching a requested kit; customer-held kits use the Default destination. Issued shipments retain their saved instructions.</p></details>
        </header>
        {authProvider === 'mock' ? <Alert><AlertTitle>Connected configuration is paused in mock-session mode</AlertTitle><AlertDescription>Use a real Phaeno session to load and change shipping settings.</AlertDescription></Alert> : null}
        {section === 'submission' ? <SubmissionInstructionsPanel apiEnabled={authProvider !== 'mock'} /> : <SampleShippingConfigurationPanel key={section} apiEnabled={authProvider !== 'mock'} section={section} sampleTypeId={sampleTypeId} destinationId={destinationId} procedureId={procedureId} />}
      </div>
    </WorkspaceSidebar>
  </main>
}
