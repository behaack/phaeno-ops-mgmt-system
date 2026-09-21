import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { SampleShippingSettingsPage } from '#/features/orders/configuration/SampleShippingSettingsPage'
import { parseShippingSettingsSection, type ShippingSettingsSection } from '#/features/orders/configuration/shipping-settings-navigation'
import { parseShippingContainerListSearch, type ShippingContainerListSearch } from '#/features/orders/configuration/shipping-container-navigation'

export const Route = createFileRoute('/sample-shipping-settings')({
  validateSearch: (search: Record<string, unknown>): ShippingContainerListSearch & { shippingSection?: ShippingSettingsSection; sampleTypeId?: string; procedureId?: string } => ({
    ...parseShippingContainerListSearch(search),
    sampleTypeId: typeof search.sampleTypeId === 'string' ? search.sampleTypeId : undefined,
    procedureId: typeof search.procedureId === 'string' ? search.procedureId : undefined,
    shippingSection: parseShippingSettingsSection(search.shippingSection),
  }),
  component: ShippingSettingsRoute,
})

function ShippingSettingsRoute() {
  const { shippingSection, sampleTypeId, procedureId } = Route.useSearch()
  const navigate = useNavigate()
  return <SampleShippingSettingsPage sampleTypeId={sampleTypeId} procedureId={procedureId} section={shippingSection ?? 'sample-types'} onSectionChange={section => void navigate({ to: '/sample-shipping-settings', search: previous => ({ ...parseShippingContainerListSearch(previous), shippingSection: section }), resetScroll: false })} />
}
