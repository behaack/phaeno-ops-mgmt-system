import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ClipboardCheck,
  ReceiptText,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";
import { useState } from "react";

import {
  getOrderConfiguration,
  getOrderErrorMessage,
  getPlatformOrder,
  listNotificationMessages,
  listCommercialOrders,
  retryNotificationMessage,
  runPlatformAction,
  updateOperationalAssignment,
  type DataAssemblyRequest,
  type CommercialOrderListItem,
  type LabServiceOrder,
  type NotificationMessage,
  type PagedResult,
  type ReagentOrder,
} from "#/api/order-management";
import { listOrganizations } from "#/api/data-provisioning";
import { getLabWorkOrderByCommercialOrder } from "#/api/lab-operations";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import {
  WorkspaceSidebar,
  type WorkspaceSidebarItem,
} from "#/components/WorkspaceSidebar";
import { Button } from "#/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Label } from "#/components/ui/label";
import { Input } from "#/components/ui/input";
import {
  RequiredDialogFooter,
  RequiredFieldName,
} from "#/components/ui/required-field";
import { usePhaenoSession } from "#/features/auth/session-context";
import { humanizeStatus, OrderStatusBadge } from "./OrderStatusBadge";
import { CommercialOrderIntakePanel } from "./CommercialOrderIntakePanel";
import { CancellationDecisionPanel } from "./operations/CancellationDecisionPanel";
import { PlatformQuoteDialog } from "./operations/PlatformQuoteDialog";
import { ManualJournalEntryReport } from "./ManualJournalEntryReport";

type Workflow = "lab" | "reagent" | "assembly";
type OrderSection = "intake" | "orders" | "accounting";
type OperationalOrganization = {
  id: string;
  name: string;
  kind: "Phaeno" | "Prospect" | "Customer" | "Partner";
  isActive: boolean;
  portalReadiness: "NotReviewed" | "Pending" | "Ready" | "Blocked";
};

const orderSections: ReadonlyArray<WorkspaceSidebarItem<OrderSection>> = [
  {
    value: "intake",
    label: "Order intake",
    description: "Enter and review commercial demand",
    icon: ClipboardCheck,
  },
  {
    value: "orders",
    label: "Orders",
    description: "All commercial orders by order type",
    icon: ShoppingCart,
  },
  {
    value: "accounting",
    label: "Accounting",
    description: "Journal-entry source report and notice recovery",
    icon: ReceiptText,
  },
];

export function OrderOperationsPage({
  workflow,
  orderId,
}: {
  workflow?: Workflow;
  orderId?: string;
}) {
  const { authProvider, session } = usePhaenoSession();
  const canView = Boolean(session?.capabilities.canViewAllOperationalOrders);
  const apiEnabled = canView && authProvider !== "mock";
  if (!canView)
    return (
      <main className="page-wrap px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Order operations unavailable</AlertTitle>
          <AlertDescription>
            A Phaeno platform administrator is required.
          </AlertDescription>
        </Alert>
      </main>
    );
  if (workflow && orderId)
    return (
      <OperationalDetail
        workflow={workflow}
        orderId={orderId}
        apiEnabled={apiEnabled}
        userId={session?.user?.id ?? null}
      />
    );
  return (
    <OperationalQueues
      apiEnabled={apiEnabled}
      mock={authProvider === "mock"}
      userId={session?.user?.id ?? null}
    />
  );
}

function OperationalQueues({
  apiEnabled,
  mock,
  userId,
}: {
  apiEnabled: boolean;
  mock: boolean;
  userId: string | null;
}) {
  const [section, setSection] = useState<OrderSection>("intake");
  const organizations = useQuery({
    queryKey: ["order-operations", "organizations"],
    queryFn: listOrganizations,
    enabled: apiEnabled,
  });
  const notifications = useQuery({
    queryKey: ["order-notifications"],
    queryFn: () => listNotificationMessages(),
    enabled: apiEnabled && section === "accounting",
    refetchInterval:
      apiEnabled && section === "accounting" ? 30_000 : false,
  });
  const organizationOptions =
    organizations.data?.map((item) => ({
      id: item.id,
      name: item.name,
      kind: item.kind,
      isActive: item.isActive,
      portalReadiness: item.portalReadiness,
    })) ?? [];
  return (
    <main className="py-8">
      <WorkspaceSidebar
        workspaceLabel="Order operations"
        items={orderSections}
        value={section}
        onValueChange={setSection}
      >
        <div className="page-wrap px-4">
          <section className="mb-6 max-w-3xl">
            <h1 className="text-3xl font-semibold">Order operations</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Commercial intake, quotes, customer approvals, orders, holds,
              cancellations, accounting source records, and notification recovery.
            </p>
          </section>
          {mock ? (
            <Alert className="mb-5">
              <AlertTitle>
                Connected queues are paused in mock-session mode
              </AlertTitle>
              <AlertDescription>
                Use a real Phaeno session to work operational orders.
              </AlertDescription>
            </Alert>
          ) : null}
          {section === "intake" ? (
            <CommercialOrderIntakePanel apiEnabled={apiEnabled} mock={mock} />
          ) : null}
          {section === "orders" ? <CommercialOrdersCard apiEnabled={apiEnabled} userId={userId} organizations={organizationOptions} /> : null}
          {section === "accounting" ? (
            <AccountingWorkspace
              notifications={notifications}
              apiEnabled={apiEnabled}
            />
          ) : null}
        </div>
      </WorkspaceSidebar>
    </main>
  );
}

function CommercialOrdersCard({
  apiEnabled,
  userId,
  organizations,
}: {
  apiEnabled: boolean;
  userId: string | null;
  organizations: OperationalOrganization[];
}) {
  const [search, setSearch] = useState("");
  const [orderType, setOrderType] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [status, setStatus] = useState("");
  const [view, setView] = useState<"all" | "mine" | "unassigned" | "overdue" | "holds">("all");
  const query = useQuery({
    queryKey: ["commercial-orders", search, orderType, organizationId, status, view],
    queryFn: () => listCommercialOrders({
      search: search || undefined,
      orderType: orderType || undefined,
      organizationId: organizationId || undefined,
      status: status || undefined,
      assignedToUserId: view === "mine" ? userId ?? undefined : undefined,
      unassigned: view === "unassigned" || undefined,
      overdue: view === "overdue" || undefined,
      holds: view === "holds" || undefined,
    }),
    enabled: apiEnabled,
  });
  const statuses = orderType
    ? workflowStatuses[workflowForOrderType(orderType)]
    : [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Commercial orders</CardTitle>
        <CardDescription>
          One list for every order type. Open an order for commercial terms, approval, and customer-facing status; perform physical work in Lab operations.
        </CardDescription>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div><Label htmlFor="commercial-order-search">Search</Label><Input id="commercial-order-search" className="mt-2" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <div><Label htmlFor="commercial-order-type">Order type</Label><select id="commercial-order-type" className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" value={orderType} onChange={(event) => { setOrderType(event.target.value); setStatus(""); }}><option value="">All order types</option><option value="PSeqLabService">PSeq Lab Service</option><option value="PSeqKit">PSeq Kit</option><option value="DataAssembly">Data Assembly</option></select></div>
          <div><Label htmlFor="commercial-order-organization">Organization</Label><select id="commercial-order-organization" className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}><option value="">All organizations</option>{organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
          <div><Label htmlFor="commercial-order-status">Status</Label><select id="commercial-order-status" className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" value={status} disabled={!orderType} onChange={(event) => setStatus(event.target.value)}><option value="">{orderType ? 'All statuses' : 'Choose an order type first'}</option>{statuses.map((item) => <option key={item} value={item}>{humanizeStatus(item)}</option>)}</select></div>
          <div><Label htmlFor="commercial-order-view">View</Label><select id="commercial-order-view" className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" value={view} onChange={(event) => setView(event.target.value as typeof view)}><option value="all">All orders</option><option value="mine">Assigned to me</option><option value="unassigned">Unassigned</option><option value="overdue">Overdue</option><option value="holds">On hold</option></select></div>
        </div>
      </CardHeader>
      <CardContent>
        {query.error ? <Alert variant="destructive"><AlertTitle>Orders could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(query.error, "Try refreshing.")}</AlertDescription></Alert> : null}
        {query.isLoading ? <p role="status">Loading orders…</p> : null}
        <div className="divide-y">
          {query.data?.items.map((item) => {
            const workflow = workflowForOrderType(item.orderType);
            return (
              <div key={`${item.orderType}-${item.id}`} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to="/order-operations/$workflow/$orderId" params={{ workflow, orderId: item.id }} className="font-medium text-primary hover:underline">{item.reference || item.number}</Link>
                    <span className="rounded-full border bg-muted px-2.5 py-1 text-xs font-medium">{orderTypeLabel(item.orderType)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.number} · {organizations.find((organization) => organization.id === item.organizationId)?.name ?? item.organizationId} · updated {formatDateTime(item.updatedAt)}</p>
                </div>
                <div className="flex items-center gap-2">{item.isOverdue ? <span className="text-xs font-medium text-destructive">Overdue</span> : null}<OrderStatusBadge status={item.status} /></div>
              </div>
            );
          })}
        </div>
        {!query.isLoading && !query.data?.items.length ? <p className="py-8 text-center text-sm text-muted-foreground">No orders match these filters.</p> : null}
      </CardContent>
    </Card>
  );
}

function AccountingWorkspace({
  notifications,
  apiEnabled,
}: {
  notifications: UseQueryResult<PagedResult<NotificationMessage>, Error>;
  apiEnabled: boolean;
}) {
  const client = useQueryClient();
  const retryNotification = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      retryNotificationMessage(id, version),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["order-notifications"] }),
  });

  return (
    <div className="space-y-5">
      <ManualJournalEntryReport apiEnabled={apiEnabled} />
      <Card>
        <CardHeader>
          <CardTitle>Notification delivery queue</CardTitle>
          <CardDescription>
            Failed delivery and expired sending claims remain visible. Recover a
            message after delivery configuration is corrected; interrupted sends
            are also retried automatically after their lease expires.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {notifications.error ? (
            <Alert variant="destructive">
              <AlertTitle>Notification queue unavailable</AlertTitle>
              <AlertDescription>
                {getOrderErrorMessage(notifications.error, "Try refreshing.")}
              </AlertDescription>
            </Alert>
          ) : null}
          {retryNotification.error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Notification was not queued again</AlertTitle>
              <AlertDescription>
                {getOrderErrorMessage(
                  retryNotification.error,
                  "Refresh the queue and try again.",
                )}
              </AlertDescription>
            </Alert>
          ) : null}
          {notifications.isLoading ? (
            <p role="status">Loading notification messages…</p>
          ) : null}
          <div className="divide-y">
            {notifications.data?.items.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-medium">{item.subject}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.workflowType} · {humanizeStatus(item.eventType)} ·
                    Attempts {item.attemptCount}
                  </p>
                  {item.lastError ? (
                    <p className="mt-1 text-sm text-destructive">
                      {item.lastError}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <OrderStatusBadge status={item.status} />
                  {item.canRetry ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!apiEnabled || retryNotification.isPending}
                      onClick={() =>
                        retryNotification.mutate({
                          id: item.id,
                          version: item.version,
                        })
                      }
                    >
                      <RefreshCw data-icon="inline-start" />
                      {item.status === "Sending" ? "Recover" : "Retry"}
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          {!notifications.isLoading && !notifications.data?.items.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No notification messages.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function OperationalDetail({
  workflow,
  orderId,
  apiEnabled,
  userId,
}: {
  workflow: Workflow;
  orderId: string;
  apiEnabled: boolean;
  userId: string | null;
}) {
  const client = useQueryClient();
  const [reasonDialog, setReasonDialog] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [assignmentDueAt, setAssignmentDueAt] = useState("");
  const order = useQuery({
    queryKey: ["platform-order", workflow, orderId],
    queryFn: () => getPlatformOrder(workflow, orderId),
    enabled: apiEnabled,
  });
  const configuration = useQuery({
    queryKey: ["order-configuration"],
    queryFn: getOrderConfiguration,
    enabled: apiEnabled,
  });
  const labWork = useQuery({
    queryKey: ["lab-work-by-commercial-order", orderId],
    queryFn: () => getLabWorkOrderByCommercialOrder(orderId),
    enabled: apiEnabled && workflow === "lab" && Boolean(order.data) && ["PlacedAwaitingSamples", "InProgress", "ResultsAvailable", "Completed"].includes(order.data?.status ?? ""),
    retry: false,
  });
  async function refresh() {
    await client.invalidateQueries({
      queryKey: ["platform-order", workflow, orderId],
    });
    await client.invalidateQueries({ queryKey: ["platform-orders", workflow] });
  }
  const mutation = useMutation({
    mutationFn: async (input: { action: string; reason?: string }) => {
      if (!order.data) throw new Error("The order has not loaded.");
      const base =
        workflow === "lab"
          ? `lab-service-orders/${orderId}`
          : workflow === "reagent"
            ? `reagent-orders/${orderId}`
            : `data-assembly-requests/${orderId}`;
      return runPlatformAction(
        `${base}/${input.action}`,
        {
          version: order.data.version,
          reason: input.reason,
          internalNote: null,
        },
        workflow === "reagent" && input.action === "fulfill",
      );
    },
    onSuccess: async () => {
      setReasonDialog(null);
      setReason("");
      await refresh();
    },
  });
  const assignment = useMutation({
    mutationFn: async (assignToMe: boolean) => {
      if (!order.data) throw new Error("The order has not loaded.");
      return updateOperationalAssignment(workflow, orderId, {
        version: order.data.version,
        assignToMe,
        dueAt:
          assignToMe && assignmentDueAt
            ? new Date(assignmentDueAt).toISOString()
            : null,
      });
    },
    onSuccess: async () => {
      setAssignmentOpen(false);
      await refresh();
    },
  });
  if (!apiEnabled)
    return (
      <main className="page-wrap px-4 py-8">
        <Alert>
          <AlertTitle>Connected operations are paused</AlertTitle>
          <AlertDescription>Use a real Phaeno session.</AlertDescription>
        </Alert>
      </main>
    );
  if (order.isLoading)
    return (
      <main className="page-wrap px-4 py-8">
        <p role="status">Loading operational record…</p>
      </main>
    );
  if (order.error || !order.data)
    return (
      <main className="page-wrap px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Operational record could not be loaded</AlertTitle>
          <AlertDescription>
            {getOrderErrorMessage(
              order.error,
              "Return to the operations queue.",
            )}
          </AlertDescription>
        </Alert>
      </main>
    );
  const item = order.data;
  const number = "orderNumber" in item ? item.orderNumber : item.requestNumber;
  const recordTitle =
    workflow === "lab" && "customerReference" in item
      ? item.customerReference
      : number;
  const actions = commercialActions(workflow, item.status, "resumeStatus" in item ? item.resumeStatus : null);
  return (
    <main className="page-wrap px-4 py-8">
      <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link to="/order-operations" className="hover:underline">
              Order operations
            </Link>{" "}
            / {humanizeStatus(workflow)} /{" "}
            <span className="font-mono">{number}</span>
          </p>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-3xl font-semibold">{recordTitle}</h1>
            <OrderStatusBadge status={item.status} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {workflow === "lab" ? (
              <>
                Job number <span className="font-mono">{number}</span> ·{" "}
              </>
            ) : null}
            Organization {item.organizationId} ·{" "}
            {item.assignedToUserId
              ? item.assignedToUserId === userId
                ? "Assigned to you"
                : "Assigned to another operator"
              : "Unassigned"}
            {item.dueAt ? ` · Due ${formatDateTime(item.dueAt)}` : ""} · Version{" "}
            {item.version}
          </p>
          {workflow === "lab" && "description" in item && item.description ? (
            <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-6">
              {item.description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setAssignmentDueAt(
                item.dueAt
                  ? new Date(item.dueAt).toISOString().slice(0, 16)
                  : "",
              );
              setAssignmentOpen(true);
            }}
          >
            Assignment
          </Button>
          {workflow === "lab" && labWork.data ? (
            <Button asChild variant="outline">
              <Link to="/lab-operations/$workOrderId" params={{ workOrderId: labWork.data.id }} search={{ section: undefined }}>
                Open Lab work
              </Link>
            </Button>
          ) : null}
          {actions.map((action) => (
            <Button
              key={action.path}
              type="button"
              variant={action.reason ? "outline" : "default"}
              disabled={mutation.isPending}
              onClick={() =>
                action.reason
                  ? setReasonDialog(action.path)
                  : mutation.mutate({ action: action.path })
              }
            >
              {action.label}
            </Button>
          ))}
        </div>
      </section>
      {mutation.error || assignment.error ? (
        <Alert variant="destructive" className="mb-5">
          <AlertTitle>Operation failed</AlertTitle>
          <AlertDescription>
            {getOrderErrorMessage(
              mutation.error ?? assignment.error,
              "Reload the record and try again.",
            )}
          </AlertDescription>
        </Alert>
      ) : null}
      {configuration.error ? (
        <Alert variant="destructive" className="mb-5">
          <AlertTitle>Commercial configuration could not be loaded</AlertTitle>
          <AlertDescription>
            {getOrderErrorMessage(
              configuration.error,
              "Operational status changes remain available, but quote and catalog actions are paused.",
            )}
          </AlertDescription>
        </Alert>
      ) : null}
      <OperationalSummary workflow={workflow} item={item} />
      <CommercialOrderPanel
        workflow={workflow}
        item={item}
        catalogItems={configuration.data?.catalogItems ?? []}
        labWorkOrderId={labWork.data?.id ?? null}
        onSaved={refresh}
      />
      <Dialog
        open={reasonDialog !== null}
        onOpenChange={(open) => !open && setReasonDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reasonDialog ? humanizeStatus(reasonDialog) : "Record action"}{" "}
              for {number}
            </DialogTitle>
            <DialogDescription>
              Provide a tenant-safe reason. Internal scientific or commercial
              details must remain in the separate internal record.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="operationReason">
              <RequiredFieldName>Tenant-safe reason</RequiredFieldName>
            </Label>
            <textarea
              id="operationReason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-2 min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            />
          </div>
          <RequiredDialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={!reason.trim() || mutation.isPending}
              onClick={() =>
                reasonDialog &&
                mutation.mutate({ action: reasonDialog, reason })
              }
            >
              Apply status change
            </Button>
          </RequiredDialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={assignmentOpen} onOpenChange={setAssignmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Operational assignment</DialogTitle>
            <DialogDescription>
              Assign this record to yourself and set an optional operational due
              time. Dedicated staff-role routing remains outside the initial
              release.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="assignmentDueAt">Due at</Label>
            <Input
              id="assignmentDueAt"
              type="datetime-local"
              className="mt-2"
              value={assignmentDueAt}
              onChange={(event) => setAssignmentDueAt(event.target.value)}
            />
          </div>
          <DialogFooter>
            {item.assignedToUserId ? (
              <Button
                type="button"
                variant="outline"
                disabled={assignment.isPending}
                onClick={() => assignment.mutate(false)}
              >
                Clear assignment
              </Button>
            ) : null}
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={assignment.isPending}
              onClick={() => assignment.mutate(true)}
            >
              {item.assignedToUserId === userId
                ? "Update my assignment"
                : "Assign to me"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function OperationalSummary({
  workflow,
  item,
}: {
  workflow: Workflow;
  item: LabServiceOrder | ReagentOrder | DataAssemblyRequest;
}) {
  const internalNote = item.internalNote;
  const timeline = item.timeline;
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Operational facts</CardTitle>
          <CardDescription>
            Tenant-visible and internal evidence remain separated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workflow === "lab" && "samples" in item ? (
            <div className="space-y-5">
              {item.commercialSource ? (
                <Alert>
                  <AlertTitle>CRM commercial source</AlertTitle>
                  <AlertDescription>
                    <Link to="/crm/companies/$companyId" params={{ companyId: item.commercialSource.companyId }} className="font-medium hover:underline">
                      {item.commercialSource.companyName}
                    </Link>
                    {item.commercialSource.opportunityId && item.commercialSource.opportunityName ? (
                      <> · <Link to="/crm/opportunities/$opportunityId" params={{ opportunityId: item.commercialSource.opportunityId }} className="font-medium hover:underline">{item.commercialSource.opportunityName}</Link></>
                    ) : null}
                    {` · ${item.commercialSource.requestNumber}`}
                  </AlertDescription>
                </Alert>
              ) : null}
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-medium">Committed sample count</dt>
                  <dd className="mt-1 text-muted-foreground">
                    {item.requestedSpecimenCount}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">Biological sources</dt>
                  <dd className="mt-1 text-muted-foreground">
                    {item.sourceGroups
                      .map(
                        (group) =>
                          `${group.biologicalSource} (${group.specimenCount})`,
                      )
                      .join(", ")}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">Storage requirements</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-muted-foreground">
                    {item.storageRequirements}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">Safety declaration</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-muted-foreground">
                    {item.safetyDeclaration}
                  </dd>
                </div>
              </dl>
              {item.samples.length > 0 ? (
                <ul className="divide-y border-t pt-2">
                  {item.samples.map((sample) => (
                    <li
                      key={sample.id}
                      className="flex justify-between gap-3 py-3"
                    >
                      <span>
                        {sample.customerSampleId}
                        {sample.accessionId ? ` · ${sample.accessionId}` : ""}
                      </span>
                      <OrderStatusBadge status={sample.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="border-t pt-4 text-sm text-muted-foreground">
                  The Customer can add individual samples after approving the
                  quote.
                </p>
              )}
            </div>
          ) : null}
          {workflow === "reagent" && "lines" in item ? (
            <ul className="divide-y">
              {item.lines.map((line) => (
                <li key={line.id} className="flex justify-between gap-3 py-3">
                  <span>
                    {line.description} · {line.remainingQuantity} remaining
                  </span>
                  <span>
                    {line.currency} {line.lineTotal.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {workflow === "assembly" && "inputFiles" in item ? (
            <div>
              <p className="text-sm">
                {item.profileName} v{item.assemblyProfileVersion}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {item.inputFiles.length} input file(s) ·{" "}
                {item.processingRuns.length} processing run(s) ·{" "}
                {item.outputReleases.length} output release(s)
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <div className="space-y-5">
        {item.tenantSafeReason ? (
          <Alert>
            <AlertTitle>Tenant-safe reason</AlertTitle>
            <AlertDescription>{item.tenantSafeReason}</AlertDescription>
          </Alert>
        ) : null}
        {internalNote ? (
          <Alert variant="destructive">
            <AlertTitle>Internal note</AlertTitle>
            <AlertDescription>{internalNote}</AlertDescription>
          </Alert>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle>Audit timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {timeline
                .slice()
                .reverse()
                .map((entry) => (
                  <li key={entry.id} className="border-l-2 pl-3 text-sm">
                    <strong>{humanizeStatus(entry.toStatus)}</strong>
                    <span className="block text-xs text-muted-foreground">
                      {formatDateTime(entry.occurredAt)}
                    </span>
                    {entry.internalNote ? (
                      <span className="mt-1 block text-destructive">
                        Internal: {entry.internalNote}
                      </span>
                    ) : null}
                  </li>
                ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CommercialOrderPanel({
  workflow,
  item,
  catalogItems,
  labWorkOrderId,
  onSaved,
}: {
  workflow: Workflow;
  item: LabServiceOrder | ReagentOrder | DataAssemblyRequest;
  catalogItems: Awaited<ReturnType<typeof getOrderConfiguration>>["catalogItems"];
  labWorkOrderId: string | null;
  onSaved: () => Promise<void>;
}) {
  const [quoteOpen, setQuoteOpen] = useState(false);
  const mayQuote = (workflow === "lab" || workflow === "assembly") && item.status === "QuoteInPreparation";
  const number = "orderNumber" in item ? item.orderNumber : item.requestNumber;
  const workflowPath = workflow === "lab" ? "lab-service-orders" : workflow === "reagent" ? "reagent-orders" : "data-assembly-requests";
  return (
    <div className="mt-5 space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Commercial control</CardTitle>
              <CardDescription>
                Quotes, approvals, cancellations, and the immutable order remain here. Physical fulfillment and scientific execution are performed in Lab operations.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {mayQuote ? <Button type="button" onClick={() => setQuoteOpen(true)}>Issue quote</Button> : null}
              {workflow === "lab" && labWorkOrderId ? <Button asChild variant="outline"><Link to="/lab-operations/$workOrderId" params={{ workOrderId: labWorkOrderId }} search={{ section: undefined }}>Open Lab work</Link></Button> : null}
              {workflow === "reagent" ? <Button asChild variant="outline"><Link to="/lab-operations/pseq-kit-orders/$orderId" params={{ orderId: item.id }} search={{ section: undefined }}>Open kit fulfillment</Link></Button> : null}
              {workflow === "assembly" ? <Button asChild variant="outline"><Link to="/lab-operations/data-assembly/$orderId" params={{ orderId: item.id }} search={{ section: undefined }}>Open data assembly</Link></Button> : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {workflow === "lab" && !labWorkOrderId
              ? "Lab work will be created when the Customer approves the commercial order and the accepted scope is authorized."
              : `Order ${number} is the commercial source record for the linked Lab workflow.`}
          </p>
        </CardContent>
      </Card>
      <CancellationDecisionPanel
        workflowPath={workflowPath}
        recordId={item.id}
        version={item.version}
        requests={item.cancellationRequests}
        reagentLines={workflow === "reagent" && "lines" in item ? item.lines : undefined}
        onSaved={onSaved}
      />
      {(workflow === "lab" || workflow === "assembly") ? (
        <PlatformQuoteDialog
          open={quoteOpen}
          workflow={workflow}
          recordId={item.id}
          version={item.version}
          defaultQuantity={workflow === "lab" && "requestedSpecimenCount" in item ? item.requestedSpecimenCount : undefined}
          catalogItems={catalogItems}
          onOpenChange={setQuoteOpen}
          onSaved={onSaved}
        />
      ) : null}
    </div>
  );
}

function commercialActions(workflow: Workflow, status: string, resumeStatus?: string | null) {
  if (workflow === "lab") {
    if (status === "SubmittedForQuote")
      return [
        { label: "Begin quote", path: "begin-quote", reason: false },
        { label: "Request changes", path: "request-changes", reason: true },
      ];
    if (status === "QuoteInPreparation")
      return [
        { label: "Request changes", path: "request-changes", reason: true },
        { label: "Decline request", path: "decline", reason: true },
      ];
    if (status === "OnHold")
      return [{ label: "Release hold", path: "release-hold", reason: true }];
    if (!["Completed", "Cancelled", "Declined"].includes(status))
      return [{ label: "Place on hold", path: "hold", reason: true }];
  }
  if (workflow === "reagent" && status === "UnderReview")
    return [
      { label: "Accept order", path: "accept", reason: false },
      { label: "Reject order", path: "reject", reason: true },
    ];
  if (workflow === "reagent" && status === "OnHold" && resumeStatus === "UnderReview")
    return [
      { label: "Release Commercial hold", path: "release-hold", reason: true },
      { label: "Reject order", path: "reject", reason: true },
    ];
  if (workflow === "assembly" && status === "QuoteInPreparation")
    return [
      { label: "Request Customer changes", path: "request-changes", reason: true },
      { label: "Reject request", path: "reject", reason: true },
    ];
  if (workflow === "assembly" && status === "OnHold" && resumeStatus === "QuoteInPreparation")
    return [
      { label: "Release Commercial hold", path: "release-hold", reason: true },
      { label: "Reject request", path: "reject", reason: true },
    ];
  return [];
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
function workflowForOrderType(orderType: string): Workflow {
  if (orderType === "PSeqKit") return "reagent";
  if (orderType === "DataAssembly") return "assembly";
  return "lab";
}

function orderTypeLabel(orderType: CommercialOrderListItem["orderType"]) {
  if (orderType === "PSeqKit") return "PSeq Kit";
  if (orderType === "DataAssembly") return "Data Assembly";
  return "PSeq Lab Service";
}

const workflowStatuses: Record<Workflow, string[]> = {
  lab: [
    "DraftRequest",
    "SubmittedForQuote",
    "ChangesRequested",
    "QuoteInPreparation",
    "QuoteIssued",
    "PlacedAwaitingSamples",
    "InProgress",
    "ResultsAvailable",
    "OnHold",
    "CancellationRequested",
    "Completed",
    "Cancelled",
    "Declined",
  ],
  reagent: [
    "Draft",
    "Placed",
    "UnderReview",
    "Accepted",
    "Processing",
    "PartiallyShipped",
    "Shipped",
    "OnHold",
    "CancellationRequested",
    "Fulfilled",
    "Cancelled",
    "Rejected",
  ],
  assembly: [
    "Draft",
    "Submitted",
    "IntakeValidation",
    "ChangesRequested",
    "QuoteInPreparation",
    "QuoteIssued",
    "PlacedQueued",
    "Processing",
    "OutputReview",
    "OnHold",
    "CancellationRequested",
    "Completed",
    "Cancelled",
    "Rejected",
  ],
};
