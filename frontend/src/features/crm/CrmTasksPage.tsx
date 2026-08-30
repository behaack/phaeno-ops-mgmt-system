import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  apiErrorMessage,
  changeCrmTaskStatus,
  listCrmTasks,
  type CrmTask,
  type CrmTaskStatus,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { CrmSavedViewBar } from "./CrmSavedViewBar";

export function CrmTasksPage() {
  const client = useQueryClient();
  const [status, setStatus] = useState<CrmTaskStatus | "">("");
  const [overdue, setOverdue] = useState(false);
  const [change, setChange] = useState<{
    task: CrmTask;
    status: CrmTaskStatus;
  } | null>(null);
  const query = useQuery({
    queryKey: ["crm-tasks", status, overdue],
    queryFn: () =>
      listCrmTasks({
        status: status || undefined,
        overdueOnly: overdue,
        pageSize: 100,
      }),
  });
  const mutation = useMutation({
    mutationFn: ({
      task,
      next,
      reason,
    }: {
      task: CrmTask;
      next: CrmTaskStatus;
      reason: string | null;
    }) => changeCrmTaskStatus(task.id, next, reason, task.version),
    onSuccess: async () => {
      setChange(null);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["crm-tasks"] }),
        client.invalidateQueries({ queryKey: ["crm-dashboard"] }),
      ]);
    },
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
          </div>
          <CrmSavedViewBar
            recordType="Task"
            currentFilter={{ status, overdue }}
            onApply={(filter) => {
              setStatus(isTaskStatus(filter.status) ? filter.status : "");
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
                  <th className="p-3">
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
                      {task.status !== "Completed" &&
                      task.status !== "Cancelled" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setChange({ task, status: "Completed" })
                          }
                        >
                          Update
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!query.isLoading && !(query.data?.items.length ?? 0) ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No tasks match this view.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
      <TaskStatusDialog
        value={change}
        pending={mutation.isPending}
        error={mutation.error}
        onOpenChange={(open) => {
          if (!open) setChange(null);
        }}
        onSubmit={(next, reason) =>
          change && mutation.mutate({ task: change.task, next, reason })
        }
      />
    </main>
  );
}
function TaskStatusDialog({
  value,
  pending,
  error,
  onOpenChange,
  onSubmit,
}: {
  value: { task: CrmTask; status: CrmTaskStatus } | null;
  pending: boolean;
  error: unknown;
  onOpenChange: (open: boolean) => void;
  onSubmit: (next: CrmTaskStatus, reason: string | null) => void;
}) {
  const [next, setNext] = useState<CrmTaskStatus>("Completed");
  return (
    <Dialog open={Boolean(value)} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const text = String(
              new FormData(event.currentTarget).get("reason") ?? "",
            ).trim();
            onSubmit(next, text || null);
          }}
        >
          <DialogHeader>
            <DialogTitle>Update task status</DialogTitle>
            <DialogDescription>{value?.task.title}</DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{apiErrorMessage(error)}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="task-next-status">New status</Label>
              <select
                id="task-next-status"
                value={next}
                onChange={(event) =>
                  setNext(event.target.value as CrmTaskStatus)
                }
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="Open">Open</option>
                <option value="InProgress">In progress</option>
                <option value="Blocked">Blocked</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="task-status-reason">
                Reason {next === "Blocked" ? "*" : ""}
              </Label>
              <Textarea
                id="task-status-reason"
                name="reason"
                required={next === "Blocked"}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            {next === "Blocked" ? (
              <span className="mr-auto text-xs text-muted-foreground">
                * Required
              </span>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              Save status
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function recordLink(task: CrmTask) {
  if (task.opportunityId)
    return (
      <Link
        to="/crm/opportunities/$opportunityId"
        params={{ opportunityId: task.opportunityId }}
        className="hover:underline"
      >
        {task.opportunityName}
      </Link>
    );
  if (task.leadId)
    return (
      <Link
        to="/crm/leads/$leadId"
        params={{ leadId: task.leadId }}
        className="hover:underline"
      >
        {task.leadName}
      </Link>
    );
  if (task.contactId)
    return (
      <Link
        to="/crm/contacts/$contactId"
        params={{ contactId: task.contactId }}
        className="hover:underline"
      >
        {task.contactName}
      </Link>
    );
  if (task.companyId)
    return (
      <Link
        to="/crm/companies/$companyId"
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
