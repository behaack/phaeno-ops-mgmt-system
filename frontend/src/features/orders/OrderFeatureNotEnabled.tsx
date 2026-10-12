import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'

export function OrderFeatureNotEnabled({ feature }: { feature: 'Attention queues' | 'Result release' }) {
  return <Alert role="status">
    <AlertTitle>{feature} <CustomerSourceText source={"not enabled"} /></AlertTitle>
    <AlertDescription><CustomerSourceText source={"This capability is not enabled for this installation. You can continue working in other available areas."} /></AlertDescription>
  </Alert>
}
