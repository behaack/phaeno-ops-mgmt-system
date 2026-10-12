import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
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
          <DialogTitle><CustomerSourceText source={"Convert Prospect to"} /> {targetKind}</DialogTitle>
          <DialogDescription>
            <CustomerSourceText source={"Convert"} /> {organization.name} <CustomerSourceText source={"in place. Its identifier, request\r\n            history, invitations, memberships, and explicit data grants remain\r\n            unchanged."} />
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          <CustomerSourceText source={"Conversion does not grant a service, activate Portal readiness,\r\n          configure pricing, or place an order. Complete those steps separately."} />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            <CustomerSourceText source={"Keep as Prospect"} />
          </Button>
          <Button type="button" disabled={isPending} onClick={onConfirm}>
            {isPending ? <CustomerSourceText source={"Converting…"} /> : `Convert to ${targetKind}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
