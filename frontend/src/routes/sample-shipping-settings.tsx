import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { SampleShippingSettingsPage } from '#/features/orders/configuration/SampleShippingSettingsPage'
import { parseShippingSettingsSection, type ShippingSettingsSection } from '#/features/orders/configuration/shipping-settings-navigation'
import { parseShippingContainerListSearch, type ShippingContainerListSearch } from '#/features/orders/configuration/shipping-container-navigation'

export const Route = createFileRoute('/sample-shipping-settings')({
  validateSearch: (search: Record<string, unknown>): ShippingContainerListSearch & { shippingSection?: ShippingSettingsSection } => ({
    ...parseShippingContainerListSearch(search),
    shippingSection: parseShippingSettingsSection(search.shippingSection),
  }),
  component: ShippingSettingsRoute,
})

function ShippingSettingsRoute() {
  const { shippingSection } = Route.useSearch()
  const navigate = useNavigate()
  return <SampleShippingSettingsPage section={shippingSection ?? 'containers'} onSectionChange={section => void navigate({ to: '/sample-shipping-settings', search: previous => ({ ...parseShippingContainerListSearch(previous), shippingSection: section }), resetScroll: false })} />
}
