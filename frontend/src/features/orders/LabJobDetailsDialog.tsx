import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import {
  createLabOrder,
  getLabOrder,
  getOrderErrorMessage,
  initiateCustomerLabOrder,
  isOrderConcurrencyError,
  updateLabOrder,
  type LabServiceOrder,
} from "#/api/order-management";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFeedback,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { FieldDescription, FieldError } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
  RequiredDialogFooter,
  RequiredFieldName,
  RequiredMark,
} from "#/components/ui/required-field";
import { Textarea } from "#/components/ui/textarea";
import { usePhaenoSession } from "#/features/auth/session-context";

const duplicateBiologicalSourcesMessage =
  "Duplicate biological sources are not permitted.";
const duplicateBiologicalSourcesMessages = new Set([
  duplicateBiologicalSourcesMessage,
  "Each biological source can appear only once.",
]);

const jobDetailsSchema = z
  .object({
    customerReference: z
      .string()
      .trim()
      .min(1, "Job name is required.")
      .max(255, "Job name must be 255 characters or fewer."),
    sourceGroups: z
      .array(
        z.object({
          biologicalSource: z
            .string()
            .trim()
            .min(1, "Biological source is required.")
            .max(500),
          specimenCount: z.coerce
            .number()
            .int("Use a whole number.")
            .positive("Enter at least one sample."),
        }),
      )
      .min(1, "Add at least one biological source."),
    storageRequirements: z
      .string()
      .trim()
      .min(1, "Storage requirements are required.")
      .max(2000, "Storage requirements must be 2,000 characters or fewer."),
    safetyDeclaration: z
      .string()
      .trim()
      .min(1, "Safety declaration is required.")
      .max(2000, "Safety declaration must be 2,000 characters or fewer."),
    jobNotes: z
      .string()
      .trim()
      .max(2000, "Job notes must be 2,000 characters or fewer."),
  })
  .superRefine((values, context) => {
    const sourceTotal = values.sourceGroups.reduce(
      (sum, group) => sum + group.specimenCount,
      0,
    );
    if (sourceTotal > 100)
      context.addIssue({
        code: "custom",
        path: ["sourceGroups"],
        message: "A Job can contain at most 100 samples.",
      });
    const sources = normalizedBiologicalSources(values.sourceGroups);
    if (new Set(sources).size !== sources.length)
      context.addIssue({
        code: "custom",
        path: ["sourceGroups"],
        message: duplicateBiologicalSourcesMessage,
      });
  });

type JobDetailsFormInput = z.input<typeof jobDetailsSchema>;
type JobDetailsValues = z.output<typeof jobDetailsSchema>;

type LabJobDetailsDialogProps = {
  open: boolean;
  order?: LabServiceOrder | null;
  platformOrganizations?: Array<{ id: string; name: string }>;
  onOpenChange: (open: boolean) => void;
  onSaved: (order: LabServiceOrder) => void | Promise<void>;
};

export function LabJobDetailsDialog({
  open,
  order,
  platformOrganizations,
  onOpenChange,
  onSaved,
}: LabJobDetailsDialogProps) {
  const { authProvider, session } = usePhaenoSession();
  const queryClient = useQueryClient();
  const platformMode = platformOrganizations !== undefined;
  const eligiblePlatformOrganizations = platformOrganizations ?? [];
  const [organizationId, setOrganizationId] = useState("");
  const [prohibitedDataConfirmed, setProhibitedDataConfirmed] = useState(false);
  const canCreate = platformMode
    ? Boolean(session?.capabilities.canQuoteLabServiceWork)
    : Boolean(session?.capabilities.canCreateLabServiceRequests);
  const apiEnabled = authProvider !== "mock" && canCreate;
  const form = useForm<JobDetailsFormInput, unknown, JobDetailsValues>({
    resolver: zodResolver(jobDetailsSchema),
    mode: "onBlur",
    defaultValues: {
      customerReference: "",
      sourceGroups: [{ biologicalSource: "", specimenCount: 1 }],
      storageRequirements: "",
      safetyDeclaration: "",
      jobNotes: "",
    },
  });
  const sourceGroups = useFieldArray({
    control: form.control,
    name: "sourceGroups",
  });
  const baseOrderRef = useRef<LabServiceOrder | null>(order ?? null);
  const saveVersionRef = useRef<number | null>(order?.version ?? null);
  const resetKeyRef = useRef<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (values: JobDetailsValues) => {
      const customerReference = values.customerReference;
      const description = values.jobNotes || undefined;
      const requestedSpecimenCount = values.sourceGroups.reduce(
        (sum, group) => sum + group.specimenCount,
        0,
      );
      const hasMixedBiologicalSources = values.sourceGroups.length > 1;
      const sharedBiologicalSource = hasMixedBiologicalSources
        ? undefined
        : values.sourceGroups[0].biologicalSource;
      const storageRequirements = values.storageRequirements;
      const safetyDeclaration = values.safetyDeclaration;
      if (!order) {
        if (platformMode) {
          if (!organizationId)
            throw new Error("Select a Customer organization.");
          return initiateCustomerLabOrder({
            organizationId,
            customerReference,
            description,
            storageRequirements,
            safetyDeclaration,
            prohibitedDataConfirmed,
            requestedSpecimenCount,
            sourceGroups: values.sourceGroups,
          });
        }
        return createLabOrder({
          customerReference,
          description,
          hasMixedBiologicalSources,
          sharedBiologicalSource,
          storageRequirements,
          safetyDeclaration,
          samples: [],
          requestedSpecimenCount,
          sourceGroups: values.sourceGroups,
        });
      }

      const baseOrder = baseOrderRef.current ?? order;
      const saveVersion = saveVersionRef.current ?? baseOrder.version;
      const update = (version: number) =>
        updateLabOrder(baseOrder.id, {
          customerReference,
          description,
          hasMixedBiologicalSources,
          sharedBiologicalSource,
          storageRequirements,
          safetyDeclaration,
          samples: [],
          version,
          requestedSpecimenCount,
          sourceGroups: values.sourceGroups,
        });

      try {
        return await update(saveVersion);
      } catch (error) {
        if (!isOrderConcurrencyError(error)) throw error;

        let latestOrder: LabServiceOrder;
        try {
          latestOrder = await getLabOrder(baseOrder.id);
        } catch {
          throw new Error(
            "The Job changed while you were editing, but the latest record could not be loaded. Close this editor, reopen it, and try again.",
          );
        }

        baseOrderRef.current = latestOrder;
        saveVersionRef.current = latestOrder.version;
        if (sameEditableJobDetails(baseOrder, latestOrder)) {
          return update(latestOrder.version);
        }

        throw new RefreshedJobConflictError(latestOrder);
      }
    },
    onError: (error) => {
      if (!(error instanceof RefreshedJobConflictError)) return;
      form.reset(jobDetailsFormValues(error.latestOrder), {
        keepDirtyValues: true,
        keepErrors: true,
      });
    },
    onSuccess: async (savedOrder) => {
      baseOrderRef.current = savedOrder;
      saveVersionRef.current = savedOrder.version;
      form.reset(jobDetailsFormValues(savedOrder));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["lab-service-orders"] }),
        queryClient.invalidateQueries({
          queryKey: ["lab-service-order", savedOrder.id],
        }),
      ]);
      await onSaved(savedOrder);
    },
  });

  useEffect(() => {
    if (!open) {
      resetKeyRef.current = null;
      return;
    }

    const resetKey =
      order?.id ?? (platformMode ? "new-platform-job" : "new-job");
    if (resetKeyRef.current === resetKey) return;
    resetKeyRef.current = resetKey;
    baseOrderRef.current = order ?? null;
    saveVersionRef.current = order?.version ?? null;
    setOrganizationId("");
    setProhibitedDataConfirmed(false);
    form.reset(jobDetailsFormValues(order));
  }, [form, open, order, platformMode]);

  const formId = order ? `job-details-${order.id}` : "create-lab-job";
  const editing = Boolean(order);
  const canSave =
    apiEnabled &&
    (!editing || Boolean(order?.canEdit)) &&
    (!platformMode || Boolean(organizationId)) &&
    (!platformMode || prohibitedDataConfirmed);
  const watchedSourceGroups = form.watch("sourceGroups");
  const sourceTotal = watchedSourceGroups.reduce(
    (sum, group) => sum + (Number(group.specimenCount) || 0),
    0,
  );
  const normalizedSources = normalizedBiologicalSources(watchedSourceGroups);
  const hasDuplicateSources =
    new Set(normalizedSources).size !== normalizedSources.length;
  const schemaSourceGroupsError =
    form.formState.errors.sourceGroups?.root?.message ??
    form.formState.errors.sourceGroups?.message;
  const duplicateErrorHasBeenShown = schemaSourceGroupsError
    ? duplicateBiologicalSourcesMessages.has(schemaSourceGroupsError)
    : false;
  const sourceGroupsError =
    hasDuplicateSources &&
    (form.formState.isSubmitted || duplicateErrorHasBeenShown)
      ? duplicateBiologicalSourcesMessage
      : duplicateErrorHasBeenShown
        ? undefined
        : schemaSourceGroupsError;

  return (
    <Dialog open={open} onOpenChange={requestOpenChange}>
      <DialogContent className="max-h-[90dvh] p-0 [--dialog-inset:0px] sm:max-w-3xl">
        <DialogHeader className="pt-5 pr-12 pl-5">
          <DialogTitle>
            {editing
              ? "Edit Job pricing details"
              : platformMode
                ? "New Customer order"
                : "Job pricing details"}
          </DialogTitle>
          <DialogDescription>
            {platformMode
              ? "Select the Customer and enter the price-bearing Job scope. The new order opens in quote preparation; the Customer approves the synchronized quote before adding samples."
              : "Enter each biological source and its sample count for pricing. Individual sample IDs and tube barcodes are added only after you accept the price."}
          </DialogDescription>
        </DialogHeader>

        {authProvider === "mock" || !canCreate || mutation.error ? (
          <DialogFeedback className="space-y-2">
            {authProvider === "mock" ? (
              <Alert>
                <AlertTitle>Creation is paused in mock-session mode</AlertTitle>
                <AlertDescription>
                  {platformMode
                    ? "Connect a real Phaeno session to initiate a Customer order."
                    : "Connect a real Customer session to create a laboratory job."}
                </AlertDescription>
              </Alert>
            ) : null}
            {!canCreate ? (
              <Alert variant="destructive">
                <AlertTitle>Job details cannot be changed</AlertTitle>
                <AlertDescription>
                  {platformMode
                    ? "Phaeno order-pricing authority is required."
                    : "An active Customer organization administrator is required."}
                </AlertDescription>
              </Alert>
            ) : null}
            {mutation.error ? (
              <Alert variant="destructive" role="alert">
                <AlertTitle>Job details were not saved</AlertTitle>
                <AlertDescription>
                  {getOrderErrorMessage(
                    mutation.error,
                    "Review the job details and try again.",
                  )}
                </AlertDescription>
              </Alert>
            ) : null}
          </DialogFeedback>
        ) : null}

        <div className="px-5">
          <form id={formId} noValidate onSubmit={form.handleSubmit(submit)}>
            {platformMode ? (
              <>
                <Label htmlFor={`${formId}-organization`}>
                  <RequiredFieldName>Customer</RequiredFieldName>
                </Label>
                <FieldDescription id={`${formId}-organization-help`}>
                  The Customer must have an active organization administrator
                  who can approve the quote.
                </FieldDescription>
                <select
                  id={`${formId}-organization`}
                  required
                  className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  value={organizationId}
                  aria-describedby={`${formId}-organization-help`}
                  onChange={(event) => setOrganizationId(event.target.value)}
                >
                  <option value="">Select Customer</option>
                  {eligiblePlatformOrganizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
                {eligiblePlatformOrganizations.length === 0 ? (
                  <FieldError>
                    No eligible Customer organizations were provided.
                  </FieldError>
                ) : null}
              </>
            ) : null}

            <Label htmlFor={`${formId}-reference`}>
              <RequiredFieldName>Job name</RequiredFieldName>
            </Label>
            <FieldDescription id={`${formId}-reference-help`}>
              Use a short name your organization will recognize. Job names must
              be unique within your organization.
            </FieldDescription>
            <Input
              id={`${formId}-reference`}
              className="mt-2"
              required
              aria-invalid={Boolean(form.formState.errors.customerReference)}
              aria-describedby={`${formId}-reference-help${form.formState.errors.customerReference ? ` ${formId}-reference-error` : ""}`}
              {...form.register("customerReference")}
            />
            <FieldError id={`${formId}-reference-error`}>
              {form.formState.errors.customerReference?.message}
            </FieldError>

            <fieldset className="mt-4">
              <legend className="text-sm font-medium">
                <RequiredFieldName>
                  Biological-source composition
                </RequiredFieldName>
              </legend>
              <FieldDescription>
                List each organism/species and tissue or cell type with its
                sample count.
              </FieldDescription>
              <div className="mt-3 overflow-hidden rounded-lg border">
                <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_2.25rem] gap-3 border-b bg-muted/40 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_9rem_2.25rem]">
                  <span className="text-sm font-medium">
                    <RequiredFieldName>Biological source</RequiredFieldName>
                  </span>
                  <span className="text-sm font-medium">
                    <RequiredFieldName>Samples</RequiredFieldName>
                  </span>
                  <span className="sr-only">Actions</span>
                </div>
                <div className="divide-y">
                  {sourceGroups.fields.map((field, index) => {
                    const sourceErrorId = `${formId}-source-${index}-error`;
                    const countErrorId = `${formId}-source-count-${index}-error`;
                    const sourceError =
                      form.formState.errors.sourceGroups?.[index]
                        ?.biologicalSource;
                    const countError =
                      form.formState.errors.sourceGroups?.[index]
                        ?.specimenCount;

                    return (
                      <div
                        key={field.id}
                        className="grid grid-cols-[minmax(0,1fr)_5.5rem_2.25rem] items-start gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_9rem_2.25rem]"
                      >
                        <div>
                          <Label
                            className="sr-only"
                            htmlFor={`${formId}-source-${index}`}
                          >
                            Biological source for source group {index + 1}
                          </Label>
                          <Input
                            id={`${formId}-source-${index}`}
                            required
                            placeholder="Human PBMCs, mouse liver…"
                            aria-invalid={Boolean(sourceError)}
                            aria-describedby={
                              sourceError ? sourceErrorId : undefined
                            }
                            {...form.register(
                              `sourceGroups.${index}.biologicalSource`,
                            )}
                          />
                          <FieldError id={sourceErrorId}>
                            {sourceError?.message}
                          </FieldError>
                        </div>
                        <div>
                          <Label
                            className="sr-only"
                            htmlFor={`${formId}-source-count-${index}`}
                          >
                            Samples for source group {index + 1}
                          </Label>
                          <Input
                            id={`${formId}-source-count-${index}`}
                            required
                            type="number"
                            min="1"
                            max="100"
                            step="1"
                            inputMode="numeric"
                            aria-invalid={Boolean(countError)}
                            aria-describedby={
                              countError ? countErrorId : undefined
                            }
                            {...form.register(
                              `sourceGroups.${index}.specimenCount`,
                            )}
                          />
                          <FieldError id={countErrorId}>
                            {countError?.message}
                          </FieldError>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          aria-label={`Remove source group ${index + 1}`}
                          disabled={sourceGroups.fields.length === 1}
                          onClick={() => sourceGroups.remove(index)}
                        >
                          <Minus />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <FieldError>{sourceGroupsError}</FieldError>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    sourceGroups.append({
                      biologicalSource: "",
                      specimenCount: 1,
                    })
                  }
                >
                  <Plus data-icon="inline-start" />
                  Add source
                </Button>
                <p className="text-sm text-muted-foreground">
                  Total samples: {sourceTotal}
                </p>
              </div>
            </fieldset>

            <Label htmlFor={`${formId}-storage`} className="mt-4">
              <RequiredFieldName>Storage requirements</RequiredFieldName>
            </Label>
            <FieldDescription id={`${formId}-storage-help`}>
              Describe the storage and transport temperature and any freeze/thaw
              limits for every sample in this job.
            </FieldDescription>
            <Textarea
              id={`${formId}-storage`}
              className="mt-2 min-h-24"
              placeholder="For example: Ship frozen on dry ice; avoid thawing."
              aria-invalid={Boolean(form.formState.errors.storageRequirements)}
              aria-describedby={`${formId}-storage-help${form.formState.errors.storageRequirements ? ` ${formId}-storage-error` : ""}`}
              {...form.register("storageRequirements")}
            />
            <FieldError id={`${formId}-storage-error`}>
              {form.formState.errors.storageRequirements?.message}
            </FieldError>

            <Label htmlFor={`${formId}-safety`} className="mt-4">
              <RequiredFieldName>Safety declaration</RequiredFieldName>
            </Label>
            <FieldDescription id={`${formId}-safety-help`}>
              Identify biohazards or handling risks shared by the job. Enter “No
              known hazards” when none apply.
            </FieldDescription>
            <Textarea
              id={`${formId}-safety`}
              className="mt-2 min-h-24"
              placeholder="No known hazards"
              aria-invalid={Boolean(form.formState.errors.safetyDeclaration)}
              aria-describedby={`${formId}-safety-help${form.formState.errors.safetyDeclaration ? ` ${formId}-safety-error` : ""}`}
              {...form.register("safetyDeclaration")}
            />
            <FieldError id={`${formId}-safety-error`}>
              {form.formState.errors.safetyDeclaration?.message}
            </FieldError>

            <Label htmlFor={`${formId}-notes`} className="mt-4">
              Job notes{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <FieldDescription id={`${formId}-notes-help`}>
              Add information that applies to the job as a whole. Do not include
              names or direct identifiers.
            </FieldDescription>
            <Textarea
              id={`${formId}-notes`}
              className="mt-2 min-h-24"
              aria-invalid={Boolean(form.formState.errors.jobNotes)}
              aria-describedby={`${formId}-notes-help${form.formState.errors.jobNotes ? ` ${formId}-notes-error` : ""}`}
              {...form.register("jobNotes")}
            />
            <FieldError id={`${formId}-notes-error`}>
              {form.formState.errors.jobNotes?.message}
            </FieldError>

            {platformMode ? (
              <label
                htmlFor={`${formId}-prohibited-data-confirmation`}
                className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border p-4"
              >
                <Checkbox
                  id={`${formId}-prohibited-data-confirmation`}
                  checked={prohibitedDataConfirmed}
                  onCheckedChange={(checked) =>
                    setProhibitedDataConfirmed(checked === true)
                  }
                />
                <span className="text-sm leading-5">
                  I confirm that these Job pricing details contain no patient
                  identifiers, PHI, or unnecessary personal data.{" "}
                  <RequiredMark />
                </span>
              </label>
            ) : null}
          </form>
        </div>

        <RequiredDialogFooter className="border-t bg-muted/40 px-5 py-4">
          <Button
            type="button"
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => requestOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={!canSave || mutation.isPending}
          >
            {mutation.isPending
              ? editing
                ? "Saving…"
                : platformMode
                  ? "Starting pricing…"
                  : "Creating…"
              : editing
                ? "Save job details"
                : platformMode
                  ? "Start pricing"
                  : "Create job"}
          </Button>
        </RequiredDialogFooter>
      </DialogContent>
    </Dialog>
  );

  function requestOpenChange(nextOpen: boolean) {
    if (
      !nextOpen &&
      form.formState.isDirty &&
      !mutation.isPending &&
      !window.confirm("Discard the unsaved job details?")
    ) {
      return;
    }
    if (!nextOpen) mutation.reset();
    onOpenChange(nextOpen);
  }

  function submit(values: JobDetailsValues) {
    mutation.mutate(values);
  }
}

class RefreshedJobConflictError extends Error {
  constructor(readonly latestOrder: LabServiceOrder) {
    super(
      "The Job changed while you were editing. The latest record was loaded, and your entries were kept. Review them and save again.",
    );
    this.name = "RefreshedJobConflictError";
  }
}

function jobDetailsFormValues(
  order?: LabServiceOrder | null,
): JobDetailsFormInput {
  return {
    customerReference: order?.customerReference ?? "",
    sourceGroups: order?.sourceGroups?.length
      ? order.sourceGroups.map((group) => ({
          biologicalSource: group.biologicalSource,
          specimenCount: group.specimenCount,
        }))
      : [
          {
            biologicalSource: order?.sharedBiologicalSource ?? "",
            specimenCount: order?.requestedSpecimenCount || 1,
          },
        ],
    storageRequirements: order?.storageRequirements ?? "",
    safetyDeclaration: order?.safetyDeclaration ?? "",
    jobNotes: order?.description ?? "",
  };
}

function sameEditableJobDetails(left: LabServiceOrder, right: LabServiceOrder) {
  return (
    JSON.stringify(editableJobDetails(left)) ===
    JSON.stringify(editableJobDetails(right))
  );
}

function editableJobDetails(order: LabServiceOrder) {
  return {
    status: order.status,
    customerReference: order.customerReference,
    description: order.description ?? "",
    requestedSpecimenCount: order.requestedSpecimenCount,
    sourceGroups: order.sourceGroups
      .map((group) => ({
        biologicalSource: group.biologicalSource.trim().toLocaleLowerCase(),
        specimenCount: group.specimenCount,
      }))
      .sort((left, right) =>
        left.biologicalSource.localeCompare(right.biologicalSource),
      ),
    storageRequirements: order.storageRequirements,
    safetyDeclaration: order.safetyDeclaration,
  };
}

function normalizedBiologicalSources(
  groups: Array<{ biologicalSource?: string }>,
) {
  return groups
    .map((group) => group.biologicalSource?.trim().toLocaleLowerCase() ?? "")
    .filter(Boolean);
}
