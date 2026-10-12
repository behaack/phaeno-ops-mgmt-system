import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import {
  apiErrorMessage,
  existingAccessScopeCandidate,
  type RelationshipRequest,
} from '#/api/organization-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'

export function AccountCreationRecoveryDialog({
  error,
  isPending,
  onConfirm,
  onOpenChange,
  request,
}: {
  error?: unknown
  isPending: boolean
  onConfirm: (existingOrganizationId?: string) => void
  onOpenChange: (open: boolean) => void
  request: RelationshipRequest | null
}) {
  const reuseCandidate = existingAccessScopeCandidate(error)

  return (
    <Dialog open={Boolean(request)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle><CustomerSourceText source={"Complete Portal access enablement"} /></DialogTitle>
          <DialogDescription>
            <CustomerSourceText source={"Recover this approved Company request by creating its internal access scope."} />
          </DialogDescription>
        </DialogHeader>
        {reuseCandidate ? (
          <Alert>
            <AlertTitle><CustomerSourceText source={"Existing access scope found"} /></AlertTitle>
            <AlertDescription>
              {reuseCandidate.organizationName} <CustomerSourceText source={"already has an active unlinked"} />{' '}
              {reuseCandidate.organizationKind} <CustomerSourceText source={"access scope. Confirm reuse to\r\n              preserve its users, orders, invitations, and history."} />
            </AlertDescription>
          </Alert>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{<CustomerSourceText source={apiErrorMessage(error)} />}</AlertDescription>
          </Alert>
        ) : null}
        {request ? (
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{request.candidateOrganizationName}</span>
                <Badge variant="outline">{request.requestedOrganizationKind}</Badge>
                <Badge variant="outline">{request.requestNumber}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{request.summary}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              <CustomerSourceText source={"The Company starts with pending Portal readiness. This recovery does not\r\n              invite users, change product or service access, create an order, or mark\r\n              the request completed."} />
            </p>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            <CustomerSourceText source={"Keep incomplete"} />
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={() => onConfirm(reuseCandidate?.organizationId)}
          >
            {isPending
              ? <CustomerSourceText source={"Enabling…"} />
              : reuseCandidate
                ? 'Use existing access scope'
                : 'Enable Portal access'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
