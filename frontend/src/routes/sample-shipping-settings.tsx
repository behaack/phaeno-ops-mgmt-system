import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { SampleShippingSettingsPage } from '#/features/orders/configuration/SampleShippingSettingsPage'
import { parseShippingSettingsSection, type ShippingSettingsSection } from '#/features/orders/configuration/shipping-settings-navigation'
import { parseShippingContainerListSearch, type ShippingContainerListSearch } from '#/features/orders/configuration/shipping-container-navigation'
import { parseSampleTypeListSearch, type SampleTypeListSearch } from '#/features/orders/configuration/sample-type-list-navigation'
import { parseDestinationListSearch, type DestinationListSearch } from '#/features/orders/configuration/destination-list-navigation'

export const Route = createFileRoute('/sample-shipping-settings')({
  validateSearch: (search: Record<string, unknown>): ShippingContainerListSearch & SampleTypeListSearch & DestinationListSearch & { shippingSection?: ShippingSettingsSection; sampleTypeId?: string; destinationId?: string; procedureId?: string } => ({
    ...parseShippingContainerListSearch(search),
    ...parseSampleTypeListSearch(search),
    ...parseDestinationListSearch(search),
    sampleTypeId: typeof search.sampleTypeId === 'string' ? search.sampleTypeId : undefined,
    destinationId: typeof search.destinationId === 'string' ? search.destinationId : undefined,
    procedureId: typeof search.procedureId === 'string' ? search.procedureId : undefined,
    shippingSection: parseShippingSettingsSection(search.shippingSection),
  }),
  component: ShippingSettingsRoute,
})

function ShippingSettingsRoute() {
  const { shippingSection, sampleTypeId, destinationId, procedureId } = Route.useSearch()
  const navigate = useNavigate()
  return <SampleShippingSettingsPage sampleTypeId={sampleTypeId} destinationId={destinationId} procedureId={procedureId} section={shippingSection ?? 'sample-types'} onSectionChange={section => void navigate({ to: '/sample-shipping-settings', search: previous => ({ ...parseShippingContainerListSearch(previous), ...parseSampleTypeListSearch(previous), ...parseDestinationListSearch(previous), shippingSection: section }), resetScroll: false })} />
}
