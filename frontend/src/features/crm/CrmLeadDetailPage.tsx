import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  apiErrorMessage,
  changeCrmLead,
  convertCrmLead,
  getCrmLead,
  listCrmCompanies,
  listCrmPipelines,
  updateCrmLead,
  type CrmCompany,
  type CrmLeadInput,
  type CrmPipeline,
} from "#/api/crm";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { Checkbox } from "#/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Label } from "#/components/ui/label";
import { Input } from "#/components/ui/input";
import { FieldError } from "#/components/ui/field";
import { Textarea } from "#/components/ui/textarea";
import { CrmActionsMenu } from "./CrmActionsMenu";
import { CrmCustomFields } from "./CrmCustomFields";
import { CrmLeadDialog } from "./CrmLeadDialog";
import { CrmRecordWork } from "./CrmRecordWork";

export function CrmLeadDetailPage({ leadId }: { leadId: string }) {
  const client = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [decision, setDecision] = useState<"qualify" | "disqualify" | null>(
    null,
  );
  const [convertOpen, setConvertOpen] = useState(false);
  const query = useQuery({
    queryKey: ["crm-lead", leadId],
    queryFn: () => getCrmLead(leadId),
  });
  const companyChoices = useQuery({
    queryKey: ["crm-companies", "lead-conversion"],
    queryFn: () => listCrmCompanies({ pageSize: 100 }),
    enabled: convertOpen,
  });
  const pipelineChoices = useQuery({
    queryKey: ["crm-pipelines", "lead-conversion"],
    queryFn: () => listCrmPipelines(),
    enabled: convertOpen,
  });
  const lead = query.data;
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["crm-lead", leadId] }),
      client.invalidateQueries({ queryKey: ["crm-leads"] }),
      client.invalidateQueries({ queryKey: ["crm-activities", leadId] }),
    ]);
  };
  const edit = useMutation({
    mutationFn: (input: CrmLeadInput) =>
      updateCrmLead(leadId, { ...input, version: lead?.version ?? 0 }),
    onSuccess: async () => {
      setEditOpen(false);
      await refresh();
    },
  });
  const status = useMutation({
    mutationFn: ({
      action,
      explanation,
    }: {
      action: "working" | "qualify" | "disqualify";
      explanation: string;
    }) => changeCrmLead(leadId, action, explanation, lead?.version ?? 0),
    onSuccess: async () => {
      setDecision(null);
      await refresh();
    },
  });
  const convert = useMutation({
    mutationFn: (input: LeadConversionInput) =>
      convertCrmLead(leadId, {
        ...input,
        version: lead?.version ?? 0,
      }),
    onSuccess: async () => {
      setConvertOpen(false);
      await refresh();
    },
  });
  if (!lead)
    return (
      <main className="page-wrap px-4 py-8">
        <p role="status" className="text-sm text-muted-foreground">
          {query.isLoading ? "Loading lead…" : "The lead could not be loaded."}
        </p>
      </main>
    );
  const mutable = lead.status !== "Converted" && lead.status !== "Disqualified";
  return (
    <main className="page-wrap space-y-6 px-4 py-8">
      <Button asChild variant="ghost" size="sm">
        <Link to="/crm/leads" search={previous => previous}>
          <ArrowLeft data-icon="inline-start" />
          Back to leads
        </Link>
      </Button>
      <section className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div>
          <div className="mb-3 flex gap-2">
            <Badge variant="secondary">{lead.kind} lead</Badge>
            <Badge variant="outline">{lead.status}</Badge>
          </div>
          <h1 className="text-3xl font-semibold">{lead.displayName}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {lead.companyName ?? "No company recorded"} · owned by{" "}
            {lead.ownerName}
          </p>
        </div>
        <div className="flex items-start">
          <CrmActionsMenu label={`Actions for ${lead.displayName}`} items={[
            mutable && { label: "Edit", onSelect: () => setEditOpen(true) },
            lead.status === "New" && {
              label: "Start working", disabled: status.isPending,
              onSelect: () => status.mutate({ action: "working", explanation: "Work started." }),
            },
            (lead.status === "New" || lead.status === "Working") && {
              label: "Qualify", disabled: status.isPending, onSelect: () => setDecision("qualify"),
            },
            (lead.status === "New" || lead.status === "Working") && {
              label: "Disqualify", destructive: true, disabled: status.isPending, onSelect: () => setDecision("disqualify"),
            },
            lead.status === "Qualified" && { label: "Convert lead", onSelect: () => setConvertOpen(true) },
          ]} />
        </div>
      </section>
      {edit.error || status.error || convert.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {apiErrorMessage(edit.error ?? status.error ?? convert.error)}
          </AlertDescription>
        </Alert>
      ) : null}
      {convert.data?.duplicateWarnings.length ? (
        <Alert>
          <AlertTitle>Duplicate warnings</AlertTitle>
          <AlertDescription>
            {convert.data.duplicateWarnings.join(" ")}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Lead details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Info label="Email" value={lead.email ?? "Not recorded"} />
              <Info label="Phone" value={lead.phone ?? "Not recorded"} />
              <Info label="Source" value={lead.source ?? "Not recorded"} />
              <Info label="Owner" value={lead.ownerName} />
              <Info
                label="Next action"
                value={lead.nextAction ?? "Not recorded"}
                wide
              />
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Qualification record</CardTitle>
            <CardDescription>
              The reasoning remains visible after conversion.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {lead.status === "Qualified" || lead.status === "Converted" ? (
              <dl>
                <Info
                  label="Qualification notes"
                  value={lead.qualificationNotes ?? "No notes recorded"}
                  wide
                />
              </dl>
            ) : lead.status === "Disqualified" ? (
              <dl>
                <Info
                  label="Disqualification reason"
                  value={lead.disqualificationReason ?? "No reason recorded"}
                  wide
                />
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                No qualification decision has been recorded.
              </p>
            )}
            {lead.convertedCompanyId ? (
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link
                    to="/crm/companies/$companyId"
                    params={{ companyId: lead.convertedCompanyId }}
                  >
                    Open Company
                  </Link>
                </Button>
                {lead.convertedOpportunityId ? (
                  <Button asChild size="sm" variant="outline">
                    <Link
                      to="/crm/opportunities/$opportunityId"
                      params={{ opportunityId: lead.convertedOpportunityId }}
                    >
                      Open Opportunity
                    </Link>
                  </Button>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
      <CrmCustomFields recordType="Lead" recordId={leadId} />
      <CrmRecordWork links={{ leadId }} />
      <CrmLeadDialog
        open={editOpen}
        lead={lead}
        pending={edit.isPending}
        error={edit.error ? apiErrorMessage(edit.error) : undefined}
        onOpenChange={setEditOpen}
        onSubmit={(input) => edit.mutate(input)}
      />
      <DecisionDialog
        action={decision}
        pending={status.isPending}
        error={status.error}
        onOpenChange={(open) => {
          if (!open) setDecision(null);
        }}
        onSubmit={(explanation) =>
          decision && status.mutate({ action: decision, explanation })
        }
      />
      {convertOpen ? (
        <ConfirmConvert
          lead={lead}
          companies={companyChoices.data?.items ?? []}
          pipelines={pipelineChoices.data ?? []}
          pending={convert.isPending}
          error={convert.error}
          onOpenChange={setConvertOpen}
          onConfirm={(input) => convert.mutate(input)}
        />
      ) : null}
    </main>
  );
}
function DecisionDialog({
  action,
  pending,
  error,
  onOpenChange,
  onSubmit,
}: {
  action: "qualify" | "disqualify" | null;
  pending: boolean;
  error: unknown;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: string) => void;
}) {
  return (
    <Dialog open={Boolean(action)} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(
              String(
                new FormData(event.currentTarget).get("explanation") ?? "",
              ).trim(),
            );
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {action === "qualify" ? "Qualify lead" : "Disqualify lead"}
            </DialogTitle>
            <DialogDescription>
              Record the commercial reasoning so the decision can be understood
              later.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{apiErrorMessage(error)}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-1.5">
            <Label htmlFor="lead-decision">Explanation *</Label>
            <Textarea id="lead-decision" name="explanation" required rows={5} />
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
              Save decision
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function ConfirmConvert({
  lead,
  companies,
  pipelines,
  pending,
  error,
  onOpenChange,
  onConfirm,
}: {
  lead: {
    kind: "Individual" | "Company";
    displayName: string;
    companyName: string | null;
  };
  companies: CrmCompany[];
  pipelines: CrmPipeline[];
  pending: boolean;
  error: unknown;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: LeadConversionInput) => void;
}) {
  const [companySelection, setCompanySelection] = useState(
    lead.kind === "Company" ? "create" : "",
  );
  const createCompany = companySelection === "create";
  const existingCompanyId = createCompany ? null : companySelection || null;
  const [createContact, setCreateContact] = useState(
    lead.kind === "Individual",
  );
  const [createOpportunity, setCreateOpportunity] = useState(true);
  const needsCompanyName = createCompany && !lead.companyName?.trim();
  const form = useForm({
    defaultValues: {
      companyName: "",
      opportunityName: `${lead.displayName} opportunity`,
      pipelineId: "",
    },
    resolver: zodResolver(z.object({
      companyName: z.string().trim(),
      opportunityName: z.string().trim(),
      pipelineId: z.string(),
    }).superRefine((values, context) => {
      if (needsCompanyName && !values.companyName) {
        context.addIssue({ code: "custom", path: ["companyName"], message: "Enter a company name." });
      }
      if (needsCompanyName && values.companyName.length > 255) {
        context.addIssue({ code: "custom", path: ["companyName"], message: "Use 255 characters or fewer." });
      }
      if (createOpportunity && !values.opportunityName) {
        context.addIssue({ code: "custom", path: ["opportunityName"], message: "Enter an opportunity name." });
      }
    })),
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const companyAvailable = Boolean(existingCompanyId) || createCompany;
  const hasConversionOutput =
    companyAvailable || createContact || createOpportunity;
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form
          noValidate
          onSubmit={form.handleSubmit((values) => {
            onConfirm({
              existingCompanyId,
              createCompany,
              companyName: needsCompanyName ? values.companyName : null,
              createContact,
              createOpportunity,
              opportunityName: createOpportunity ? values.opportunityName : null,
              pipelineId: createOpportunity ? values.pipelineId || null : null,
            });
          })}
        >
          <DialogHeader>
            <DialogTitle>Convert qualified lead</DialogTitle>
            <DialogDescription>
              Choose the durable records to create or associate. Duplicate
              matches stop unsafe creation, and conversion never grants Portal
              access.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{apiErrorMessage(error)}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="lead-company">Company</Label>
              <select
                id="lead-company"
                value={companySelection}
                onChange={(event) => setCompanySelection(event.target.value)}
                aria-describedby={
                  createCompany && !needsCompanyName ? "lead-company-description" : undefined
                }
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="">No company</option>
                <option value="create">Create company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              {createCompany && !needsCompanyName ? (
                <p
                  id="lead-company-description"
                  className="text-sm text-muted-foreground"
                >
                  Company name: {lead.companyName}
                </p>
              ) : null}
            </div>
            {needsCompanyName ? (
              <div className="grid gap-1.5">
                <Label htmlFor="lead-company-name">Company name *</Label>
                <Input
                  id="lead-company-name"
                  required
                  maxLength={255}
                  {...form.register("companyName")}
                  aria-invalid={Boolean(form.formState.errors.companyName)}
                  aria-describedby={form.formState.errors.companyName ? "lead-company-name-error" : undefined}
                />
                <FieldError id="lead-company-name-error">{form.formState.errors.companyName?.message}</FieldError>
              </div>
            ) : null}
            <CheckRow
              id="lead-create-contact"
              checked={createContact}
              onChange={setCreateContact}
              label="Create a Contact from this lead"
            />
            <CheckRow
              id="lead-create-opportunity"
              checked={createOpportunity}
              onChange={setCreateOpportunity}
              label="Create an Opportunity"
            />
            {createOpportunity ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="lead-opportunity-name">
                    Opportunity name *
                  </Label>
                  <Input
                    id="lead-opportunity-name"
                    required
                    {...form.register("opportunityName")}
                    aria-invalid={Boolean(form.formState.errors.opportunityName)}
                    aria-describedby={form.formState.errors.opportunityName ? "lead-opportunity-name-error" : undefined}
                  />
                  <FieldError id="lead-opportunity-name-error">{form.formState.errors.opportunityName?.message}</FieldError>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="lead-pipeline">Pipeline</Label>
                  <select
                    id="lead-pipeline"
                    {...form.register("pipelineId")}
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">Default pipeline</option>
                    {pipelines.map((pipeline) => (
                      <option key={pipeline.id} value={pipeline.id}>
                        {pipeline.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}
            {createOpportunity && !companyAvailable ? (
              <Alert variant="destructive">
                <AlertDescription>
                  Select or create a Company before creating an Opportunity.
                </AlertDescription>
              </Alert>
            ) : null}
            {!hasConversionOutput ? (
              <Alert variant="destructive">
                <AlertDescription>
                  Select at least one durable CRM record to create or associate.
                </AlertDescription>
              </Alert>
            ) : null}
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
            <Button
              type="submit"
              disabled={
                pending ||
                !hasConversionOutput ||
                (createOpportunity && !companyAvailable)
              }
            >
              {pending ? "Converting…" : "Convert lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type LeadConversionInput = Omit<
  Parameters<typeof convertCrmLead>[1],
  "version"
>;

function CheckRow({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
      />
      <Label htmlFor={id} className="cursor-pointer">
        {label}
      </Label>
    </div>
  );
}
function Info({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm font-medium">{value}</dd>
    </div>
  );
}
