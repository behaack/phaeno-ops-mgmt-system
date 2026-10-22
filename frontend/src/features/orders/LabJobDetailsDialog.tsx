import { Field as PortalField } from '#/components/ui/field'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { NativeSelect } from '#/components/ui/native-select'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { confirmPortal } from '#/components/PortalConfirmation'
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import {
  createLabOrder,
  getLabOrder,
  listLabOrderSampleTypes,
  getOrderErrorMessage,
  isOrderConcurrencyError,
  updateLabOrder,
  type LabServiceOrder,
} from "#/api/order-management";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
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
  RequiredLegend,
} from "#/components/ui/required-field";
import { Textarea } from "#/components/ui/textarea";
import { usePhaenoSession } from "#/features/auth/session-context";
import { CustomerStandardOrderDialog } from './CustomerStandardOrderDialog';

const duplicateBiologicalSourcesMessage =
  "Duplicate biological sources are not permitted.";

const jobDetailsSchema = z
  .object({
    customerReference: z
      .string()
      .trim()
      .min(1, "Job name is required.")
      .max(255, "Job name must be 255 characters or fewer."),
    sampleTypeDefinitionId: z.string().uuid("Select one sample type for this Job."),
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
    sequencingRunCount: z.string().trim().refine(v => v === "" || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 10000), "Enter a whole number from 1 to 10,000."),
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
    if (values.sequencingRunCount && Number(values.sequencingRunCount) < sourceTotal) context.addIssue({ code: "custom", path: ["sequencingRunCount"], message: "Include at least one run for every sample." });
    if (sourceTotal > 10000)
      context.addIssue({
        code: "custom",
        path: ["sourceGroups"],
        message: "A Job can contain at most 10,000 samples.",
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
  onOpenChange: (open: boolean) => void;
  onSaved: (order: LabServiceOrder) => void | Promise<void>;
};

export function LabJobDetailsDialog(props: LabJobDetailsDialogProps) {
  const { session, selectedOrganizationId } = usePhaenoSession();
  const kind = session?.memberships.find(m => m.organizationId === selectedOrganizationId)?.organizationKind;
  return kind === 'Customer' && (!props.order || props.order.customerDraft)
    ? <CustomerStandardOrderDialog {...props} />
    : <SalesPricingRequestDialog {...props} />;
}

function SalesPricingRequestDialog({
  open,
  order,
  onOpenChange,
  onSaved,
}: LabJobDetailsDialogProps) {
  const __customerText = useCustomerText()

  const { authProvider, session } = usePhaenoSession();
  const queryClient = useQueryClient();
  const canCreate = Boolean(session?.capabilities.canCreateLabServiceRequests);
  const apiEnabled = authProvider !== "mock" && canCreate;
  const sampleTypes = useQuery({
    queryKey: ["lab-order-sample-types", false],
    queryFn: () => listLabOrderSampleTypes(false),
    enabled: open && apiEnabled,
  });
  const form = useForm<JobDetailsFormInput, unknown, JobDetailsValues>({
    resolver: zodResolver(jobDetailsSchema),
    mode: "onBlur",
    defaultValues: {
      customerReference: "",
      sampleTypeDefinitionId: "",
      sourceGroups: [{ biologicalSource: "", specimenCount: 1 }],
      sequencingRunCount: "",
      storageRequirements: "",
      safetyDeclaration: "",
      jobNotes: "",
    },
  });
  const { isDirty: __formDraftDirty } = form.formState

  const sourceGroups = useFieldArray({
    control: form.control,
    name: "sourceGroups",
  });
  const baseOrderRef = useRef<LabServiceOrder | null>(order ?? null);
  const saveVersionRef = useRef<number | null>(order?.version ?? null);
  const resetKeyRef = useRef<string | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const mutation = useMutation({
    mutationFn: async (values: JobDetailsValues) => {
      const customerReference = values.customerReference;
      const sampleTypeDefinitionId = values.sampleTypeDefinitionId;
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
        return createLabOrder({
          sampleTypeDefinitionId,
          submitForPricing: true,
          customerReference,
          description,
          hasMixedBiologicalSources,
          sharedBiologicalSource,
          storageRequirements,
          safetyDeclaration,
          samples: [],
          requestedSpecimenCount,
          sourceGroups: values.sourceGroups,
            sequencingRunCount: Number(values.sequencingRunCount) || requestedSpecimenCount,
        });
      }

      const baseOrder = baseOrderRef.current ?? order;
      const saveVersion = saveVersionRef.current ?? baseOrder.version;
      const update = (version: number) =>
        updateLabOrder(baseOrder.id, {
          sampleTypeDefinitionId,
          submitForPricing: true,
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
            sequencingRunCount: Number(values.sequencingRunCount) || requestedSpecimenCount,
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

    const resetKey = order?.id ?? "new-job";
    if (resetKeyRef.current === resetKey) return;
    resetKeyRef.current = resetKey;
    baseOrderRef.current = order ?? null;
    saveVersionRef.current = order?.version ?? null;
    form.reset(jobDetailsFormValues(order));
  }, [form, open, order]);

  const formId = order ? `job-details-${order.id}` : "create-lab-job";
  const editing = Boolean(order);
  const canSave =
    apiEnabled &&
    !sampleTypes.isPending && !sampleTypes.isError &&
    (!editing || Boolean(order?.canEdit));
  const watchedSourceGroups = form.watch("sourceGroups");
  const sourceTotal = watchedSourceGroups.reduce(
    (sum, group) => sum + (Number(group.specimenCount) || 0),
    0,
  );
  function submit(values: JobDetailsValues) {
    mutation.mutate(values);
  }
  async function requestOpenChange(nextOpen: boolean) {
    if (mutation.isPending) return;
    if (!nextOpen && __formDraftDirty && !(await confirmPortal("Discard your unsaved Job details?"))) return;
    mutation.reset();
    onOpenChange(nextOpen);
  }
  const sourceError = form.formState.errors.sourceGroups?.root?.message ?? form.formState.errors.sourceGroups?.message;
  return <Dialog open={open} onOpenChange={requestOpenChange}>
    <DialogContent className="sm:max-w-3xl" showCloseButton={!mutation.isPending} onOpenAutoFocus={() => { openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null }} onCloseAutoFocus={event => { if (openerRef.current?.isConnected) { event.preventDefault(); openerRef.current.focus() } }}>
      <DialogHeader><DialogTitle>{editing ? <CustomerSourceText source={"Modify lab service request"} /> : __customerText('m_b17ad87513d4')}</DialogTitle><DialogDescription><CustomerText message="m_4b9f7cb08379" /></DialogDescription></DialogHeader>
      {!apiEnabled || mutation.error ? <DialogFeedback><Alert variant="destructive"><AlertTitle>{mutation.error ? <CustomerSourceText source={"Job details were not saved"} /> : __customerText('m_24b4eba74d40')}</AlertTitle><AlertDescription>{mutation.error ? getOrderErrorMessage(mutation.error, 'Review your retained entries and try again.') : __customerText('m_a66974c8b80b')}</AlertDescription></Alert></DialogFeedback> : null}
      <form id={formId} noValidate onSubmit={form.handleSubmit(submit)} className="max-h-[65vh] space-y-4 overflow-y-auto px-1">
        <fieldset disabled={mutation.isPending} className="space-y-4">
          <p className="rounded-md border bg-muted/30 p-3 text-sm"><strong><CustomerText message="m_eb4e84cbaf6b" /></strong> <CustomerText message="m_5987eacaf155" /></p>
          <PortalField><Label htmlFor={`${formId}-reference`}><RequiredFieldName><CustomerText message="m_be8102601363" /></RequiredFieldName></Label><FieldDescription id={`${formId}-reference-help`}><CustomerText message="m_e673a9aa5523" /></FieldDescription><Input id={`${formId}-reference`}  {...form.register('customerReference')} aria-invalid={Boolean(form.formState.errors.customerReference)} aria-describedby={`${formId}-reference-help ${formId}-reference-error`} /><FieldError id={`${formId}-reference-error`}>{form.formState.errors.customerReference?.message}</FieldError></PortalField>
          <PortalField><Label htmlFor={`${formId}-sample-type`}><RequiredFieldName><CustomerText message="m_1e3f2e3f87c9" /></RequiredFieldName></Label><FieldDescription><CustomerText message="m_c10f5a24783a" /></FieldDescription><NativeSelect id={`${formId}-sample-type`} className="w-full" {...form.register('sampleTypeDefinitionId')} aria-invalid={Boolean(form.formState.errors.sampleTypeDefinitionId)} aria-describedby={`${formId}-sample-type-error`}><option value=""><CustomerText message="m_14e39b4fecf3" /></option>{sampleTypes.data?.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</NativeSelect><FieldError id={`${formId}-sample-type-error`}>{form.formState.errors.sampleTypeDefinitionId?.message}</FieldError>{sampleTypes.error ? <FieldError role="alert" ><CustomerText message="m_2b91261b549d" /><Button type="button" variant="outline" onClick={() => void sampleTypes.refetch()}><CustomerText message="m_942087cc2d41" /></Button></FieldError> : null}</PortalField>
          <fieldset className="space-y-3"><legend className="text-sm font-medium"><RequiredFieldName><CustomerText message="m_f83705d0366c" /></RequiredFieldName></legend><FieldDescription><CustomerText message="m_0e138dd0c8fb" /></FieldDescription>{sourceGroups.fields.map((field, index) => <div key={field.id} className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_auto]"><PortalField><Label htmlFor={`${formId}-source-${index}`}><RequiredFieldName><CustomerText message="m_62cda8311410" /></RequiredFieldName></Label><Input id={`${formId}-source-${index}`}  aria-label={__customerText('m_706a8588ecb1', { p0: String(index + 1) })} placeholder={__customerText('m_997968dba4b2')} {...form.register(`sourceGroups.${index}.biologicalSource`)} aria-invalid={Boolean(form.formState.errors.sourceGroups?.[index]?.biologicalSource)} aria-describedby={`${formId}-source-${index}-error`} /><FieldError id={`${formId}-source-${index}-error`}>{form.formState.errors.sourceGroups?.[index]?.biologicalSource?.message}</FieldError></PortalField><PortalField><Label htmlFor={`${formId}-count-${index}`}><RequiredFieldName><CustomerText message="m_bc228b269ce0" /></RequiredFieldName></Label><Input id={`${formId}-count-${index}`} type="number" min={1}  {...form.register(`sourceGroups.${index}.specimenCount`)} aria-invalid={Boolean(form.formState.errors.sourceGroups?.[index]?.specimenCount)} aria-describedby={`${formId}-count-${index}-error`} /><FieldError id={`${formId}-count-${index}-error`}>{form.formState.errors.sourceGroups?.[index]?.specimenCount?.message}</FieldError></PortalField><Button type="button" variant="outline" disabled={sourceGroups.fields.length === 1} onClick={() => sourceGroups.remove(index)} aria-label={__customerText('m_0c0447a8cb98', { p0: String(index + 1) })}><CustomerText message="m_c3812fc4acb8" /></Button></div>)}<Button type="button" variant="outline" onClick={() => sourceGroups.append({ biologicalSource: '', specimenCount: 1 })}><CustomerText message="m_6ea6c9ec2a76" /></Button><FieldError>{sourceError}</FieldError><p className="text-sm"><CustomerText message="m_40f61e50877a" />{sourceTotal}</p></fieldset>
          <PortalField><Label htmlFor={`${formId}-runs`}><CustomerText message="m_c358e314e75b" /></Label><Input id={`${formId}-runs`} type="number" min={1} max={10000}  {...form.register('sequencingRunCount')} aria-invalid={Boolean(form.formState.errors.sequencingRunCount)} aria-describedby={`${formId}-runs-help ${formId}-runs-error`} /><FieldDescription id={`${formId}-runs-help`}><CustomerText message="m_5b99fe179c08" /></FieldDescription><FieldError id={`${formId}-runs-error`}>{form.formState.errors.sequencingRunCount?.message}</FieldError></PortalField>
          {(['storageRequirements', 'safetyDeclaration', 'jobNotes'] as const).map(name => <PortalField key={name}><Label htmlFor={`${formId}-${name}`}>{name === 'jobNotes' ? <CustomerSourceText source={"Job notes (optional)"} /> : <RequiredFieldName>{name === 'storageRequirements' ? <CustomerSourceText source={"Storage requirements"} /> : __customerText('m_760ef4312b91')}</RequiredFieldName>}</Label><FieldDescription id={`${formId}-${name}-help`}>{name === 'storageRequirements' ? <CustomerSourceText source={"Describe storage and transport temperature and freeze/thaw limits for every sample."} /> : name === 'safetyDeclaration' ? "Identify biohazards or handling risks. Enter “No known hazards” when none apply." : __customerText('m_430ae2f728fc')}</FieldDescription><Textarea id={`${formId}-${name}`}  {...form.register(name)} aria-invalid={Boolean(form.formState.errors[name])} aria-describedby={`${formId}-${name}-help ${formId}-${name}-error`} /><FieldError id={`${formId}-${name}-error`}>{form.formState.errors[name]?.message}</FieldError></PortalField>)}
        </fieldset>
      </form>
      <RequiredDialogFooter showLegend={false} className="flex-col sm:flex-col"><p className="text-sm text-muted-foreground"><CustomerText message="m_305ef14deba1" /></p><div className="flex flex-wrap items-center justify-between gap-3"><RequiredLegend /><div className="flex gap-2"><Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => requestOpenChange(false)}><CustomerText message="m_19766ed6ccb2" /></Button><Button type="submit" form={formId} disabled={!canSave || mutation.isPending}>{mutation.isPending ? editing ? "Saving…" : "Submitting…" : editing ? "Submit changes" : __customerText('m_917e144e4bc3')}</Button></div></div></RequiredDialogFooter>
    </DialogContent>
  </Dialog>;
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
    sampleTypeDefinitionId: order?.sampleTypeDefinitionId ?? "",
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
    sequencingRunCount: order?.requestedSequencingRunCount && order.requestedSequencingRunCount !== order.requestedSpecimenCount ? String(order.requestedSequencingRunCount) : "",
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
    sampleTypeDefinitionId: order.sampleTypeDefinitionId ?? null,
    description: order.description ?? "",
    requestedSpecimenCount: order.requestedSpecimenCount,
    requestedSequencingRunCount: order.requestedSequencingRunCount ?? order.requestedSpecimenCount,
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
    proposedUnitPrice: order.proposedUnitPrice ?? null,
    priceProposalNote: order.priceProposalNote ?? "",
  };
}

function normalizedBiologicalSources(
  groups: Array<{ biologicalSource?: string }>,
) {
  return groups
    .map((group) => group.biologicalSource?.trim().toLocaleLowerCase() ?? "")
    .filter(Boolean);
}
