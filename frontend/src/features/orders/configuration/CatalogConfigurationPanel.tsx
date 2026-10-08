import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { LabServiceOfferingsPanel } from './LabServiceOfferingsPanel';
import { CatalogItemActions } from './CatalogItemActions';
import { CatalogItemRowActions } from './CatalogItemRowActions';
import { parseCatalogListSearch } from './catalog-list-navigation';
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
import { Checkbox } from "#/components/ui/checkbox";
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
import { Field as SharedField, FieldDescription, FieldError } from '#/components/ui/field';
import { Label } from "#/components/ui/label";
import { NativeSelect } from '#/components/ui/native-select';
import { isPositiveDecimalQuantity } from '#/features/lab-operations/decimal-quantity';
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
    serviceFamily: z.enum(['Other', 'PSeqLabService']),
    maximumCustomerSamples: z.union([z.literal(''), z.coerce.number().int('Use a whole number.').min(1).max(10000)]).transform(v => v === '' ? null : v).nullable(),
    minimumSequencingVolumeUlText: z.string().trim().refine(value => !value || isPositiveDecimalQuantity(value), 'Enter a positive volume in µL.'),
  })
  .superRefine((value, context) => {
    if (
      value.serviceFamily === 'PSeqLabService' &&
      value.salesUnit.toLowerCase() !== "specimen"
    ) {
      context.addIssue({
        code: "custom",
        path: ["salesUnit"],
        message: "PSeq Lab Service offerings use Per sample.",
      });
    }
  });

type FormValues = z.input<typeof schema>;
type Values = z.output<typeof schema>;
type CatalogItem = OrderConfiguration["catalogItems"][number];
const salesUnits = [
  { value: 'specimen', label: 'Per sample' },
  { value: 'kit', label: 'Per kit' },
  { value: 'each', label: 'Per item' },
  { value: 'service', label: 'Per service' },
];
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
  isActive: false,
  serviceFamily: 'PSeqLabService',
  maximumCustomerSamples: null,
  minimumSequencingVolumeUlText: '',
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
  const listSearch = parseCatalogListSearch(useSearch({ strict: false }));
  const catalogSearch = listSearch.catalogSearch ?? '';
  const [searchInput, setSearchInput] = useState({ saved: catalogSearch, text: catalogSearch });
  if (searchInput.saved !== catalogSearch) {
    setSearchInput({ saved: catalogSearch, text: catalogSearch });
  }
  useEffect(() => {
    if (catalogItemId || searchInput.text.trim() === catalogSearch) return;
    const timer = setTimeout(() => {
      void navigate({
        to: '/order-configuration',
        search: previous => ({ ...previous, configurationSection: 'catalog', catalogSearch: searchInput.text.trim() || undefined }),
        replace: true,
        resetScroll: false,
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [catalogItemId, catalogSearch, navigate, searchInput.text]);
  const needle = catalogSearch.toLocaleLowerCase();
  const visibleItems = configuration.catalogItems.filter(item =>
    (listSearch.catalogShowInactive || item.isActive)
    && (!needle || [item.name, item.description, item.externalItemId, salesUnitLabel(item.salesUnit)].some(value => value.toLocaleLowerCase().includes(needle))),
  );
  const hasFilters = Boolean(searchInput.text || listSearch.catalogShowInactive);
  const actionRef = useRef<HTMLButtonElement | null>(null);
  const [editing, setEditing] = useState<CatalogItem | null | undefined>(
    undefined,
  );
  const generatedCode = useRef('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const keepEditingRef = useRef<HTMLButtonElement>(null);
  const form = useForm<FormValues, unknown, Values>({
    resolver: zodResolver(schema),
    defaultValues: empty,
  });
  const mutation = useMutation({
    mutationFn: (values: Values) =>
      saveCatalogItem(editing?.id ?? null, {
        ...values,
        currency: values.currency.toUpperCase(),
        maximumCustomerSamples: values.serviceFamily === 'PSeqLabService' ? values.maximumCustomerSamples : null,
        minimumSequencingVolumeUlText: values.serviceFamily === 'PSeqLabService' ? values.minimumSequencingVolumeUlText || null : null,
        version: editing?.version,
      }),
    onError: async () => {
      try {
        const fresh = await client.fetchQuery({ queryKey: ['order-configuration'], queryFn: getOrderConfiguration, staleTime: 0 });
        const current = fresh.catalogItems.find(item => item.id === editing?.id);
        if (current) { setEditing(current); form.reset({ ...current, serviceFamily: current.isPSeqLabService ? 'PSeqLabService' : 'Other', maximumCustomerSamples: current.maximumCustomerSamples ?? null, minimumSequencingVolumeUlText: current.minimumSequencingVolumeUlText ?? '' }, { keepDirtyValues: true }); }
      } catch { /* Keep the original save error and entered values visible. */ }
    },
    onSuccess: async (saved) => {
      await client.invalidateQueries({ queryKey: ["order-configuration"] });
      setEditing(undefined);
      form.reset(empty);
      if (!editing) await navigate({ to: '/order-configuration/catalog/$catalogItemId', params: { catalogItemId: saved.id }, search: { ...listSearch, configurationSection: 'catalog' } });
    },
  });
  const selected = configuration.catalogItems.find(item => item.id === catalogItemId);
  const isLabService = form.watch('serviceFamily') === 'PSeqLabService';
  const selectedUnit = form.watch('salesUnit');
  const unitOptions = Array.from(new Set([...salesUnits.map(unit => unit.value), ...configuration.catalogItems.map(item => item.salesUnit), selectedUnit])).filter(Boolean);
  useOrderDraftGuard(editing !== undefined && form.formState.isDirty, mutation.isPending);
  function close() {
    if (mutation.isPending) return;
    if (form.formState.isDirty) setConfirmDiscard(true);
    else setEditing(undefined);
  }

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
            serviceFamily: item.isPSeqLabService ? 'PSeqLabService' : 'Other',
            maximumCustomerSamples: item.maximumCustomerSamples ?? null,
            minimumSequencingVolumeUlText: item.minimumSequencingVolumeUlText ?? '',
          }
        : { ...empty, externalItemId: generatedCode.current },
    );
    if (item?.isPSeqLabService && item.salesUnit !== 'specimen') form.setValue('salesUnit', 'specimen', { shouldDirty: true, shouldValidate: true });
  }

  return (
    <>
      {catalogItemId ? <div className="mb-4"><Link className="text-sm text-primary underline" to="/order-configuration" search={{ ...listSearch, configurationSection: 'catalog' }}>Back to service catalog</Link></div> : null}
      {catalogItemId && !selected ? <Alert variant="destructive"><AlertTitle>Service item not found</AlertTitle><AlertDescription>Return to the catalog and select an available item.</AlertDescription></Alert> : selected ? <div className="space-y-5">
        <Card className="gap-0 py-0">
          <CardHeader className="grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b bg-muted/50 p-4">
            <div className="min-w-0 space-y-1">
              <CardTitle>{selected.name}</CardTitle>
              <CardDescription>Commercial pricing and availability</CardDescription>
            </div>
            <CatalogItemActions key={selected.id} item={selected} apiEnabled={apiEnabled} onEdit={trigger => { open(selected); actionRef.current = trigger }} />
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm">{selected.description || 'No description provided.'}</p>
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div><dt className="text-muted-foreground">Base price</dt><dd>{formatMoney(selected.basePrice, selected.currency)}</dd></div>
              <div><dt className="text-muted-foreground">Sales unit</dt><dd>{salesUnitLabel(selected.salesUnit)}</dd></div>
              <div><dt className="text-muted-foreground">Status</dt><dd>{selected.isActive ? 'Active' : 'Inactive'}</dd></div>
              <div><dt className="text-muted-foreground">Service family</dt><dd>{selected.isPSeqLabService ? 'PSeq Lab Service' : 'Other'}</dd></div>
              {selected.isPSeqLabService ? <div><dt className="text-muted-foreground">Customer sample limit</dt><dd>{selected.maximumCustomerSamples ?? 'Unconfigured — Customer placement unavailable'}</dd></div> : null}
              {selected.isPSeqLabService ? <div><dt className="text-muted-foreground">Minimum sequencing volume per tube</dt><dd className="font-medium">{selected.minimumSequencingVolumeUlText ? `${selected.minimumSequencingVolumeUlText} µL` : 'Unconfigured — sequencing tube preparation unavailable'}</dd></div> : null}
            </dl>
            {!selected.isActive ? <p className="text-sm text-muted-foreground">Inactive items are excluded from new pricing.</p> : null}
            <details className="text-sm"><summary className="w-fit cursor-pointer rounded-sm text-primary focus-visible:ring-2 focus-visible:ring-ring">Reference details</summary><p className="mt-2 break-all text-muted-foreground">Item reference: {selected.externalItemId}. This permanent reference links pricing and accounting records and stays the same when the item is renamed.</p></details>
          </CardContent>
        </Card>
        {selected.isPSeqLabService ? <LabServiceOfferingsPanel configuration={configuration} apiEnabled={apiEnabled} catalogItemId={selected.id} /> : null}
      </div> : (
      <Card className="gap-0 py-0">
        <CardHeader className="grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b bg-muted/50 p-4">
          <div className="min-w-0 space-y-1">
            <CardTitle>Service catalog</CardTitle>
            <CardDescription>
              Maintain what each price covers, its amount, and whether the item is active for new pricing.
            </CardDescription>
          </div>
          <Button className="col-start-2 row-start-1 self-start justify-self-end" type="button" disabled={!apiEnabled} onClick={() => open(null)}>
            <Plus data-icon="inline-start" />
            Add item
          </Button>
          <div className="col-span-full flex flex-col gap-3 sm:flex-row sm:items-end">
            <SharedField className="min-w-0 flex-1">
              <Input id="catalog-search" type="search" aria-label="Search service catalog" placeholder="Search by name, description, reference or sales unit" maxLength={255} value={searchInput.text} onChange={event => setSearchInput({ saved: catalogSearch, text: event.target.value })} />
            </SharedField>
            <div className="flex min-h-9 flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox id="catalog-show-inactive" checked={Boolean(listSearch.catalogShowInactive)} onCheckedChange={checked => void navigate({ to: '/order-configuration', search: previous => ({ ...previous, configurationSection: 'catalog', catalogShowInactive: checked === true || undefined }), replace: true, resetScroll: false })} />
                <Label htmlFor="catalog-show-inactive" className="cursor-pointer">Show inactive</Label>
              </div>
              {hasFilters ? <Button type="button" variant="ghost" size="sm" onClick={() => { setSearchInput({ saved: catalogSearch, text: '' }); void navigate({ to: '/order-configuration', search: previous => ({ ...previous, configurationSection: 'catalog', catalogSearch: undefined, catalogShowInactive: undefined }), replace: true, resetScroll: false }); }}>Clear all</Button> : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <p role="status" className="sr-only">{visibleItems.length} {visibleItems.length === 1 ? 'catalog item' : 'catalog items'} shown.</p>
          {visibleItems.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-3 font-medium">Item</th>
                    <th className="px-3 py-3 font-medium">Sales unit</th>
                    <th className="px-3 py-3 text-right font-medium">
                      Base price
                    </th>
                    <th className="px-3 py-3 text-right font-medium">Status</th>
                    <th className="py-3 pl-3 text-right font-medium"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-3 pr-3">
                        <Link
                          to="/order-configuration/catalog/$catalogItemId"
                          params={{ catalogItemId: item.id }}
                          search={{ ...listSearch, configurationSection: 'catalog' }}
                          className="cursor-pointer text-left font-medium text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                          {item.name}
                        </Link>
                      </td>
                      <td className="px-3 py-3">{salesUnitLabel(item.salesUnit)}</td>
                      <td className="px-3 py-3 text-right">
                        {formatMoney(item.basePrice, item.currency)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Badge
                          variant={item.isActive ? "secondary" : "outline"}
                        >
                          {item.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3 pl-3">
                        <CatalogItemRowActions item={item} apiEnabled={apiEnabled} onEdit={trigger => { open(item); actionRef.current = trigger }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {!configuration.catalogItems.length ? 'No catalog items configured.' : needle ? 'No catalog items match this search.' : 'No active catalog items. Select Show inactive to review inactive items.'}
            </p>
          )}
        </CardContent>
      </Card>
      )}

      <Dialog
        open={editing !== undefined && !confirmDiscard}
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
            <Field id="catalog-type" label="Service family">
              <NativeSelect id="catalog-type" value={isLabService ? 'lab' : 'other'} onChange={event => {
                const lab = event.target.value === 'lab';
                form.setValue('serviceFamily', lab ? 'PSeqLabService' : 'Other', { shouldDirty: true, shouldValidate: true });
                form.setValue('salesUnit', lab ? 'specimen' : 'each', { shouldDirty: true, shouldValidate: true });
              }}>
                <option value="lab">PSeq Lab Service</option>
                <option value="other">Other</option>
              </NativeSelect>
            </Field>
            <div className="space-y-2">
              <Label htmlFor="catalog-status"><RequiredFieldName>Status</RequiredFieldName></Label>
              <NativeSelect id="catalog-status" value={form.watch('isActive') ? 'active' : 'inactive'} aria-describedby="catalog-status-help" onChange={event => form.setValue('isActive', event.target.value === 'active', { shouldDirty: true })}>
                <option value="active">Active</option><option value="inactive">Inactive</option>
              </NativeSelect>
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
                <NativeSelect id="catalog-unit" value="specimen" disabled aria-describedby="catalog-unit-fixed-help"><option value="specimen">Per sample</option></NativeSelect>
                <p id="catalog-unit-fixed-help" className="mt-1 text-xs text-muted-foreground">The standard price is per sample and includes one library preparation, one sequencing run and data assembly. Additional runs use the prepared library and are priced separately during quote review. The sample unit is fixed automatically.</p>
              </> : <>
                <NativeSelect id="catalog-unit" aria-invalid={Boolean(form.formState.errors.salesUnit)} aria-describedby="catalog-unit-help" {...form.register('salesUnit')}>
                  {unitOptions.map(unit => <option key={unit} value={unit}>{salesUnitLabel(unit)}</option>)}
                </NativeSelect>
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
            {isLabService ? <SharedField><Label htmlFor="catalog-customer-limit">Maximum Customer samples</Label><FieldDescription>Set the largest order Customers may place directly. Above this limit, they contact Sales for negotiated pricing. Leave blank to disable Customer standard placement until a limit is configured.</FieldDescription><Input id="catalog-customer-limit" type="number" min={1} max={10000} {...form.register('maximumCustomerSamples')} aria-invalid={Boolean(form.formState.errors.maximumCustomerSamples)} aria-describedby="catalog-customer-limit-error" /><FieldError id="catalog-customer-limit-error">{form.formState.errors.maximumCustomerSamples?.message}</FieldError></SharedField> : null}
            {isLabService ? <SharedField><Label htmlFor="catalog-sequencing-minimum">Minimum sequencing volume per tube (µL)</Label><FieldDescription id="catalog-sequencing-minimum-help">Required before preparing sequencing tubes. Leave blank to block new tube preparation. Operators cannot change this requirement; each prepared pair retains its saved Catalog version.</FieldDescription><Input id="catalog-sequencing-minimum" inputMode="decimal" maxLength={40} {...form.register('minimumSequencingVolumeUlText')} aria-invalid={Boolean(form.formState.errors.minimumSequencingVolumeUlText)} aria-describedby="catalog-sequencing-minimum-help catalog-sequencing-minimum-error" /><FieldError id="catalog-sequencing-minimum-error">{form.formState.errors.minimumSequencingVolumeUlText?.message}</FieldError></SharedField> : null}
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
      <Dialog open={confirmDiscard} onOpenChange={openState => { if (!openState) setConfirmDiscard(false); }}>
        <DialogContent onOpenAutoFocus={event => { event.preventDefault(); keepEditingRef.current?.focus(); }}>
          <DialogHeader><DialogTitle>Discard catalog changes?</DialogTitle></DialogHeader>
          <div><DialogDescription>Unsaved changes to this Catalog item, including its sequencing requirement, will be discarded. Saved items and prepared tube pairs will be retained.</DialogDescription></div>
          <RequiredDialogFooter showLegend={false}><Button ref={keepEditingRef} type="button" variant="outline" onClick={() => setConfirmDiscard(false)}>Keep editing</Button><Button type="button" variant="destructive" onClick={() => { setConfirmDiscard(false); setEditing(undefined); }}>Discard changes</Button></RequiredDialogFooter>
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
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>
        <RequiredFieldName>{label}</RequiredFieldName>
      </Label>
      <div>{children}</div>
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
