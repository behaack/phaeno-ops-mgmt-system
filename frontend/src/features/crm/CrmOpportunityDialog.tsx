import { useEffect, useState } from "react";
import type {
  CrmCompany,
  CrmOpportunity,
  CrmOpportunityInput,
  CrmPipeline,
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

export function CrmOpportunityDialog({
  open,
  opportunity,
  companies,
  pipelines,
  pending,
  error,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  opportunity?: CrmOpportunity | null;
  companies: CrmCompany[];
  pipelines: CrmPipeline[];
  pending: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CrmOpportunityInput) => void;
}) {
  const [pipelineId, setPipelineId] = useState("");
  useEffect(() => {
    if (open)
      setPipelineId(
        opportunity?.pipelineId ??
          pipelines.find((value) => value.isDefault)?.id ??
          pipelines[0]?.id ??
          "",
      );
  }, [open, opportunity, pipelines]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const amount = nullable(data, "amount");
            onSubmit({
              name: String(data.get("name") ?? "").trim(),
              companyId: String(data.get("companyId") ?? ""),
              pipelineId,
              stageId: opportunity?.stageId ?? null,
              ownerUserId: nullable(data, "ownerUserId"),
              productInterest: nullable(data, "productInterest"),
              amount: amount ? Number(amount) : null,
              currency: String(data.get("currency") ?? "USD").toUpperCase(),
              expectedCloseDate: nullable(data, "expectedCloseDate"),
              nextStep: nullable(data, "nextStep"),
              competitors: nullable(data, "competitors"),
              description: nullable(data, "description"),
              tags: split(data, "tags"),
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {opportunity ? "Edit opportunity" : "New opportunity"}
            </DialogTitle>
            <DialogDescription>
              Track commercial value, timing, ownership, next steps, and an
              explicit pipeline stage.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4">
            <Field label="Opportunity name *" id="opportunity-name">
              <Input
                id="opportunity-name"
                name="name"
                required
                defaultValue={opportunity?.name}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company *" id="opportunity-company">
                <select
                  id="opportunity-company"
                  name="companyId"
                  required
                  defaultValue={opportunity?.companyId ?? ""}
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="" disabled>
                    Select a Company
                  </option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Pipeline *" id="opportunity-pipeline">
                <select
                  id="opportunity-pipeline"
                  value={pipelineId}
                  onChange={(event) => setPipelineId(event.target.value)}
                  required
                  disabled={Boolean(opportunity)}
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  {pipelines
                    .filter((value) => value.isActive)
                    .map((pipeline) => (
                      <option key={pipeline.id} value={pipeline.id}>
                        {pipeline.name}
                      </option>
                    ))}
                </select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Amount" id="opportunity-amount">
                <Input
                  id="opportunity-amount"
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={opportunity?.amount ?? ""}
                />
              </Field>
              <Field label="Currency" id="opportunity-currency">
                <Input
                  id="opportunity-currency"
                  name="currency"
                  required
                  minLength={3}
                  maxLength={3}
                  defaultValue={opportunity?.currency ?? "USD"}
                />
              </Field>
              <Field label="Expected close" id="opportunity-close">
                <Input
                  id="opportunity-close"
                  name="expectedCloseDate"
                  type="date"
                  defaultValue={opportunity?.expectedCloseDate ?? ""}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Product interest" id="opportunity-product">
                <Input
                  id="opportunity-product"
                  name="productInterest"
                  defaultValue={opportunity?.productInterest ?? ""}
                />
              </Field>
              <Field label="Owner" id="opportunity-owner">
                <CrmOwnerSelect
                  id="opportunity-owner"
                  enabled={open}
                  currentOwnerId={opportunity?.ownerUserId}
                  currentOwnerName={opportunity?.ownerName}
                  defaultLabel={
                    opportunity ? "Keep current owner" : "Assign to me"
                  }
                />
              </Field>
            </div>
            <Field label="Next step" id="opportunity-next">
              <Textarea
                id="opportunity-next"
                name="nextStep"
                rows={2}
                defaultValue={opportunity?.nextStep ?? ""}
              />
            </Field>
            <Field label="Competitors" id="opportunity-competitors">
              <Input
                id="opportunity-competitors"
                name="competitors"
                defaultValue={opportunity?.competitors ?? ""}
              />
            </Field>
            <Field label="Description" id="opportunity-description">
              <Textarea
                id="opportunity-description"
                name="description"
                rows={3}
                defaultValue={opportunity?.description ?? ""}
              />
            </Field>
            <Field label="Tags" id="opportunity-tags">
              <Input
                id="opportunity-tags"
                name="tags"
                defaultValue={opportunity?.tags.join(", ") ?? ""}
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
            <Button type="submit" disabled={pending || !pipelineId}>
              {pending
                ? "Saving…"
                : opportunity
                  ? "Save changes"
                  : "Create opportunity"}
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
