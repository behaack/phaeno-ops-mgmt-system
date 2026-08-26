import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, MessageSquarePlus } from "lucide-react";
import { useState } from "react";

import {
  apiErrorMessage,
  changeCrmTaskStatus,
  createCrmActivity,
  createCrmTask,
  listCrmActivities,
  listCrmTasks,
  type CrmActivityType,
  type CrmTaskPriority,
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

type RecordLinks = {
  companyId?: string;
  contactId?: string;
  leadId?: string;
  opportunityId?: string;
};

export function CrmRecordWork({ links }: { links: RecordLinks }) {
  const client = useQueryClient();
  const [activityOpen, setActivityOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const key =
    links.companyId ?? links.contactId ?? links.leadId ?? links.opportunityId;
  const activities = useQuery({
    queryKey: ["crm-activities", key],
    queryFn: () => listCrmActivities({ ...links, pageSize: 50 }),
  });
  const tasks = useQuery({
    queryKey: ["crm-record-tasks", key],
    queryFn: () => listCrmTasks({ ...links, pageSize: 50 }),
  });
  const refresh = async () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ["crm-activities", key] }),
      client.invalidateQueries({ queryKey: ["crm-record-tasks", key] }),
      client.invalidateQueries({ queryKey: ["crm-dashboard"] }),
    ]);
  const activityMutation = useMutation({
    mutationFn: createCrmActivity,
    onSuccess: async () => {
      setActivityOpen(false);
      await refresh();
    },
  });
  const taskMutation = useMutation({
    mutationFn: createCrmTask,
    onSuccess: async () => {
      setTaskOpen(false);
      await refresh();
    },
  });
  const taskStatus = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      changeCrmTaskStatus(id, "Completed", null, version),
    onSuccess: refresh,
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Activity timeline</CardTitle>
            <CardDescription>
              Notes, calls, meetings, email, status changes, and Portal
              handoffs.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActivityOpen(true)}
          >
            <MessageSquarePlus data-icon="inline-start" />
            Log activity
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {(activities.data?.items ?? []).map((activity) => (
            <article key={activity.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{label(activity.type)}</Badge>
                <h3 className="font-medium">{activity.subject}</h3>
              </div>
              {activity.body ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {activity.body}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                {activity.actorName} · {formatDate(activity.occurredAt)}
              </p>
            </article>
          ))}
          {!activities.isLoading && !(activities.data?.items.length ?? 0) ? (
            <p className="text-sm text-muted-foreground">
              No activity has been recorded.
            </p>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Tasks</CardTitle>
            <CardDescription>
              Durable follow-up, reminders, and recurring work.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setTaskOpen(true)}>
            <CalendarPlus data-icon="inline-start" />
            New task
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {(tasks.data?.items ?? []).map((task) => (
            <div
              key={task.id}
              className="flex items-start justify-between gap-3 rounded-lg border p-3"
            >
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="font-medium">{task.title}</span>
                  <Badge
                    variant={
                      task.status === "Completed" ? "secondary" : "outline"
                    }
                  >
                    {label(task.status)}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {task.ownerName} ·{" "}
                  {task.dueAt ? `Due ${formatDate(task.dueAt)}` : "No due date"}{" "}
                  · {task.priority}
                </p>
              </div>
              {task.status !== "Completed" && task.status !== "Cancelled" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={taskStatus.isPending}
                  onClick={() =>
                    taskStatus.mutate({ id: task.id, version: task.version })
                  }
                >
                  Complete
                </Button>
              ) : null}
            </div>
          ))}
          {!tasks.isLoading && !(tasks.data?.items.length ?? 0) ? (
            <p className="text-sm text-muted-foreground">
              No tasks are linked to this record.
            </p>
          ) : null}
        </CardContent>
      </Card>
      <ActivityDialog
        open={activityOpen}
        error={activityMutation.error}
        pending={activityMutation.isPending}
        onOpenChange={setActivityOpen}
        onSubmit={(value) => activityMutation.mutate({ ...value, ...links })}
      />
      <TaskDialog
        open={taskOpen}
        error={taskMutation.error}
        pending={taskMutation.isPending}
        onOpenChange={setTaskOpen}
        onSubmit={(value) => taskMutation.mutate({ ...value, ...links })}
      />
    </div>
  );
}

function ActivityDialog({
  open,
  error,
  pending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  error: unknown;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: {
    type: CrmActivityType;
    subject: string;
    body: string | null;
    occurredAt: string;
    visibility: "Internal" | "Restricted";
  }) => void;
}) {
  const [type, setType] = useState<CrmActivityType>("Note");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            onSubmit({
              type,
              subject: String(data.get("subject") ?? ""),
              body: nullable(data.get("body")),
              occurredAt: new Date().toISOString(),
              visibility:
                data.get("visibility") === "Restricted"
                  ? "Restricted"
                  : "Internal",
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Log CRM activity</DialogTitle>
            <DialogDescription>
              Record a manual interaction or internal note. Connected email and
              calendar capture can be added later.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{apiErrorMessage(error)}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4">
            <Field label="Activity type" htmlFor="activity-type">
              <select
                id="activity-type"
                value={type}
                onChange={(event) =>
                  setType(event.target.value as CrmActivityType)
                }
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                {(
                  [
                    "Note",
                    "Call",
                    "Meeting",
                    "Email",
                    "StatusChange",
                  ] as CrmActivityType[]
                ).map((value) => (
                  <option key={value} value={value}>
                    {label(value)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Subject *" htmlFor="activity-subject">
              <Input
                id="activity-subject"
                name="subject"
                required
                maxLength={255}
              />
            </Field>
            <Field label="Details" htmlFor="activity-body">
              <Textarea
                id="activity-body"
                name="body"
                rows={5}
                maxLength={4000}
              />
            </Field>
            <Field label="Visibility" htmlFor="activity-visibility">
              <select
                id="activity-visibility"
                name="visibility"
                className="h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="Internal">Internal</option>
                <option value="Restricted">Restricted</option>
              </select>
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
              {pending ? "Saving…" : "Log activity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TaskDialog({
  open,
  error,
  pending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  error: unknown;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: {
    title: string;
    description: string | null;
    ownerUserId: string | null;
    priority: CrmTaskPriority;
    dueAt: string | null;
    reminderAt: string | null;
    recurrenceRule: string | null;
  }) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            onSubmit({
              title: String(data.get("title") ?? ""),
              description: nullable(data.get("description")),
              ownerUserId: nullable(data.get("ownerUserId")),
              priority: String(data.get("priority")) as CrmTaskPriority,
              dueAt: dateTime(data.get("dueAt")),
              reminderAt: dateTime(data.get("reminderAt")),
              recurrenceRule: nullable(data.get("recurrenceRule")),
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Create CRM task</DialogTitle>
            <DialogDescription>
              Assign follow-up to an active Phaeno owner. Optional recurrence
              supports daily, weekly, or monthly work.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{apiErrorMessage(error)}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4">
            <Field label="Title *" htmlFor="task-title">
              <Input id="task-title" name="title" required maxLength={255} />
            </Field>
            <Field label="Description" htmlFor="task-description">
              <Textarea id="task-description" name="description" rows={3} />
            </Field>
            <Field label="Owner" htmlFor="task-owner">
              <CrmOwnerSelect id="task-owner" enabled={open} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Priority" htmlFor="task-priority">
                <select
                  id="task-priority"
                  name="priority"
                  defaultValue="Normal"
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  <option>Low</option>
                  <option>Normal</option>
                  <option>High</option>
                  <option>Urgent</option>
                </select>
              </Field>
              <Field label="Due" htmlFor="task-due">
                <Input id="task-due" name="dueAt" type="datetime-local" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Reminder" htmlFor="task-reminder">
                <Input
                  id="task-reminder"
                  name="reminderAt"
                  type="datetime-local"
                />
              </Field>
              <Field label="Recurrence" htmlFor="task-recurrence">
                <select
                  id="task-recurrence"
                  name="recurrenceRule"
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">Does not repeat</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </Field>
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
              {pending ? "Saving…" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label: text,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{text}</Label>
      {children}
    </div>
  );
}
function nullable(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}
function dateTime(value: FormDataEntryValue | null) {
  const text = String(value ?? "");
  return text ? new Date(text).toISOString() : null;
}
function label(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2");
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
