import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listCrmOpportunityDepartments } from "#/api/crm";
import type {
  CrmCompany,
  CrmOpportunity,
  CrmOpportunityInput,
  CrmPipeline,
  CrmProductInterest,
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
import { Field as FormField, FieldDescription } from "#/components/ui/field";
import { NativeSelect } from "#/components/ui/native-select";
import { Textarea } from "#/components/ui/textarea";
import { CrmOwnerSelect } from "./CrmOwnerSelect";
import { CrmAssociationRecordCombobox } from "./CrmAssociationRecordCombobox";
import { CrmCollectionFeedback } from "./CrmCollectionFeedback";

export function CrmOpportunityDialog({
  open,
  opportunity,
  companies = [],
  companyId,
  pipelines,
  pending,
  error,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  opportunity?: CrmOpportunity | null;
  companies?: CrmCompany[];
  companyId?: string;
  pipelines: CrmPipeline[];
  pending: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CrmOpportunityInput) => void;
}) {
  const [pipelineId, setPipelineId] = useState("");
  const initialCompanyId = opportunity?.companyId ?? companyId ?? "";
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialCompanyId);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(opportunity?.departmentId ?? "");
  const companyName = opportunity?.companyName ?? companies.find(value => value.id === companyId)?.name;
  const departments = useQuery({
    queryKey: ["crm-opportunity-departments", selectedCompanyId],
    queryFn: () => listCrmOpportunityDepartments(selectedCompanyId),
    enabled: open && Boolean(selectedCompanyId),
  });
  const choices = departments.data ?? [];
  const departmentId = choices.length === 1 ? choices[0].id : selectedDepartmentId;
  const departmentsUnavailable = Boolean(selectedCompanyId) && (departments.isPending || departments.isError || departments.isFetching);
  const departmentRequired = choices.length > 1;
  useEffect(() => {
    if (open) {
      setSelectedCompanyId(initialCompanyId);
      setSelectedDepartmentId(opportunity?.departmentId ?? "");
    }
  }, [open, initialCompanyId, opportunity?.departmentId]);
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
            if (pending || departmentsUnavailable) return;
            const data = new FormData(event.currentTarget);
            const amount = nullable(data, "amount");
            onSubmit({
              name: String(data.get("name") ?? "").trim(),
              companyId: String(data.get("companyId") ?? ""),
              departmentId: departmentId || null,
              pipelineId,
              stageId: opportunity?.stageId ?? null,
              ownerUserId: nullable(data, "ownerUserId"),
              productInterest: nullable(
                data,
                "productInterest",
              ) as CrmProductInterest | null,
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
              explicit pipeline stage. The Opportunity Number is assigned
              automatically when the record is created.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid min-w-0 gap-4">
            <Field label="Opportunity name *" id="opportunity-name">
              <Input
                id="opportunity-name"
                name="name"
                required
                defaultValue={opportunity?.name}
              />
            </Field>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <Field label="Company *" id="opportunity-company">
                <CrmAssociationRecordCombobox
                  key={`${initialCompanyId}:${companyName}:${open}`}
                  id="opportunity-company"
                  name="companyId"
                  kind="company"
                  required
                  initialValue={initialCompanyId && companyName ? { id: initialCompanyId, label: companyName } : undefined}
                  onValueChange={value => { setSelectedCompanyId(value); setSelectedDepartmentId(""); }}
                />
              </Field>
              <Field label="Pipeline *" id="opportunity-pipeline">
                <NativeSelect
                  id="opportunity-pipeline"
                  value={pipelineId}
                  onChange={(event) => setPipelineId(event.target.value)}
                  required
                  disabled={Boolean(opportunity)}
                >
                  {pipelines
                    .filter((value) => value.isActive)
                    .map((pipeline) => (
                      <option key={pipeline.id} value={pipeline.id}>
                        {pipeline.name}
                      </option>
                    ))}
                </NativeSelect>
              </Field>
            </div>
            {selectedCompanyId ? <>
              <CrmCollectionFeedback name="Company departments" query={departments} />
              {departments.isSuccess && choices.length > 0 ? <Field label={departmentRequired ? "Department *" : "Department"} id="opportunity-department">
                <FieldDescription>{departmentRequired ? "Choose the Department this Opportunity belongs to." : "This Company's only active Department is selected automatically."}</FieldDescription>
                <NativeSelect id="opportunity-department" value={departmentId} required={departmentRequired}
                  disabled={departmentsUnavailable || choices.length === 1} onChange={event => setSelectedDepartmentId(event.target.value)}>
                  {departmentRequired ? <option value="">Select a Department</option> : null}
                  {choices.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}
                </NativeSelect>
              </Field> : null}
              {departments.isSuccess && choices.length === 0 ? <p className="text-sm text-muted-foreground">No active departments. This Opportunity belongs to the Company.</p> : null}
            </> : null}
            <div className="grid min-w-0 gap-4 sm:grid-cols-3">
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
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <Field label="Product interest" id="opportunity-product">
                <NativeSelect
                  id="opportunity-product"
                  name="productInterest"
                  defaultValue={opportunity?.productInterest ?? ""}
                >
                  <option value="">Not specified</option>
                  <option value="PSeqLabService">PSeq Lab Service</option>
                  <option value="PSeqKit">PSeq Kit</option>
                </NativeSelect>
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
            <Button type="submit" disabled={pending || !pipelineId || departmentsUnavailable}>
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
    <FormField className="min-w-0">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </FormField>
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
