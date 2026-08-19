import type { RelationshipRequest } from '#/api/organization-management'
import { Alert, AlertDescription } from '#/components/ui/alert'
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
  error?: string
  isPending: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
  request: RelationshipRequest | null
}) {
  return (
    <Dialog open={Boolean(request)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete account creation</DialogTitle>
          <DialogDescription>
            Recover this approved request by creating and associating its Portal account.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
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
              The account starts with pending Portal readiness. This recovery does not
              invite users, activate requested services, create an order, or mark the
              request applied.
            </p>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Keep incomplete
          </Button>
          <Button type="button" disabled={isPending} onClick={onConfirm}>
            {isPending ? 'Creating…' : 'Create and open account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
