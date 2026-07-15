import type { Organization } from '#/api/organization-management'
import { Alert, AlertDescription } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'

export function OrganizationConversionDialog({
  error,
  isPending,
  onConfirm,
  onOpenChange,
  organization,
  targetKind,
}: {
  error?: string
  isPending: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
  organization: Organization
  targetKind: 'Customer' | 'Partner' | null
}) {
  if (!targetKind) return null

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert Prospect to {targetKind}</DialogTitle>
          <DialogDescription>
            Convert {organization.name} in place. Its identifier, request
            history, invitations, memberships, and explicit data grants remain
            unchanged.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Conversion does not grant a service, activate Portal readiness,
          configure pricing, or place an order. Complete those steps separately.
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Keep as Prospect
          </Button>
          <Button type="button" disabled={isPending} onClick={onConfirm}>
            {isPending ? 'Converting…' : `Convert to ${targetKind}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
