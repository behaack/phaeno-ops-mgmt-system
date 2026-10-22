import { EmptyState, ErrorState, LoadingState } from '#/components/ui/content-state'
import { DomainStatusBadge } from '#/components/ui/domain-status-badge'
import { shippingTones } from '#/features/sample-shipping/shipping-status'
import { RecordTableHeader } from '#/components/ui/record-list'
import { RecordLink } from '#/components/ui/record-link'
import { PageTitle } from '#/components/ui/page-header'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText, type CustomerMessageId } from '#/features/customer-i18n/customer-text'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import { getSampleShipmentPage } from '#/api/sample-shipping'
import { RecordPagination, useRecordListState } from '#/components/RecordPagination'
import { Field } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { NativeSelect } from '#/components/ui/native-select'
import { Label } from '#/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { usePhaenoSession } from '#/features/auth/session-context'
import { apiErrorMessage } from '#/api/organization-management'

const shipmentStatusMessages: Record<string, CustomerMessageId> = {
  Preparing: 'shipment_preparing', ReadyToShip: 'shipment_readytoship', Shipped: 'shipment_shipped',
  Delivered: 'shipment_delivered', Received: 'shipment_received', Cancelled: 'shipment_cancelled',
}
const shipmentSourceMessages: Record<string, CustomerMessageId> = {
  ProspectTrialProject: 'shipment_source_trial', CustomerLabServiceOrder: 'shipment_source_lab',
  CustomerPromotionalOrder: 'shipment_source_promotion',
}

export function SampleShippingPage() {
  const { authProvider, session, selectedOrganizationId, selectedDepartmentId } = usePhaenoSession()
  const list = useRecordListState()
  const text = useCustomerText()
  const statusLabel = (status: string) => shipmentStatusMessages[status] ? text(shipmentStatusMessages[status]) : status
  const sourceLabel = (value: string) => shipmentSourceMessages[value] ? text(shipmentSourceMessages[value]) : value
  const canView = Boolean(session?.capabilities.canViewSampleShipping)
  const pageQuery = useQuery({
    queryKey: ['sample-shipments', selectedOrganizationId, selectedDepartmentId, list.search, list.status, list.page],
    queryFn: () => getSampleShipmentPage(list.search, list.status, list.page),
    enabled: canView && authProvider !== 'mock',
  })
  const query = { ...pageQuery, data: pageQuery.isError ? undefined : pageQuery.data?.items }

  if (!canView) {
    return <main className="page-wrap px-4 py-8"><PageTitle><CustomerText message="m_74607a548dd6" /></PageTitle><EmptyState kind="permission" title={<CustomerText message="m_e2c9a6f62628" />}><CustomerText message="m_8e202634d68a" /></EmptyState></main>
  }

  return (
    <main className="page-wrap px-4 py-8">
      <section className="mb-6 max-w-3xl">
        <PageTitle><CustomerText message="m_74607a548dd6" /></PageTitle>
        <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base"><CustomerText message="m_3c8cf78d680a" /></p>
      </section>

      {authProvider === 'mock' ? <Alert className="mb-5"><AlertTitle><CustomerText message="m_2d90c5285ea9" /></AlertTitle><AlertDescription><CustomerText message="m_46f75966b719" /></AlertDescription></Alert> : null}
      {query.error ? <ErrorState title={<CustomerText message="m_c6f34d08c8b4" />} onRetry={() => void pageQuery.refetch()} busy={pageQuery.isFetching}><CustomerSourceText source={apiErrorMessage(query.error)} /></ErrorState> : null}

      <Card>
        <CardHeader><CardTitle><CustomerText message="m_a21250eb19e9" /></CardTitle><CardDescription><CustomerText message="m_4f5662ab721c" /></CardDescription></CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <Field><Label htmlFor="shipment-search">{text('shipment_search')}</Label><Input id="shipment-search" value={list.search} onChange={event => list.change({ listSearch: event.target.value, listPage: 1 })} /></Field>
            <Field><Label htmlFor="shipment-status">{text('shipment_status')}</Label><NativeSelect id="shipment-status" value={list.status} onChange={event => list.change({ listStatus: event.target.value, listPage: 1 })}>
              <option value="">{text('shipment_all_statuses')}</option>{['Preparing', 'ReadyToShip', 'Shipped', 'Delivered', 'Received', 'Cancelled'].map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}
            </NativeSelect></Field>
          </div>
          {query.isLoading ? <LoadingState  label={<><CustomerText message="m_65babe3fa3fa" /></>} /> : null}
          {(query.data?.length ?? 0) > 0 ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><RecordTableHeader className="border-b text-muted-foreground"><tr><th className="px-2 py-3 font-medium"><CustomerText message="m_dfee01bfef72" /></th><th className="px-2 py-3 font-medium"><CustomerText message="m_ca5839e38a15" /></th><th className="px-2 py-3 font-medium"><CustomerText message="m_a1c35dab2c37" /></th><th className="px-2 py-3 font-medium"><CustomerText message="m_920e413c7d41" /></th></tr></RecordTableHeader><tbody>{query.data?.map((shipment) => <tr key={shipment.id} className="border-b last:border-0"><td className="px-2 py-3"><RecordLink asChild><Link to="/sample-shipping/$shipmentId" params={{ shipmentId: shipment.id }} search={{ listPage: list.page, listSearch: list.search, listStatus: list.status }} >{shipment.shipmentNumber}</Link></RecordLink><p className="mt-1 text-xs text-muted-foreground">{shipment.destinationName}</p></td><td className="px-2 py-3">{shipment.authorizationReference}<p className="mt-1 text-xs text-muted-foreground">{sourceLabel(shipment.authorizationSource)}</p></td><td className="px-2 py-3">{text('shipment_tubes_assigned', { p0: shipment.crosswalk.filter((item) => item.supplierTubeBarcode).length, p1: shipment.crosswalk.length })}</td><td className="px-2 py-3"><DomainStatusBadge status={shipment.status} tones={shippingTones}>{statusLabel(shipment.status)}</DomainStatusBadge></td></tr>)}</tbody></table></div> : !query.isLoading && !query.error ? <EmptyState title={<CustomerText message="m_2dd22517ea1b" />}><CustomerText message="m_6ee9dab71688" /></EmptyState> : null}
          <RecordPagination data={pageQuery.isError ? undefined : pageQuery.data} busy={pageQuery.isFetching} onPage={page => list.change({ listPage: page })} />
        </CardContent>
      </Card>
    </main>
  )
}
