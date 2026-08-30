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
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";

export function CrmMergeDialog({
  open,
  recordLabel,
  candidates,
  pending,
  error,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  recordLabel: string;
  candidates: Array<{ id: string; name: string }>;
  pending: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (targetId: string, reason: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            onSubmit(
              String(data.get("targetId")),
              String(data.get("reason") ?? "").trim(),
            );
          }}
        >
          <DialogHeader>
            <DialogTitle>Merge duplicate {recordLabel}</DialogTitle>
            <DialogDescription>
              Move associations and history to the selected target, preserve
              this record as an inactive alias, and write a permanent merge
              audit. This cannot be undone in the CRM interface.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="merge-target">Target record *</Label>
              <select
                id="merge-target"
                name="targetId"
                required
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Select the record to keep</option>
                {candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="merge-reason">Merge reason *</Label>
              <Textarea id="merge-reason" name="reason" required rows={4} />
            </div>
          </div>
          <DialogFooter>
            <span className="mr-auto text-xs text-muted-foreground">
              * Required
            </span>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Merging…" : "Merge records"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
