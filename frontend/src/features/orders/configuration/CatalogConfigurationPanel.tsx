import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useNavigate } from '@tanstack/react-router';
import { LabServiceOfferingsPanel } from './LabServiceOfferingsPanel';
import { useOrderDraftGuard } from '../use-order-draft-guard';
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  getOrderErrorMessage,
  getOrderConfiguration,
  saveCatalogItem,
  type OrderConfiguration,
} from "#/api/order-management";
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
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
  RequiredDialogFooter,
  RequiredFieldName,
} from "#/components/ui/required-field";

const schema = z
  .object({
    externalItemId: z
      .string()
      .trim()
      .min(1, "Enter a stable item code.")
      .max(255),
    name: z.string().trim().min(1, "Enter an item name.").max(255),
    description: z.string().trim().max(2000),
    salesUnit: z.string().trim().min(1, "Enter a sales unit.").max(100),
    basePrice: z.coerce.number().min(0, "Base price cannot be negative."),
    currency: z.string().trim().length(3, "Use a three-letter currency code."),
    isActive: z.boolean(),
  })
  .superRefine((value, context) => {
    if (
      value.externalItemId.toLowerCase() === "pseq-lab-service" &&
      value.salesUnit.toLowerCase() !== "specimen"
    ) {
      context.addIssue({
        code: "custom",
        path: ["salesUnit"],
        message: "PSeq Lab Service must use the specimen sales unit.",
      });
    }
  });

type FormValues = z.input<typeof schema>;
type Values = z.output<typeof schema>;
type CatalogItem = OrderConfiguration["catalogItems"][number];
const salesUnits = [
  { value: 'specimen', label: 'Per sample-sequencing run' },
  { value: 'kit', label: 'Per kit' },
  { value: 'each', label: 'Per item' },
  { value: 'service', label: 'Per service' },
];
const selectClass = 'h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none';
function salesUnitLabel(value: string) {
  return salesUnits.find(unit => unit.value === value)?.label ?? value;
}
const empty: Values = {
  externalItemId: "",
  name: "",
  description: "",
  salesUnit: "specimen",
  basePrice: 0,
  currency: "USD",
  isActive: true,
};

export function CatalogConfigurationPanel({
  configuration,
  catalogItemId,
  apiEnabled = true,
}: {
  configuration: OrderConfiguration;
  catalogItemId?: string;
  apiEnabled?: boolean;
}) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const actionRef = useRef<HTMLButtonElement | null>(null);
  const [editing, setEditing] = useState<CatalogItem | null | undefined>(
    undefined,
  );
  const generatedCode = useRef('');
  const form = useForm<FormValues, unknown, Values>({
    resolver: zodResolver(schema),
    defaultValues: empty,
  });
  const mutation = useMutation({
    mutationFn: (values: Values) =>
      saveCatalogItem(editing?.id ?? null, {
        ...values,
        currency: values.currency.toUpperCase(),
        version: editing?.version,
      }),
    onError: async () => {
      try {
        const fresh = await client.fetchQuery({ queryKey: ['order-configuration'], queryFn: getOrderConfiguration, staleTime: 0 });
        const current = fresh.catalogItems.find(item => item.id === editing?.id);
        if (current) { setEditing(current); form.reset(current, { keepDirtyValues: true }); }
      } catch { /* Keep the original save error and entered values visible. */ }
    },
    onSuccess: async (saved) => {
      await client.invalidateQueries({ queryKey: ["order-configuration"] });
      setEditing(undefined);
      form.reset(empty);
      if (!editing) await navigate({ to: '/order-configuration/catalog/$catalogItemId', params: { catalogItemId: saved.id }, search: { configurationSection: 'catalog' } });
    },
  });
  const labServiceItem = configuration.catalogItems.find(
    (item) => item.isPSeqLabService,
  );
  const selected = configuration.catalogItems.find(item => item.id === catalogItemId);
  const isLabService = form.watch('externalItemId').trim().toLowerCase() === 'pseq-lab-service';
  const selectedUnit = form.watch('salesUnit');
  const unitOptions = Array.from(new Set([...salesUnits.map(unit => unit.value), ...configuration.catalogItems.map(item => item.salesUnit), selectedUnit])).filter(Boolean);
  useOrderDraftGuard(editing !== undefined && form.formState.isDirty, mutation.isPending);
  function close() {
    if (!mutation.isPending && (!form.formState.isDirty || window.confirm('Discard unsaved catalog changes?'))) setEditing(undefined);
  }
  const labServiceReady = Boolean(
    labServiceItem?.isActive &&
    labServiceItem.salesUnit.toLowerCase() === "specimen",
  );

  function open(item: CatalogItem | null) {
    actionRef.current = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null;
    mutation.reset();
    setEditing(item);
    if (!item) generatedCode.current = 'ITEM-' + crypto.randomUUID().replaceAll('-', '').toUpperCase();
    form.reset(
      item
        ? {
            externalItemId: item.externalItemId,
            name: item.name,
            description: item.description,
            salesUnit: item.salesUnit,
            basePrice: item.basePrice,
            currency: item.currency,
            isActive: item.isActive,
          }
        : { ...empty, externalItemId: labServiceItem ? generatedCode.current : 'pseq-lab-service', name: labServiceItem ? '' : 'PSeq Lab Service', salesUnit: labServiceItem ? 'each' : 'specimen' },
    );
    if (item?.isPSeqLabService && item.salesUnit !== 'specimen') form.setValue('salesUnit', 'specimen', { shouldDirty: true, shouldValidate: true });
  }

  return (
    <>
      {catalogItemId ? <div className="mb-4"><Link className="text-sm text-primary underline" to="/order-configuration" search={{ configurationSection: 'catalog' }}>Back to service catalog</Link></div> : null}
      {catalogItemId && !selected ? <Alert variant="destructive"><AlertTitle>Service item not found</AlertTitle><AlertDescription>Return to the catalog and select an available item.</AlertDescription></Alert> : selected ? <div className="space-y-5">
        <Card className="gap-0 py-0">
          <CardHeader className="grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b bg-muted/50 p-4">
            <CardTitle className="min-w-0">{selected.name}</CardTitle>
            <Button className="col-start-2 row-start-1 justify-self-end" variant="outline" disabled={!apiEnabled} onClick={() => open(selected)}>Edit item</Button>
            <CardDescription className="col-span-full">Commercial pricing and availability</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm">{selected.description || 'No description provided.'}</p>
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div><dt className="text-muted-foreground">Base price</dt><dd>{formatMoney(selected.basePrice, selected.currency)}</dd></div>
              <div><dt className="text-muted-foreground">Sales unit</dt><dd>{salesUnitLabel(selected.salesUnit)}</dd></div>
              <div><dt className="text-muted-foreground">Status</dt><dd>{selected.isActive ? 'Active' : 'Inactive'}</dd></div>
            </dl>
            {!selected.isActive ? <p className="text-sm text-muted-foreground">To activate this item, select Edit item, set Status to Active, and save.</p> : null}
            <details className="text-sm"><summary className="w-fit cursor-pointer rounded-sm text-primary focus-visible:ring-2 focus-visible:ring-ring">Reference details</summary><p className="mt-2 break-all text-muted-foreground">Item reference: {selected.externalItemId}. This permanent reference links pricing and accounting records and stays the same when the item is renamed.</p></details>
          </CardContent>
        </Card>
        {selected.isPSeqLabService ? <LabServiceOfferingsPanel configuration={configuration} apiEnabled={apiEnabled} catalogItemId={selected.id} /> : <p className="text-sm text-muted-foreground">Scientific definitions for direct laboratory ordering currently apply to the PSeq Lab Service item. Kit and assembly configuration remains in its own settings page.</p>}
      </div> : (
      <Card className="gap-0 py-0">
        <CardHeader className="grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b bg-muted/50 p-4">
          <CardTitle className="min-w-0">Service catalog</CardTitle>
          <Button className="col-start-2 row-start-1 justify-self-end" type="button" disabled={!apiEnabled} onClick={() => open(null)}>
            <Plus data-icon="inline-start" />
            Add item
          </Button>
          <CardDescription className="col-span-full">
            Maintain what each price covers, its amount, and whether the item is active for new pricing.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {!labServiceReady ? (
            <Alert variant="destructive" className="mb-5">
              <AlertTitle>PSeq Lab Service pricing is not ready</AlertTitle>
              <AlertDescription>
                {labServiceItem ? 'Open PSeq Lab Service, select Edit item, set Status to Active, and save.' : 'Select Add item and choose PSeq Lab Service. Its required reference and per-sample-sequencing-run pricing are supplied automatically.'}
              </AlertDescription>
            </Alert>
          ) : null}
          {configuration.catalogItems.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-3 font-medium">Item</th>
                    <th className="px-3 py-3 font-medium">Sales unit</th>
                    <th className="px-3 py-3 text-right font-medium">
                      Base price
                    </th>
                    <th className="py-3 pl-3 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {configuration.catalogItems.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-3 pr-3">
                        <Link
                          to="/order-configuration/catalog/$catalogItemId"
                          params={{ catalogItemId: item.id }}
                          search={{ configurationSection: 'catalog' }}
                          className="cursor-pointer text-left font-medium text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                          {item.name}
                        </Link>
                        {item.isPSeqLabService ? (
                          <Badge variant="outline" className="ml-2">
                            PSeq Lab Service
                          </Badge>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">{salesUnitLabel(item.salesUnit)}</td>
                      <td className="px-3 py-3 text-right">
                        {formatMoney(item.basePrice, item.currency)}
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <Badge
                          variant={item.isActive ? "secondary" : "outline"}
                        >
                          {item.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No catalog items configured.
            </p>
          )}
        </CardContent>
      </Card>
      )}

      <Dialog
        open={editing !== undefined}
        onOpenChange={(openState) => !openState && close()}
      >
        <DialogContent
          showCloseButton={!mutation.isPending}
          aria-busy={mutation.isPending}
          onCloseAutoFocus={event => {
            if (actionRef.current?.isConnected) {
              event.preventDefault();
              actionRef.current.focus();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit catalog item" : "Add catalog item"}
            </DialogTitle>
            <DialogDescription>
              Set the item’s price and status. Active items are available for new pricing; existing orders keep their saved details. Item references are managed automatically.
            </DialogDescription>
          </DialogHeader>
          <form
            id="catalog-item-form"
            noValidate
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <fieldset disabled={mutation.isPending} className="grid grid-cols-1 gap-4">
            {!editing ? <Field id="catalog-type" label="Item type">
              <select id="catalog-type" className={selectClass} value={isLabService ? 'lab' : 'other'} onChange={event => {
                const lab = event.target.value === 'lab';
                form.setValue('externalItemId', lab ? 'pseq-lab-service' : generatedCode.current, { shouldDirty: true, shouldValidate: true });
                form.setValue('salesUnit', lab ? 'specimen' : 'each', { shouldDirty: true, shouldValidate: true });
                if (!form.getValues('name') || form.getValues('name') === 'PSeq Lab Service') form.setValue('name', lab ? 'PSeq Lab Service' : '', { shouldDirty: true });
              }}>
                <option value="lab" disabled={Boolean(labServiceItem)}>PSeq Lab Service{labServiceItem ? ' (already configured)' : ''}</option>
                <option value="other">Other catalog item</option>
              </select>
            </Field> : null}
            <div className="space-y-2">
              <Label htmlFor="catalog-status"><RequiredFieldName>Status</RequiredFieldName></Label>
              <select id="catalog-status" className={selectClass} value={form.watch('isActive') ? 'active' : 'inactive'} aria-describedby="catalog-status-help" onChange={event => form.setValue('isActive', event.target.value === 'active', { shouldDirty: true })}>
                <option value="active">Active</option><option value="inactive">Inactive</option>
              </select>
              <p id="catalog-status-help" className="text-xs text-muted-foreground">Active makes this item available for new pricing. Inactive keeps it out of new pricing; saved orders retain their details.</p>
            </div>
            <Field
              id="catalog-name"
              label="Name"
              error={form.formState.errors.name?.message}
            >
              <Input
                id="catalog-name"
                aria-invalid={Boolean(form.formState.errors.name)}
                {...form.register("name")}
              />
            </Field>
            <div>
              <Label htmlFor="catalog-description">Description</Label>
              <textarea
                id="catalog-description"
                rows={3}
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                {...form.register("description")}
              />
            </div>
            <Field
              id="catalog-unit"
              label="Sales unit"
              error={form.formState.errors.salesUnit?.message}
            >
              {isLabService ? <>
                <select id="catalog-unit" className={selectClass} value="specimen" disabled aria-describedby="catalog-unit-fixed-help"><option value="specimen">Per sample-sequencing run</option></select>
                <p id="catalog-unit-fixed-help" className="mt-1 text-xs text-muted-foreground">PSeq Lab Service is priced per sample-sequencing run. One sample sequenced 20 times counts as 20 runs. This unit is fixed automatically.</p>
              </> : <>
                <select id="catalog-unit" className={selectClass} aria-invalid={Boolean(form.formState.errors.salesUnit)} aria-describedby="catalog-unit-help" {...form.register('salesUnit')}>
                  {unitOptions.map(unit => <option key={unit} value={unit}>{salesUnitLabel(unit)}</option>)}
                </select>
                <p id="catalog-unit-help" className="mt-1 text-xs text-muted-foreground">Choose what one unit of the base price covers. Existing catalog units remain available.</p>
              </>}
            </Field>
            <Field
              id="catalog-price"
              label="Base price"
              error={form.formState.errors.basePrice?.message}
            >
              <Input
                id="catalog-price"
                type="number"
                min="0"
                step="0.01"
                aria-invalid={Boolean(form.formState.errors.basePrice)}
                {...form.register("basePrice")}
              />
            </Field>
            <Field
              id="catalog-currency"
              label="Currency"
              error={form.formState.errors.currency?.message}
            >
              <Input
                id="catalog-currency"
                maxLength={3}
                className="uppercase"
                aria-invalid={Boolean(form.formState.errors.currency)}
                {...form.register("currency")}
              />
            </Field>
            </fieldset>
          </form>
          {mutation.error ? (
            <Alert variant="destructive">
              <AlertTitle>Catalog item was not saved</AlertTitle>
              <AlertDescription>
                {getOrderErrorMessage(
                  mutation.error,
                  "Review the item and try again.",
                )}
                {' '}Your edits remain; review them alongside the latest saved values before retrying.
              </AlertDescription>
            </Alert>
          ) : null}
          <RequiredDialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={mutation.isPending}>
                Cancel
              </Button>
            <Button
              type="submit"
              form="catalog-item-form"
              disabled={mutation.isPending || !apiEnabled || Boolean(editing && !form.formState.isDirty)}
            >
              {mutation.isPending ? "Saving…" : "Save item"}
            </Button>
          </RequiredDialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id}>
        <RequiredFieldName>{label}</RequiredFieldName>
      </Label>
      <div className="mt-2">{children}</div>
      {error ? (
        <p role="alert" className="mt-1 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    value,
  );
}
