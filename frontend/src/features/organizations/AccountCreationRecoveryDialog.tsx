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
          <DialogTitle>Complete Portal access enablement</DialogTitle>
          <DialogDescription>
            Recover this approved Company request by creating its internal access scope.
          </DialogDescription>
        </DialogHeader>
        {reuseCandidate ? (
          <Alert>
            <AlertTitle>Existing access scope found</AlertTitle>
            <AlertDescription>
              {reuseCandidate.organizationName} already has an active unlinked{' '}
              {reuseCandidate.organizationKind} access scope. Confirm reuse to
              preserve its users, orders, invitations, and history.
            </AlertDescription>
          </Alert>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{apiErrorMessage(error)}</AlertDescription>
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
              The Company starts with pending Portal readiness. This recovery does not
              invite users, change product or service access, create an order, or mark
              the request completed.
            </p>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Keep incomplete
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={() => onConfirm(reuseCandidate?.organizationId)}
          >
            {isPending
              ? 'Enabling…'
              : reuseCandidate
                ? 'Use existing access scope'
                : 'Enable Portal access'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
