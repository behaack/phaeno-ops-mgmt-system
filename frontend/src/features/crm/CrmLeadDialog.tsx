import { useEffect, useState } from "react";
import type { CrmLead, CrmLeadInput, CrmLeadKind } from "#/api/crm";
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
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { CrmOwnerSelect } from "./CrmOwnerSelect";

export function CrmLeadDialog({
  open,
  lead,
  pending,
  error,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  lead?: CrmLead | null;
  pending: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CrmLeadInput) => void;
}) {
  const [kind, setKind] = useState<CrmLeadKind>("Individual");
  useEffect(() => {
    if (open) setKind(lead?.kind ?? "Individual");
  }, [open, lead]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            onSubmit({
              kind,
              displayName: String(data.get("displayName") ?? "").trim(),
              companyName: nullable(data, "companyName"),
              firstName: nullable(data, "firstName"),
              lastName: nullable(data, "lastName"),
              email: nullable(data, "email"),
              phone: nullable(data, "phone"),
              source: nullable(data, "source"),
              nextAction: nullable(data, "nextAction"),
              ownerUserId: nullable(data, "ownerUserId"),
              tags: split(data, "tags"),
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>{lead ? "Edit lead" : "New lead"}</DialogTitle>
            <DialogDescription>
              Capture an unqualified commercial signal before creating durable
              Company, Contact, or Opportunity records.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4">
            <Field label="Lead type" id="lead-kind">
              <select
                id="lead-kind"
                value={kind}
                onChange={(event) => setKind(event.target.value as CrmLeadKind)}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="Individual">Individual</option>
                <option value="Company">Company</option>
              </select>
            </Field>
            <Field label="Display name *" id="lead-name">
              <Input
                id="lead-name"
                name="displayName"
                required
                defaultValue={lead?.displayName}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" id="lead-first">
                <Input
                  id="lead-first"
                  name="firstName"
                  defaultValue={lead?.firstName ?? ""}
                />
              </Field>
              <Field label="Last name" id="lead-last">
                <Input
                  id="lead-last"
                  name="lastName"
                  defaultValue={lead?.lastName ?? ""}
                />
              </Field>
            </div>
            <Field
              label={kind === "Company" ? "Company name *" : "Company name"}
              id="lead-company"
            >
              <Input
                id="lead-company"
                name="companyName"
                required={kind === "Company"}
                defaultValue={lead?.companyName ?? ""}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" id="lead-email">
                <Input
                  id="lead-email"
                  name="email"
                  type="email"
                  defaultValue={lead?.email ?? ""}
                />
              </Field>
              <Field label="Phone" id="lead-phone">
                <Input
                  id="lead-phone"
                  name="phone"
                  defaultValue={lead?.phone ?? ""}
                />
              </Field>
            </div>
            <Field label="Source" id="lead-source">
              <Input
                id="lead-source"
                name="source"
                defaultValue={lead?.source ?? ""}
                placeholder="Website, referral, event, outbound…"
              />
            </Field>
            <Field label="Owner" id="lead-owner">
              <CrmOwnerSelect
                id="lead-owner"
                enabled={open}
                currentOwnerId={lead?.ownerUserId}
                currentOwnerName={lead?.ownerName}
                defaultLabel={lead ? "Keep current owner" : "Assign to me"}
              />
            </Field>
            <Field label="Next action" id="lead-next">
              <Textarea
                id="lead-next"
                name="nextAction"
                defaultValue={lead?.nextAction ?? ""}
              />
            </Field>
            <Field label="Tags" id="lead-tags">
              <Input
                id="lead-tags"
                name="tags"
                defaultValue={lead?.tags.join(", ") ?? ""}
              />
            </Field>
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
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : lead ? "Save changes" : "Create lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
function nullable(data: FormData, key: string) {
  const value = String(data.get(key) ?? "").trim();
  return value || null;
}
function split(data: FormData, key: string) {
  return String(data.get(key) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}
