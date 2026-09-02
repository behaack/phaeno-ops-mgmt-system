import { useEffect, useState } from 'react'

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
import { OrderingAuthorizationField } from './OrderingAuthorizationField'

export function AccountCreationRecoveryDialog({
  error,
  isPending,
  onConfirm,
  onOpenChange,
  request,
}: {
  error?: string
  isPending: boolean
  onConfirm: (orderingAuthorized: boolean) => void
  onOpenChange: (open: boolean) => void
  request: RelationshipRequest | null
}) {
  const [orderingAuthorized, setOrderingAuthorized] = useState(true)

  useEffect(() => {
    if (request) setOrderingAuthorized(true)
  }, [request])

  const enablesCustomerAccess = request?.requestedOrganizationKind === 'Customer'

  return (
    <Dialog open={Boolean(request)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Portal access enablement</DialogTitle>
          <DialogDescription>
            Recover this approved Company request by creating its internal access scope.
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
            {enablesCustomerAccess ? (
              <OrderingAuthorizationField
                id="account-recovery-ordering-authorized"
                checked={orderingAuthorized}
                disabled={isPending}
                onCheckedChange={setOrderingAuthorized}
              />
            ) : null}
            <p className="text-sm text-muted-foreground">
              The Company starts with pending Portal readiness. This recovery does not
              invite users, create an order, or mark the request completed.
            </p>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Keep incomplete
          </Button>
          <Button type="button" disabled={isPending} onClick={() => onConfirm(orderingAuthorized)}>
            {isPending ? 'Enabling…' : 'Enable Portal access'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
