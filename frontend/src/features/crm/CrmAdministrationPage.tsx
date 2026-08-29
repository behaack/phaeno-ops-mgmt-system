import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Download, Plus, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import {
  apiErrorMessage,
  changeCrmCustomFieldActive,
  changeCrmPipelineActive,
  changeCrmPipelineStageActive,
  commitCrmImport,
  createCrmCustomField,
  createCrmPipeline,
  createCrmPipelineStage,
  exportCrm,
  listCrmCustomFields,
  listCrmDuplicates,
  listCrmPipelines,
  listCrmSavedViews,
  previewCrmImport,
  updateCrmCustomField,
  updateCrmPipeline,
  updateCrmPipelineStage,
  type CrmCustomFieldDataType,
  type CrmCustomFieldDefinition,
  type CrmFieldSensitivity,
  type CrmPipeline,
  type CrmPipelineStage,
  type CrmPipelineStageCategory,
  type CrmRecordType,
} from "#/api/crm";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  Card,
  CardAction,
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
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";

export function CrmAdministrationPage() {
  const client = useQueryClient();
  const [pipelineOpen, setPipelineOpen] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState<CrmPipeline | null>(
    null,
  );
  const [stagePipelineId, setStagePipelineId] = useState<string | null>(null);
  const [editingStage, setEditingStage] = useState<CrmPipelineStage | null>(
    null,
  );
  const [fieldOpen, setFieldOpen] = useState(false);
  const [editingField, setEditingField] =
    useState<CrmCustomFieldDefinition | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const pipelines = useQuery({
    queryKey: ["crm-pipelines", "admin"],
    queryFn: () => listCrmPipelines(true),
  });
  const fields = useQuery({
    queryKey: ["crm-custom-fields"],
    queryFn: () => listCrmCustomFields(true),
  });
  const duplicates = useQuery({
    queryKey: ["crm-duplicates"],
    queryFn: listCrmDuplicates,
  });
  const refresh = async () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ["crm-pipelines"] }),
      client.invalidateQueries({ queryKey: ["crm-custom-fields"] }),
      client.invalidateQueries({ queryKey: ["crm-duplicates"] }),
    ]);
  const createPipeline = useMutation({
    mutationFn: createCrmPipeline,
    onSuccess: async () => {
      setPipelineOpen(false);
      await refresh();
    },
  });
  const createStage = useMutation({
    mutationFn: ({
      pipelineId,
      input,
    }: {
      pipelineId: string;
      input: Parameters<typeof createCrmPipelineStage>[1];
    }) => createCrmPipelineStage(pipelineId, input),
    onSuccess: async () => {
      setStagePipelineId(null);
      await refresh();
    },
  });
  const editPipeline = useMutation({
    mutationFn: ({
      pipeline,
      input,
    }: {
      pipeline: CrmPipeline;
      input: Parameters<typeof createCrmPipeline>[0];
    }) =>
      updateCrmPipeline(pipeline.id, { ...input, version: pipeline.version }),
    onSuccess: async () => {
      setEditingPipeline(null);
      await refresh();
    },
  });
  const editStage = useMutation({
    mutationFn: ({
      stage,
      input,
    }: {
      stage: CrmPipelineStage;
      input: Parameters<typeof createCrmPipelineStage>[1];
    }) =>
      updateCrmPipelineStage(stage.pipelineId, stage.id, {
        ...input,
        version: stage.version,
      }),
    onSuccess: async () => {
      setEditingStage(null);
      await refresh();
    },
  });
  const changePipelineActive = useMutation({
    mutationFn: ({
      id,
      action,
      version,
    }: {
      id: string;
      action: "deactivate" | "reactivate";
      version: number;
    }) => changeCrmPipelineActive(id, action, version),
    onSuccess: refresh,
  });
  const changeStageActive = useMutation({
    mutationFn: ({
      pipelineId,
      stageId,
      action,
      version,
    }: {
      pipelineId: string;
      stageId: string;
      action: "deactivate" | "reactivate";
      version: number;
    }) => changeCrmPipelineStageActive(pipelineId, stageId, action, version),
    onSuccess: refresh,
  });
  const createField = useMutation({
    mutationFn: createCrmCustomField,
    onSuccess: async () => {
      setFieldOpen(false);
      await refresh();
    },
  });
  const editField = useMutation({
    mutationFn: ({
      field,
      input,
    }: {
      field: CrmCustomFieldDefinition;
      input: Parameters<typeof createCrmCustomField>[0];
    }) => updateCrmCustomField(field.id, { ...input, version: field.version }),
    onSuccess: async () => {
      setEditingField(null);
      await refresh();
    },
  });
  const changeFieldActive = useMutation({
    mutationFn: ({
      id,
      action,
      version,
    }: {
      id: string;
      action: "deactivate" | "reactivate";
      version: number;
    }) => changeCrmCustomFieldActive(id, action, version),
    onSuccess: refresh,
  });
  const error =
    pipelines.error ??
    fields.error ??
    duplicates.error ??
    changePipelineActive.error ??
    changeStageActive.error ??
    editPipeline.error ??
    editStage.error ??
    editField.error ??
    changeFieldActive.error;
  return (
    <main className="page-wrap space-y-6 px-4 py-8">
      <section>
        <Badge variant="secondary" className="mb-3">
          Configuration & data quality
        </Badge>
        <h1 className="text-3xl font-semibold">CRM administration</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Configure first-party pipelines and fields, review possible
          duplicates, and use previewed, auditable data movement.
        </p>
      </section>
      <Alert>
        <AlertTitle>Provider-neutral by design</AlertTitle>
        <AlertDescription>
          CRM data belongs to Phaeno. Future email, calendar, marketing, or
          HubSpot connectors must use separately approved adapters and cannot
          become the system of record.
        </AlertDescription>
      </Alert>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{apiErrorMessage(error)}</AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Pipelines and stages</CardTitle>
          <CardDescription>
            Stage order, probability, close category, and required reasons are
            configurable.
          </CardDescription>
          <CardAction>
            <Button size="sm" onClick={() => setPipelineOpen(true)}>
              <Plus data-icon="inline-start" />
              New pipeline
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          {(pipelines.data ?? []).map((pipeline) => (
            <section key={pipeline.id} className="rounded-lg border">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
                <div>
                  <h3 className="font-semibold">
                    {pipeline.name}{" "}
                    {pipeline.isDefault ? (
                      <Badge className="ml-2">Default</Badge>
                    ) : null}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {pipeline.description ?? "No description"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingPipeline(pipeline)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      changePipelineActive.isPending ||
                      (pipeline.isActive && pipeline.isDefault)
                    }
                    title={
                      pipeline.isActive && pipeline.isDefault
                        ? "Choose another default pipeline before deactivating this one."
                        : undefined
                    }
                    onClick={() =>
                      changePipelineActive.mutate({
                        id: pipeline.id,
                        action: pipeline.isActive ? "deactivate" : "reactivate",
                        version: pipeline.version,
                      })
                    }
                  >
                    {pipeline.isActive ? "Deactivate" : "Reactivate"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!pipeline.isActive}
                    onClick={() => setStagePipelineId(pipeline.id)}
                  >
                    Add stage
                  </Button>
                </div>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th className="p-3">Position</th>
                      <th className="p-3">Stage</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Probability</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pipeline.stages.map((stage) => (
                      <tr key={stage.id}>
                        <td className="p-3">{stage.position}</td>
                        <td className="p-3 font-medium">{stage.name}</td>
                        <td className="p-3">{stage.category}</td>
                        <td className="p-3">{stage.probability}%</td>
                        <td className="p-3">
                          {stage.requiresReason ? "Required" : "Optional"}
                        </td>
                        <td className="p-3">
                          {stage.isActive ? "Active" : "Inactive"}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingStage(stage)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={changeStageActive.isPending}
                            onClick={() =>
                              changeStageActive.mutate({
                                pipelineId: pipeline.id,
                                stageId: stage.id,
                                action: stage.isActive
                                  ? "deactivate"
                                  : "reactivate",
                                version: stage.version,
                              })
                            }
                          >
                            {stage.isActive ? "Deactivate" : "Reactivate"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Custom fields</CardTitle>
            <CardDescription>
              Additive metadata with explicit record type and sensitivity.
            </CardDescription>
            <CardAction>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setFieldOpen(true)}
              >
                <Plus data-icon="inline-start" />
                New field
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2">
            {(fields.data ?? []).map((field) => (
              <div
                key={field.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{field.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {field.recordType} · {field.dataType} · {field.sensitivity}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={field.isActive ? "outline" : "secondary"}>
                    {field.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingField(field)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={changeFieldActive.isPending}
                    onClick={() =>
                      changeFieldActive.mutate({
                        id: field.id,
                        action: field.isActive ? "deactivate" : "reactivate",
                        version: field.version,
                      })
                    }
                  >
                    {field.isActive ? "Deactivate" : "Reactivate"}
                  </Button>
                </div>
              </div>
            ))}
            {!fields.isLoading && !(fields.data?.length ?? 0) ? (
              <p className="text-sm text-muted-foreground">
                No custom fields configured.
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Possible duplicates</CardTitle>
            <CardDescription>
              Warnings never merge records automatically. Open the records and
              use the controlled merge action.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(duplicates.data ?? []).map((group) => (
              <div
                key={`${group.recordType}-${group.matchReason}-${group.matchValue}`}
                className="rounded-lg border p-3"
              >
                <div className="flex gap-2">
                  <Badge variant="outline">{group.recordType}</Badge>
                  <span className="text-sm font-medium">
                    Same {group.matchReason.toLowerCase()}: {group.matchValue}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {group.recordIds.map((id, index) => (
                    <DuplicateRecordLink
                      key={id}
                      recordType={group.recordType}
                      id={id}
                      name={group.recordNames[index] ?? id}
                    />
                  ))}
                </div>
              </div>
            ))}
            {!duplicates.isLoading && !(duplicates.data?.length ?? 0) ? (
              <p className="text-sm text-muted-foreground">
                No likely duplicate groups detected.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
      <SavedViewsCard />
      <Card>
        <CardHeader>
          <CardTitle>Import and export</CardTitle>
          <CardDescription>
            Preview CSV rows and duplicate warnings before an idempotent commit.
            Every export request is audited.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload data-icon="inline-start" />
            Preview CSV import
          </Button>
          {(
            [
              "Company",
              "Contact",
              "Lead",
              "Opportunity",
              "Task",
            ] as CrmRecordType[]
          ).map((type) => (
            <ExportButton key={type} type={type} />
          ))}
        </CardContent>
      </Card>
      <PipelineDialog
        open={pipelineOpen}
        pending={createPipeline.isPending}
        error={createPipeline.error}
        onOpenChange={setPipelineOpen}
        onSubmit={(value) => createPipeline.mutate(value)}
      />
      {editingPipeline ? (
        <PipelineDialog
          key={editingPipeline.id}
          open
          value={editingPipeline}
          pending={editPipeline.isPending}
          error={editPipeline.error}
          onOpenChange={(open) => {
            if (!open) setEditingPipeline(null);
          }}
          onSubmit={(input) =>
            editPipeline.mutate({ pipeline: editingPipeline, input })
          }
        />
      ) : null}
      <StageDialog
        pipelineId={stagePipelineId}
        pending={createStage.isPending}
        error={createStage.error}
        onOpenChange={(open) => {
          if (!open) setStagePipelineId(null);
        }}
        onSubmit={(input) =>
          stagePipelineId &&
          createStage.mutate({ pipelineId: stagePipelineId, input })
        }
      />
      {editingStage ? (
        <StageDialog
          key={editingStage.id}
          pipelineId={editingStage.pipelineId}
          value={editingStage}
          pending={editStage.isPending}
          error={editStage.error}
          onOpenChange={(open) => {
            if (!open) setEditingStage(null);
          }}
          onSubmit={(input) => editStage.mutate({ stage: editingStage, input })}
        />
      ) : null}
      <FieldDialog
        open={fieldOpen}
        pending={createField.isPending}
        error={createField.error}
        onOpenChange={setFieldOpen}
        onSubmit={(value) => createField.mutate(value)}
      />
      {editingField ? (
        <FieldDialog
          key={editingField.id}
          open
          value={editingField}
          pending={editField.isPending}
          error={editField.error}
          onOpenChange={(open) => {
            if (!open) setEditingField(null);
          }}
          onSubmit={(input) => editField.mutate({ field: editingField, input })}
        />
      ) : null}
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onCommitted={refresh}
      />
    </main>
  );
}

function SavedViewsCard() {
  const query = useQuery({
    queryKey: ["crm-saved-views"],
    queryFn: () => listCrmSavedViews(),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Saved views</CardTitle>
        <CardDescription>
          Save the current filters from any CRM directory. Views can remain
          personal or be shared with CRM staff.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {(query.data ?? []).map((view) => (
          <Badge key={view.id} variant="outline">
            {view.recordType}: {view.name}
            {view.isShared ? " · Shared" : ""}
          </Badge>
        ))}
        {!query.isLoading && !(query.data?.length ?? 0) ? (
          <p className="text-sm text-muted-foreground">No saved views yet.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PipelineDialog({
  open,
  value,
  pending,
  error,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  value?: CrmPipeline;
  pending: boolean;
  error: unknown;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: {
    name: string;
    description: string | null;
    isDefault: boolean;
  }) => void;
}) {
  const [isDefault, setDefault] = useState(value?.isDefault ?? false);
  useEffect(() => {
    if (open) setDefault(value?.isDefault ?? false);
  }, [open, value]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            onSubmit({
              name: String(data.get("name") ?? ""),
              description: nullable(data, "description"),
              isDefault,
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {value ? "Edit pipeline" : "New pipeline"}
            </DialogTitle>
            <DialogDescription>
              {value
                ? "Update this commercial process without changing its Opportunity history."
                : "Create a separate commercial process. Add its ordered stages next."}
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{apiErrorMessage(error)}</AlertDescription>
            </Alert>
          ) : null}
          <Fields>
            <Field label="Name *" id="pipeline-name">
              <Input
                id="pipeline-name"
                name="name"
                required
                defaultValue={value?.name}
              />
            </Field>
            <Field label="Description" id="pipeline-description">
              <Textarea
                id="pipeline-description"
                name="description"
                defaultValue={value?.description ?? ""}
              />
            </Field>
            <div className="flex items-center gap-2">
              <Checkbox
                id="pipeline-default"
                checked={isDefault}
                onCheckedChange={(value) => setDefault(value === true)}
              />
              <Label htmlFor="pipeline-default" className="cursor-pointer">
                Make this the default pipeline
              </Label>
            </div>
          </Fields>
          <Footer
            pending={pending}
            onCancel={() => onOpenChange(false)}
            label={value ? "Save pipeline" : "Create pipeline"}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
function StageDialog({
  pipelineId,
  value,
  pending,
  error,
  onOpenChange,
  onSubmit,
}: {
  pipelineId: string | null;
  value?: CrmPipelineStage;
  pending: boolean;
  error: unknown;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: {
    name: string;
    position: number;
    category: CrmPipelineStageCategory;
    probability: number;
    requiresReason: boolean;
  }) => void;
}) {
  const [requiresReason, setRequiresReason] = useState(
    value?.requiresReason ?? false,
  );
  useEffect(() => {
    if (pipelineId) setRequiresReason(value?.requiresReason ?? false);
  }, [pipelineId, value]);
  return (
    <Dialog open={Boolean(pipelineId)} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            onSubmit({
              name: String(data.get("name") ?? ""),
              position: Number(data.get("position")),
              category: String(
                data.get("category"),
              ) as CrmPipelineStageCategory,
              probability: Number(data.get("probability")),
              requiresReason,
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {value ? "Edit pipeline stage" : "Add pipeline stage"}
            </DialogTitle>
            <DialogDescription>
              Closed, lost, and abandoned stages should require an outcome
              reason.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{apiErrorMessage(error)}</AlertDescription>
            </Alert>
          ) : null}
          <Fields>
            <Field label="Name *" id="stage-name">
              <Input
                id="stage-name"
                name="name"
                required
                defaultValue={value?.name}
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Position *" id="stage-position">
                <Input
                  id="stage-position"
                  name="position"
                  type="number"
                  min="1"
                  required
                  defaultValue={value?.position}
                />
              </Field>
              <Field label="Category" id="stage-category">
                <select
                  id="stage-category"
                  name="category"
                  defaultValue={value?.category ?? "Open"}
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  <option>Open</option>
                  <option>Won</option>
                  <option>Lost</option>
                  <option>Abandoned</option>
                </select>
              </Field>
              <Field label="Probability" id="stage-probability">
                <Input
                  id="stage-probability"
                  name="probability"
                  type="number"
                  min="0"
                  max="100"
                  required
                  defaultValue={value?.probability ?? 0}
                />
              </Field>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="stage-reason-required"
                checked={requiresReason}
                onCheckedChange={(value) => setRequiresReason(value === true)}
              />
              <Label htmlFor="stage-reason-required" className="cursor-pointer">
                Require a transition reason
              </Label>
            </div>
          </Fields>
          <Footer
            pending={pending}
            onCancel={() => onOpenChange(false)}
            label={value ? "Save stage" : "Add stage"}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
function FieldDialog({
  open,
  value,
  pending,
  error,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  value?: CrmCustomFieldDefinition;
  pending: boolean;
  error: unknown;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: {
    name: string;
    recordType: CrmRecordType;
    dataType: CrmCustomFieldDataType;
    sensitivity: CrmFieldSensitivity;
    optionsJson: string | null;
    isRequired: boolean;
  }) => void;
}) {
  const [required, setRequired] = useState(value?.isRequired ?? false);
  useEffect(() => {
    if (open) setRequired(value?.isRequired ?? false);
  }, [open, value]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            onSubmit({
              name: String(data.get("name") ?? ""),
              recordType:
                value?.recordType ??
                (String(data.get("recordType")) as CrmRecordType),
              dataType: String(data.get("dataType")) as CrmCustomFieldDataType,
              sensitivity: String(
                data.get("sensitivity"),
              ) as CrmFieldSensitivity,
              optionsJson: nullable(data, "optionsJson"),
              isRequired: required,
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {value ? "Edit custom field" : "New custom field"}
            </DialogTitle>
            <DialogDescription>
              Custom fields extend a record without changing core workflow
              semantics.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{apiErrorMessage(error)}</AlertDescription>
            </Alert>
          ) : null}
          <Fields>
            <Field label="Name *" id="field-name">
              <Input
                id="field-name"
                name="name"
                required
                defaultValue={value?.name}
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Record" id="field-record">
                <select
                  id="field-record"
                  name="recordType"
                  defaultValue={value?.recordType ?? "Company"}
                  disabled={Boolean(value)}
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  {["Company", "Contact", "Lead", "Opportunity", "Task"].map(
                    (value) => (
                      <option key={value}>{value}</option>
                    ),
                  )}
                </select>
              </Field>
              <Field label="Data type" id="field-type">
                <select
                  id="field-type"
                  name="dataType"
                  defaultValue={value?.dataType ?? "Text"}
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  {["Text", "Number", "Date", "Boolean", "Option"].map(
                    (value) => (
                      <option key={value}>{value}</option>
                    ),
                  )}
                </select>
              </Field>
              <Field label="Sensitivity" id="field-sensitivity">
                <select
                  id="field-sensitivity"
                  name="sensitivity"
                  defaultValue={value?.sensitivity ?? "Internal"}
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                >
                  <option>Internal</option>
                  <option>Restricted</option>
                </select>
              </Field>
            </div>
            <Field label="Option choices JSON" id="field-options">
              <Input
                id="field-options"
                name="optionsJson"
                defaultValue={value?.optionsJson ?? ""}
                placeholder='["Option A","Option B"]'
              />
            </Field>
            <div className="flex items-center gap-2">
              <Checkbox
                id="field-required"
                checked={required}
                onCheckedChange={(value) => setRequired(value === true)}
              />
              <Label htmlFor="field-required" className="cursor-pointer">
                Required when editing this record type
              </Label>
            </div>
          </Fields>
          <Footer
            pending={pending}
            onCancel={() => onOpenChange(false)}
            label={value ? "Save field" : "Create field"}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({
  open,
  onOpenChange,
  onCommitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommitted: () => Promise<unknown>;
}) {
  const [type, setType] = useState<CrmRecordType>("Company");
  const [file, setFile] = useState<File | null>(null);
  const preview = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Select a CSV file.");
      return previewCrmImport({
        recordType: type,
        idempotencyKey: `${type}:${file.name}:${file.size}:${file.lastModified}`,
        fileName: file.name,
        rows: parseCsv(await file.text()).map((values) => ({ values })),
      });
    },
  });
  const commit = useMutation({
    mutationFn: () => {
      if (!preview.data) throw new Error("Preview the import first.");
      return commitCrmImport(preview.data.batchId, preview.data.version);
    },
    onSuccess: async () => {
      await onCommitted();
      onOpenChange(false);
    },
  });
  const error = preview.error ?? commit.error;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Preview CSV import</DialogTitle>
          <DialogDescription>
            Rows with invalid values block the commit. Duplicate rows are
            reported and skipped.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{apiErrorMessage(error)}</AlertDescription>
          </Alert>
        ) : null}
        <Fields>
          <Field label="Record type" id="import-type">
            <select
              id="import-type"
              value={type}
              onChange={(event) => setType(event.target.value as CrmRecordType)}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option>Company</option>
              <option>Contact</option>
              <option>Lead</option>
              <option>Opportunity</option>
            </select>
          </Field>
          <Field label="CSV file" id="import-file">
            <Input
              id="import-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                preview.reset();
                commit.reset();
              }}
            />
          </Field>
          {preview.data ? (
            <div className="rounded-lg border p-3 text-sm">
              <p>
                {preview.data.validRows} valid · {preview.data.duplicateRows}{" "}
                duplicates · {preview.data.invalidRows} invalid
              </p>
              {preview.data.errors.map((error) => (
                <p key={error} className="mt-1 text-destructive">
                  {error}
                </p>
              ))}
            </div>
          ) : null}
        </Fields>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {preview.data ? (
            <Button
              disabled={preview.data.invalidRows > 0 || commit.isPending}
              onClick={() => commit.mutate()}
            >
              {commit.isPending ? "Committing…" : "Commit import"}
            </Button>
          ) : (
            <Button
              disabled={!file || preview.isPending}
              onClick={() => preview.mutate()}
            >
              {preview.isPending ? "Checking…" : "Preview rows"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function ExportButton({ type }: { type: CrmRecordType }) {
  const mutation = useMutation({
    mutationFn: () => exportCrm(type),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `crm-${type.toLowerCase()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    },
  });
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      <Download data-icon="inline-start" />
      {type}
    </Button>
  );
}
function DuplicateRecordLink({
  recordType,
  id,
  name,
}: {
  recordType: CrmRecordType;
  id: string;
  name: string;
}) {
  if (recordType === "Company")
    return (
      <Link
        to="/crm/companies/$companyId"
        params={{ companyId: id }}
        className="text-primary hover:underline"
      >
        {name}
      </Link>
    );
  if (recordType === "Contact")
    return (
      <Link
        to="/crm/contacts/$contactId"
        params={{ contactId: id }}
        className="text-primary hover:underline"
      >
        {name}
      </Link>
    );
  return <span>{name}</span>;
}
function Fields({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4">{children}</div>;
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
function Footer({
  pending,
  onCancel,
  label,
}: {
  pending: boolean;
  onCancel: () => void;
  label: string;
}) {
  return (
    <DialogFooter>
      <span className="mr-auto text-xs text-muted-foreground">* Required</span>
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : label}
      </Button>
    </DialogFooter>
  );
}
function nullable(data: FormData, key: string) {
  const value = String(data.get(key) ?? "").trim();
  return value || null;
}
function parseCsv(text: string) {
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') {
      cell += '"';
      index++;
    } else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index++;
      row.push(cell);
      if (row.some((value) => value.trim())) lines.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.trim())) lines.push(row);
  const [headers = [], ...values] = lines;
  return values.map((line) =>
    Object.fromEntries(
      headers.map((header, index) => [
        header.trim(),
        line[index]?.trim() || null,
      ]),
    ),
  );
}
