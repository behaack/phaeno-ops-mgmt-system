import { useEffect, useState } from "react";

import type {
  CrmCommunicationPreference,
  CrmContact,
  CrmContactInput,
} from "#/api/crm";
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

export function CrmContactDialog({
  open,
  contact,
  pending,
  error,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  contact?: CrmContact | null;
  pending: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CrmContactInput) => void;
}) {
  const [preference, setPreference] =
    useState<CrmCommunicationPreference>("Unknown");
  useEffect(() => {
    if (open) setPreference(contact?.communicationPreference ?? "Unknown");
  }, [open, contact]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            onSubmit({
              firstName: String(data.get("firstName") ?? "").trim(),
              lastName: String(data.get("lastName") ?? "").trim(),
              email: nullable(data, "email"),
              phone: nullable(data, "phone"),
              ownerUserId: nullable(data, "ownerUserId"),
              communicationPreference: preference,
              lawfulContactBasis: nullable(data, "lawfulContactBasis"),
              communicationNotes: nullable(data, "communicationNotes"),
              tags: split(data, "tags"),
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {contact ? "Edit contact" : "New contact"}
            </DialogTitle>
            <DialogDescription>
              Keep identity and communication preferences in one durable
              record. Add Company-specific titles through relationships.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name *" id="contact-first">
                <Input
                  id="contact-first"
                  name="firstName"
                  required
                  maxLength={100}
                  defaultValue={contact?.firstName}
                />
              </Field>
              <Field label="Last name *" id="contact-last">
                <Input
                  id="contact-last"
                  name="lastName"
                  required
                  maxLength={100}
                  defaultValue={contact?.lastName}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" id="contact-email">
                <Input
                  id="contact-email"
                  name="email"
                  type="email"
                  defaultValue={contact?.email ?? ""}
                />
              </Field>
              <Field label="Phone" id="contact-phone">
                <Input
                  id="contact-phone"
                  name="phone"
                  defaultValue={contact?.phone ?? ""}
                />
              </Field>
            </div>
            <Field label="Communication preference" id="contact-preference">
              <select
                id="contact-preference"
                value={preference}
                onChange={(event) =>
                  setPreference(
                    event.target.value as CrmCommunicationPreference,
                  )
                }
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="Unknown">Unknown</option>
                <option value="Permitted">Permitted</option>
                <option value="OptedOut">Opted out</option>
                <option value="DoNotContact">Do not contact</option>
              </select>
            </Field>
            <Field label="Owner" id="contact-owner">
              <CrmOwnerSelect
                id="contact-owner"
                enabled={open}
                currentOwnerId={contact?.ownerUserId}
                currentOwnerName={contact?.ownerName}
                defaultLabel={contact ? "Keep current owner" : "Assign to me"}
              />
            </Field>
            <Field label="Lawful contact basis" id="contact-basis">
              <Input
                id="contact-basis"
                name="lawfulContactBasis"
                defaultValue={contact?.lawfulContactBasis ?? ""}
                placeholder="For example: existing business relationship"
              />
            </Field>
            <Field label="Communication notes" id="contact-notes">
              <Textarea
                id="contact-notes"
                name="communicationNotes"
                rows={3}
                defaultValue={contact?.communicationNotes ?? ""}
              />
            </Field>
            <Field label="Tags" id="contact-tags">
              <Input
                id="contact-tags"
                name="tags"
                defaultValue={contact?.tags.join(", ") ?? ""}
                placeholder="Comma-separated"
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
              {pending
                ? "Saving…"
                : contact
                  ? "Save changes"
                  : "Create contact"}
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
