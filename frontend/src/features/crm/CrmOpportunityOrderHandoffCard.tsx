import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";

import {
  apiErrorMessage,
  createCrmHandoff,
  listCrmHandoffs,
  type CrmHandoff,
  type CrmOpportunity,
} from "#/api/crm";
import { listEligibleCustomerCompanies } from "#/api/order-management";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { Label } from "#/components/ui/label";
import { RequiredDialogFooter, RequiredFieldName } from "#/components/ui/required-field";
import { Textarea } from "#/components/ui/textarea";
import { LabJobDetailsDialog } from "#/features/orders/LabJobDetailsDialog";

export function CrmOpportunityOrderHandoffCard({ opportunity }: { opportunity: CrmOpportunity }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [startHandoff, setStartHandoff] = useState<CrmHandoff | null>(null);
  const handoffs = useQuery({
    queryKey: ["crm-handoffs", opportunity.companyId],
    queryFn: () => listCrmHandoffs(opportunity.companyId),
  });
  const customers = useQuery({
    queryKey: ["order-operations", "eligible-customers"],
    queryFn: listEligibleCustomerCompanies,
  });
  const create = useMutation({
    mutationFn: (input: { summary: string; internalNotes: string | null }) =>
      createCrmHandoff(opportunity.companyId, {
        type: "CustomWork",
        opportunityId: opportunity.id,
        idempotencyKey: crypto.randomUUID(),
        requestedOrganizationKind: "Customer",
        requestedServices: ["PSeqLabService"],
        summary: input.summary,
        internalNotes: input.internalNotes,
      }),
    onSuccess: async () => {
      setCreateOpen(false);
      await client.invalidateQueries({ queryKey: ["crm-handoffs", opportunity.companyId] });
    },
  });
  const opportunityHandoffs = (handoffs.data ?? []).filter((item) => item.opportunityId === opportunity.id);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Customer order handoffs</CardTitle>
          <CardDescription>
            A reviewed handoff preserves the commercial decision before Order operations begins pricing.
          </CardDescription>
          <CardAction>
            <Button type="button" variant="outline" disabled={opportunity.stageCategory !== "Won"} onClick={() => setCreateOpen(true)}>
              <Plus data-icon="inline-start" /> Create order handoff
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-3">
          {opportunity.stageCategory !== "Won" ? (
            <Alert><AlertDescription>Move this Opportunity to Won before creating a Customer order handoff.</AlertDescription></Alert>
          ) : null}
          {handoffs.error ? <Alert variant="destructive"><AlertDescription>{apiErrorMessage(handoffs.error)}</AlertDescription></Alert> : null}
          {opportunityHandoffs.map((handoff) => (
            <div key={handoff.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{handoff.requestNumber}</span>
                  <Badge variant="outline">{formatStatus(handoff.status)}</Badge>
                </div>
                {handoff.orderBlockingReason ? <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{handoff.orderBlockingReason}</p> : null}
              </div>
              {handoff.orderId ? (
                <Button asChild variant="outline">
                  <Link to="/order-operations/$workflow/$orderId" params={{ workflow: "lab", orderId: handoff.orderId }}>
                    Open {handoff.orderNumber ?? "order"}
                  </Link>
                </Button>
              ) : handoff.canStartCustomerOrder && handoff.organizationId ? (
                <Button type="button" onClick={() => setStartHandoff(handoff)}>Start Customer order</Button>
              ) : (
                <Button asChild variant="outline"><Link to="/crm/companies">Review Company access</Link></Button>
              )}
            </div>
          ))}
          {!handoffs.isLoading && opportunityHandoffs.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">No Customer order handoffs have been created for this Opportunity.</p>
          ) : null}
        </CardContent>
      </Card>

      <CreateOpportunityHandoffDialog
        open={createOpen}
        pending={create.isPending}
        error={create.error}
        onOpenChange={setCreateOpen}
        onSubmit={(input) => create.mutate(input)}
      />
      <LabJobDetailsDialog
        open={Boolean(startHandoff)}
        platformOrganizations={customers.data ?? []}
        sourceHandoff={startHandoff?.organizationId ? {
          requestId: startHandoff.relationshipRequestId,
          requestNumber: startHandoff.requestNumber,
          organizationId: startHandoff.organizationId,
          organizationName: customers.data?.find((value) => value.id === startHandoff.organizationId)?.name ?? opportunity.companyName,
          companyName: opportunity.companyName,
          opportunityName: opportunity.name,
        } : null}
        onOpenChange={(open) => { if (!open) setStartHandoff(null) }}
        onSaved={async (order) => {
          setStartHandoff(null);
          await Promise.all([
            client.invalidateQueries({ queryKey: ["crm-handoffs", opportunity.companyId] }),
            client.invalidateQueries({ queryKey: ["order-intake-handoffs"] }),
          ]);
          await navigate({ to: "/order-operations/$workflow/$orderId", params: { workflow: "lab", orderId: order.id } });
        }}
      />
    </>
  );
}

function CreateOpportunityHandoffDialog({ open, pending, error, onOpenChange, onSubmit }: {
  open: boolean;
  pending: boolean;
  error: unknown;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { summary: string; internalNotes: string | null }) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 [--dialog-inset:0px]">
        <form onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          onSubmit({ summary: String(data.get("summary") ?? "").trim(), internalNotes: nullable(data.get("notes")) });
        }}>
          <DialogHeader className="px-5 pt-5 pr-12">
            <DialogTitle>Create Customer order handoff</DialogTitle>
            <DialogDescription>
              This creates a pending Customer PSeq Lab Service request. Company request review is required before an order can start.
            </DialogDescription>
          </DialogHeader>
          {error ? <div className="px-5"><Alert variant="destructive"><AlertDescription>{apiErrorMessage(error)}</AlertDescription></Alert></div> : null}
          <div className="space-y-4 px-5 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="opportunity-handoff-summary"><RequiredFieldName>Commercial summary</RequiredFieldName></Label>
              <Textarea id="opportunity-handoff-summary" name="summary" required rows={4} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="opportunity-handoff-notes">Internal notes</Label>
              <Textarea id="opportunity-handoff-notes" name="notes" rows={3} />
            </div>
          </div>
          <RequiredDialogFooter className="border-t bg-muted/40 px-5 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create pending handoff"}</Button>
          </RequiredDialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function nullable(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function formatStatus(value: string) {
  return value === "PendingReview" ? "Pending review" : value;
}
