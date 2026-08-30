import { useState } from "react";

import { apiErrorMessage, type CrmCompanyContact } from "#/api/crm";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
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
import { CrmRelationshipRoleSelect } from "./CrmRelationshipRoleSelect";

export type CrmCompanyContactUpdate = {
  jobTitle: string | null;
  relationshipRole: string | null;
  isPrimaryCompany: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
};

export function CrmCompanyContactEditDialog({
  value,
  pending,
  error,
  onOpenChange,
  onSubmit,
}: {
  value: CrmCompanyContact;
  pending: boolean;
  error: unknown;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: CrmCompanyContactUpdate) => void;
}) {
  const [primary, setPrimary] = useState(value.isPrimaryCompany);
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            onSubmit({
              jobTitle: nullable(data, "jobTitle"),
              relationshipRole: nullable(data, "role"),
              isPrimaryCompany: primary && !nullable(data, "effectiveTo"),
              effectiveFrom: String(data.get("effectiveFrom")),
              effectiveTo: nullable(data, "effectiveTo"),
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit Company relationship</DialogTitle>
            <DialogDescription>
              Update the job title, relationship role, primary Company, or
              effective dates. An end date preserves the relationship as
              history.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{apiErrorMessage(error)}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4">
            <Field label="Job title" id="association-edit-title">
              <Input
                id="association-edit-title"
                name="jobTitle"
                maxLength={150}
                defaultValue={value.jobTitle ?? ""}
              />
            </Field>
            <Field label="Relationship role" id="association-edit-role">
              <CrmRelationshipRoleSelect
                id="association-edit-role"
                defaultValue={value.relationshipRole ?? ""}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Effective from *" id="association-edit-start">
                <Input
                  id="association-edit-start"
                  name="effectiveFrom"
                  type="date"
                  required
                  defaultValue={value.effectiveFrom}
                />
              </Field>
              <Field label="Effective to" id="association-edit-end">
                <Input
                  id="association-edit-end"
                  name="effectiveTo"
                  type="date"
                  defaultValue={value.effectiveTo ?? ""}
                />
              </Field>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="association-edit-primary"
                checked={primary}
                onCheckedChange={(checked) => setPrimary(checked === true)}
              />
              <Label
                htmlFor="association-edit-primary"
                className="cursor-pointer"
              >
                Primary Company for this Contact
              </Label>
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
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save relationship"}
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
