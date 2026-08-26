import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil } from "lucide-react";
import { useState } from "react";
import {
  apiErrorMessage,
  getCrmOpportunity,
  getCrmOpportunityHistory,
  listCrmCompanies,
  listCrmPipelines,
  moveCrmOpportunity,
  updateCrmOpportunity,
  type CrmOpportunityInput,
} from "#/api/crm";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { CrmCustomFields } from "./CrmCustomFields";
import { CrmOpportunityDialog } from "./CrmOpportunityDialog";
import { CrmOpportunityContacts } from "./CrmOpportunityContacts";
import { CrmRecordWork } from "./CrmRecordWork";

export function CrmOpportunityDetailPage({
  opportunityId,
}: {
  opportunityId: string;
}) {
  const client = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [stageId, setStageId] = useState("");
  const [reason, setReason] = useState("");
  const query = useQuery({
    queryKey: ["crm-opportunity", opportunityId],
    queryFn: () => getCrmOpportunity(opportunityId),
  });
  const opportunity = query.data;
  const pipelines = useQuery({
    queryKey: ["crm-pipelines"],
    queryFn: () => listCrmPipelines(),
  });
  const companies = useQuery({
    queryKey: ["crm-companies", "choices"],
    queryFn: () => listCrmCompanies({ pageSize: 100 }),
  });
  const history = useQuery({
    queryKey: ["crm-opportunity-history", opportunityId],
    queryFn: () => getCrmOpportunityHistory(opportunityId),
  });
  const refresh = async () =>
    Promise.all([
      client.invalidateQueries({
        queryKey: ["crm-opportunity", opportunityId],
      }),
      client.invalidateQueries({ queryKey: ["crm-opportunities"] }),
      client.invalidateQueries({
        queryKey: ["crm-opportunity-history", opportunityId],
      }),
      client.invalidateQueries({ queryKey: ["crm-activities", opportunityId] }),
      client.invalidateQueries({ queryKey: ["crm-dashboard"] }),
    ]);
  const edit = useMutation({
    mutationFn: (input: CrmOpportunityInput) =>
      updateCrmOpportunity(opportunityId, {
        ...input,
        version: opportunity?.version ?? 0,
      }),
    onSuccess: async () => {
      setEditOpen(false);
      await refresh();
    },
  });
  const move = useMutation({
    mutationFn: () =>
      moveCrmOpportunity(
        opportunityId,
        stageId,
        reason.trim() || null,
        opportunity?.version ?? 0,
      ),
    onSuccess: async () => {
      setStageId("");
      setReason("");
      await refresh();
    },
  });
  if (!opportunity)
    return (
      <main className="page-wrap px-4 py-8">
        <p role="status" className="text-sm text-muted-foreground">
          {query.isLoading
            ? "Loading opportunity…"
            : "The opportunity could not be loaded."}
        </p>
      </main>
    );
  const stages =
    pipelines.data
      ?.find((value) => value.id === opportunity.pipelineId)
      ?.stages.filter((value) => value.isActive) ?? [];
  return (
    <main className="page-wrap space-y-6 px-4 py-8">
      <Button asChild variant="ghost" size="sm">
        <Link to="/crm/opportunities">
          <ArrowLeft data-icon="inline-start" />
          Back to opportunities
        </Link>
      </Button>
      <section className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div>
          <div className="mb-3 flex gap-2">
            <Badge variant="secondary">Opportunity</Badge>
            <Badge variant="outline">{opportunity.stageName}</Badge>
          </div>
          <h1 className="text-3xl font-semibold">{opportunity.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            <Link
              to="/crm/companies/$companyId"
              params={{ companyId: opportunity.companyId }}
              className="hover:underline"
            >
              {opportunity.companyName}
            </Link>{" "}
            · {money(opportunity.amount, opportunity.currency)} ·{" "}
            {opportunity.probability}% probability
          </p>
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil data-icon="inline-start" />
          Edit
        </Button>
      </section>
      {edit.error || move.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {apiErrorMessage(edit.error ?? move.error)}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>Commercial details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Info
                label="Product interest"
                value={opportunity.productInterest ?? "Not recorded"}
              />
              <Info
                label="Expected close"
                value={opportunity.expectedCloseDate ?? "Not recorded"}
              />
              <Info
                label="Next step"
                value={opportunity.nextStep ?? "Not recorded"}
                wide
              />
              <Info
                label="Competitors"
                value={opportunity.competitors ?? "Not recorded"}
              />
              <Info label="Owner" value={opportunity.ownerName} />
              <Info
                label="Outcome reason"
                value={opportunity.outcomeReason ?? "Opportunity remains open"}
                wide
              />
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Move stage</CardTitle>
            <CardDescription>
              Every transition is recorded permanently.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="opportunity-stage">Stage</Label>
              <select
                id="opportunity-stage"
                value={stageId}
                onChange={(event) => setStageId(event.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Select stage</option>
                {stages
                  .filter((value) => value.id !== opportunity.stageId)
                  .map((value) => (
                    <option key={value.id} value={value.id}>
                      {value.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="stage-reason">Reason or context</Label>
              <Textarea
                id="stage-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
              />
            </div>
            <Button
              disabled={!stageId || move.isPending}
              onClick={() => move.mutate()}
            >
              {move.isPending ? "Moving…" : "Move opportunity"}
            </Button>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Stage history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(history.data ?? []).map((item) => (
            <div key={item.id} className="rounded-lg border p-3">
              <p className="font-medium">
                {item.fromStageName ?? "Created"} → {item.toStageName}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {item.reason ?? "No additional context"} · {item.changedByName}{" "}
                · {formatDate(item.changedAt)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
      <CrmOpportunityContacts opportunityId={opportunityId} />
      <CrmCustomFields recordType="Opportunity" recordId={opportunityId} />
      <CrmRecordWork links={{ opportunityId }} />
      <CrmOpportunityDialog
        open={editOpen}
        opportunity={opportunity}
        companies={companies.data?.items ?? []}
        pipelines={pipelines.data ?? []}
        pending={edit.isPending}
        error={edit.error ? apiErrorMessage(edit.error) : undefined}
        onOpenChange={setEditOpen}
        onSubmit={(input) => edit.mutate(input)}
      />
    </main>
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
function money(value: number | null, currency: string) {
  return value == null
    ? "Amount not recorded"
    : new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(value);
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
