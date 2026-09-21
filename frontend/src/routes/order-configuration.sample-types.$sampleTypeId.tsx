import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/order-configuration/sample-types/$sampleTypeId')({
  beforeLoad: ({ params }) => { throw redirect({ to: '/sample-shipping-settings', search: { shippingSection: 'sample-types', sampleTypeId: params.sampleTypeId }, replace: true }) },
})
