import { CrmTaskActions, useCrmTaskDialogs } from "./CrmTaskActions";
import { CrmClearFilters, useCrmSearch, useCrmState, CrmListPagination } from "./CrmListNavigation";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import {
  apiErrorMessage,
  listCrmTasks,
  type CrmTask,
  type CrmTaskStatus,
} from "#/api/crm";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { CrmSavedViewBar } from "./CrmSavedViewBar";

export function CrmTasksPage() {
  const taskActions = useCrmTaskDialogs();
  const [draftSearch, setDraftSearch, search, setSearch] = useCrmSearch();
  const [page, setPage] = useCrmState<number>("page", 1);
  const [status, setStatus] = useCrmState<CrmTaskStatus | "">("status", "");
  const [overdue, setOverdue] = useCrmState<boolean>("overdue", false);
  const [dueSoon, setDueSoon] = useCrmState<boolean>("dueSoon", false);
  const query = useQuery({
    queryKey: ["crm-tasks", status, overdue, dueSoon, page, search],
    queryFn: () =>
      listCrmTasks({
        search,
        status: status || undefined,
        overdueOnly: overdue,
        dueSoonOnly: dueSoon,
        page, pageSize: 25,
      }),
  });
  return (
    <main className="page-wrap space-y-6 px-4 py-8">
      <section>
        <Badge variant="secondary" className="mb-3">
          Follow-up
        </Badge>
        <h1 className="text-3xl font-semibold">Tasks</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Manage due dates, reminders, ownership, blocking reasons, and
          completion across every CRM record.
        </p>
      </section>
      <Alert>
        <AlertTitle>Create tasks in context</AlertTitle>
        <AlertDescription>
          Open a Company, Contact, Lead, or Opportunity to create a linked task.
          This keeps follow-up from becoming an untraceable to-do item.
        </AlertDescription>
      </Alert>
      {query.error ? (
        <Alert variant="destructive">
          <AlertDescription>{apiErrorMessage(query.error)}</AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Task queue</CardTitle>
          <CardDescription>
            Overdue and urgent work rises to the top.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="grid w-full min-w-0 gap-1.5 md:w-auto md:flex-1">
              <Label htmlFor="crm-list-search">Search</Label>
              <Input id="crm-list-search" className="h-9" value={draftSearch} onChange={event => setDraftSearch(event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="task-status-filter">Status</Label>
              <select
                id="task-status-filter"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as CrmTaskStatus | "")
                }
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="">All statuses</option>
                {[
                  "Open",
                  "InProgress",
                  "Blocked",
                  "Completed",
                  "Cancelled",
                ].map((value) => (
                  <option key={value} value={value}>
                    {spaced(value)}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm">
              <input
                type="checkbox"
                checked={overdue}
                onChange={(event) => setOverdue(event.target.checked)}
              />
              Overdue only
            </label>
            <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm"><input type="checkbox" checked={dueSoon} onChange={event => setDueSoon(event.target.checked)} />Due in 7 days</label>
          </div>
          <CrmClearFilters />
          <CrmSavedViewBar
            recordType="Task"
            currentFilter={{ status, overdue, dueSoon, search }}
            onApply={(filter) => {
              setSearch(typeof filter.search === "string" ? filter.search : "");
              setStatus(isTaskStatus(filter.status) ? filter.status : "");
              setDueSoon(filter.dueSoon === true);
              setOverdue(filter.overdue === true);
            }}
          />
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">Task</th>
                  <th className="p-3">Related record</th>
                  <th className="p-3">Owner</th>
                  <th className="p-3">Due</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Status</th>
                  <th className="relative p-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(query.data?.items ?? []).map((task) => (
                  <tr key={task.id}>
                    <td className="p-3">
                      <p className="font-medium">{task.title}</p>
                      {task.description ? (
                        <p className="mt-1 max-w-sm truncate text-xs text-muted-foreground">
                          {task.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="p-3">{recordLink(task)}</td>
                    <td className="p-3">{task.ownerName}</td>
                    <td
                      className={`p-3 ${isOverdue(task) ? "font-semibold text-destructive" : ""}`}
                    >
                      {task.dueAt ? formatDate(task.dueAt) : "—"}
                    </td>
                    <td className="p-3">{task.priority}</td>
                    <td className="p-3">
                      <Badge
                        variant={
                          task.status === "Blocked" ? "destructive" : "outline"
                        }
                      >
                        {spaced(task.status)}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <CrmTaskActions task={task} actions={taskActions} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!query.isLoading && !query.error && !(query.data?.items.length ?? 0) ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No tasks match this view.
              </p>
            ) : null}
          </div>
          <CrmListPagination result={query.data} page={page} onPageChange={setPage} busy={query.isFetching} />
        </CardContent>
      </Card>

      {taskActions.dialogs}
    </main>
  );
}
function recordLink(task: CrmTask) {
  if (task.opportunityId)
    return (
      <Link
        to="/crm/opportunities/$opportunityId" search={previous => previous}
        params={{ opportunityId: task.opportunityId }}
        className="hover:underline"
      >
        {task.opportunityName}
      </Link>
    );
  if (task.leadId)
    return (
      <Link
        to="/crm/leads/$leadId" search={previous => previous}
        params={{ leadId: task.leadId }}
        className="hover:underline"
      >
        {task.leadName}
      </Link>
    );
  if (task.contactId)
    return (
      <Link
        to="/crm/contacts/$contactId" search={previous => previous}
        params={{ contactId: task.contactId }}
        className="hover:underline"
      >
        {task.contactName}
      </Link>
    );
  if (task.companyId)
    return (
      <Link
        to="/crm/companies/$companyId" search={previous => previous}
        params={{ companyId: task.companyId }}
        className="hover:underline"
      >
        {task.companyName}
      </Link>
    );
  return "—";
}
function isOverdue(task: CrmTask) {
  return Boolean(
    task.dueAt &&
    new Date(task.dueAt) < new Date() &&
    task.status !== "Completed" &&
    task.status !== "Cancelled",
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
function spaced(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2");
}
function isTaskStatus(value: unknown): value is CrmTaskStatus {
  return ["Open", "InProgress", "Blocked", "Completed", "Cancelled"].includes(
    String(value),
  );
}
