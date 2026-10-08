import type { CrmCompany } from "#/api/crm";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";

export function CrmCompanyLifecycleDialog({
  company,
  error,
  isPending,
  onConfirm,
  onOpenChange,
}: {
  company: CrmCompany | null;
  error?: string;
  isPending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const active = company?.isActive ?? true;
  const action = active ? "Deactivate" : "Reactivate";

  return (
    <Dialog open={Boolean(company)} onOpenChange={open => { if (!isPending) onOpenChange(open) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{action} company</DialogTitle>
          <DialogDescription>
            {active
              ? `Deactivate ${company?.name ?? "this company"}? It will be hidden from the active CRM directory, while its history remains available.`
              : `Reactivate ${company?.name ?? "this company"}? It will return to the active CRM directory.`}
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <p className="text-sm text-muted-foreground">
          {company?.accessOrganizationId
            ? active
              ? `This suspends access to ${company.name} for all of its Portal users. Users, service entitlements, orders, and history are retained.`
              : `This restores access to ${company.name} under its existing memberships and service entitlements. Review readiness before starting new work.`
            : 'This Company has no Portal access scope. This action changes the CRM directory record only; it does not create Portal access.'}
        </p>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={active ? "destructive" : "default"}
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? "Saving…" : `${action} company`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
