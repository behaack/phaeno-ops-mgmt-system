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
import { Checkbox } from "#/components/ui/checkbox";
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
        : empty,
    );
  }

  return (
    <>
      {catalogItemId ? <div className="mb-4"><Link className="text-sm text-primary underline" to="/order-configuration" search={{ configurationSection: 'catalog' }}>Back to service catalog</Link></div> : null}
      {catalogItemId && !selected ? <Alert variant="destructive"><AlertTitle>Service item not found</AlertTitle><AlertDescription>Return to the catalog and select an available item.</AlertDescription></Alert> : selected ? <div className="space-y-5">
        <Card className="gap-0 py-0">
          <CardHeader className="grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b bg-muted/50 p-4">
            <CardTitle className="min-w-0">{selected.name}</CardTitle>
            <Button className="col-start-2 row-start-1 justify-self-end" variant="outline" disabled={!apiEnabled} onClick={() => open(selected)}>Edit item</Button>
            <CardDescription className="col-span-full">{selected.externalItemId}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm">{selected.description || 'No description provided.'}</p>
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div><dt className="text-muted-foreground">Base price</dt><dd>{formatMoney(selected.basePrice, selected.currency)}</dd></div>
              <div><dt className="text-muted-foreground">Sales unit</dt><dd>{selected.salesUnit}</dd></div>
              <div><dt className="text-muted-foreground">Availability</dt><dd>{selected.isActive ? 'Active' : 'Inactive'}</dd></div>
            </dl>
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
            Phaeno maintains the item codes, sales units, and base prices
            used to build Customer quotes and accounting source records.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {!labServiceReady ? (
            <Alert variant="destructive" className="mb-5">
              <AlertTitle>PSeq Lab Service pricing is not ready</AlertTitle>
              <AlertDescription>
                Create or activate the permanent{" "}
                <span className="font-mono">pseq-lab-service</span> item with
                the <span className="font-mono">specimen</span> sales unit
                before issuing Customer laboratory quotes.
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
                        <span className="mt-1 block font-mono text-xs text-muted-foreground">
                          {item.externalItemId}
                        </span>
                      </td>
                      <td className="px-3 py-3">{item.salesUnit}</td>
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
              The item code is a permanent accounting reference. The required
              PSeq Lab Service item uses code “pseq-lab-service” and sales unit
              “specimen”.
            </DialogDescription>
          </DialogHeader>
          <form
            id="catalog-item-form"
            noValidate
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <fieldset disabled={mutation.isPending} className="grid gap-4 sm:grid-cols-2">
            <Field
              id="catalog-code"
              label="Stable item code"
              error={form.formState.errors.externalItemId?.message}
            >
              <Input
                id="catalog-code"
                readOnly={Boolean(editing)}
                aria-readonly={Boolean(editing)}
                className="font-mono read-only:bg-muted"
                aria-invalid={Boolean(form.formState.errors.externalItemId)}
                {...form.register("externalItemId")}
              />
            </Field>
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
            <div className="sm:col-span-2">
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
              <Input
                id="catalog-unit"
                aria-invalid={Boolean(form.formState.errors.salesUnit)}
                {...form.register("salesUnit")}
              />
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
            <div className="flex items-center gap-2 self-end pb-2">
              <Checkbox
                id="catalog-active"
                checked={form.watch("isActive")}
                onCheckedChange={(value) =>
                  form.setValue("isActive", value === true, {
                    shouldDirty: true,
                  })
                }
              />
              <Label
                htmlFor="catalog-active"
                className="cursor-pointer font-normal"
              >
                Available for new pricing
              </Label>
            </div>
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
