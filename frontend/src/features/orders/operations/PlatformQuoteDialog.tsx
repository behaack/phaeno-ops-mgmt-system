import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import {
  getOrderErrorMessage,
  getPlatformOrder,
  isOrderConcurrencyError,
  issuePlatformQuote,
  type OrderConfiguration,
} from "#/api/order-management";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { FieldDescription, FieldError } from "#/components/ui/field";
import {
  RequiredDialogFooter as DialogFooter,
  RequiredFieldName,
} from "#/components/ui/required-field";
import { Textarea } from "#/components/ui/textarea";

const schema = z.object({
  purpose: z.enum(["Initial", "Change"]),
  currency: z.string().trim().length(3),
  tax: z.coerce.number().nonnegative(),
  expiresAt: z.string(),
  lines: z
    .array(
      z.object({
        catalogItemId: z
          .string()
          .uuid("Select an active Phaeno commercial catalog item."),
        description: z.string().trim().min(1).max(500),
        quantity: z.coerce.number().positive(),
        unitPrice: z.coerce
          .number()
          .nonnegative()
          .refine(
            (value) => roundMoney(value) === value,
            "Use no more than two decimal places.",
          ),
      }),
    )
    .min(1)
    .max(100),
  pricingDecisionReason: z.string().trim().max(2000),
});
type FormValues = z.input<typeof schema>;
type Values = z.output<typeof schema>;
type CatalogItem = OrderConfiguration["catalogItems"][number];

export function PlatformQuoteDialog({
  open,
  workflow,
  recordId,
  defaultQuantity,
  priceProposal,
  catalogItems,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  workflow: "lab" | "assembly";
  recordId: string;
  defaultQuantity?: number;
  priceProposal?: {
    unitPrice: number;
    currency: string;
    note?: string | null;
    proposedByUserId?: string | null;
    proposedAt?: string | null;
  } | null;
  catalogItems: OrderConfiguration["catalogItems"];
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const canonicalLabItem =
    workflow === "lab"
      ? catalogItems.find((item) => item.isPSeqLabService)
      : undefined;
  const requiredLabItem =
    canonicalLabItem?.isActive &&
    canonicalLabItem.salesUnit.trim().toLowerCase() === "specimen"
      ? canonicalLabItem
      : undefined;
  const proposedUnitPrice = workflow === "lab" ? priceProposal?.unitPrice : undefined;
  const defaultValues = createDefaultValues(
    workflow,
    defaultQuantity,
    requiredLabItem,
    proposedUnitPrice,
  );
  const form = useForm<FormValues, unknown, Values>({
    resolver: zodResolver(schema),
    defaultValues,
  });
  const [recordRefreshed, setRecordRefreshed] = useState(false);
  const lines = useFieldArray({ control: form.control, name: "lines" });
  const watchedLines = form.watch("lines");
  const watchedCurrency = form.watch("currency");
  const watchedTax = Number(form.watch("tax"));
  const quoteSubtotal = roundMoney(
    watchedLines.reduce((total, line) => {
      const quantity = Number(line.quantity);
      const unitPrice = Number(line.unitPrice);
      return total + (
        Number.isFinite(quantity) && Number.isFinite(unitPrice)
          ? quantity * unitPrice
          : 0
      );
    }, 0),
  );
  const currentQuoteTotal = roundMoney(
    quoteSubtotal + (
      workflow === "assembly" && Number.isFinite(watchedTax) ? watchedTax : 0
    ),
  );
  const currentCurrency = /^[A-Za-z]{3}$/.test(watchedCurrency.trim())
    ? watchedCurrency.toUpperCase()
    : "USD";
  const requiredLabLineCount = requiredLabItem
    ? watchedLines.filter(
        (line) => line.catalogItemId === requiredLabItem.id,
      ).length
    : 0;
  const currentLabUnitPrice = Number(
    watchedLines.find((line) => line.catalogItemId === requiredLabItem?.id)
      ?.unitPrice,
  );
  const amendsProposedPrice =
    proposedUnitPrice !== undefined &&
    Number.isFinite(currentLabUnitPrice) &&
    roundMoney(currentLabUnitPrice) !== roundMoney(proposedUnitPrice);
  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      const latestRecord = await getPlatformOrder(workflow, recordId);
      return issuePlatformQuote(workflow, recordId, {
        ...values,
        version: latestRecord.version,
        tax: workflow === "lab" ? 0 : values.tax,
        expiresAt: values.expiresAt || null,
        pricingDecisionReason:
          workflow === "lab" && amendsProposedPrice
            ? values.pricingDecisionReason
            : null,
      });
    },
    onSuccess: async () => {
      await onSaved();
      close();
    },
    onError: async (error) => {
      if (!isOrderConcurrencyError(error)) return;
      await onSaved();
      setRecordRefreshed(true);
    },
  });

  useEffect(() => {
    if (!open || form.formState.isDirty) return;
    form.reset(createDefaultValues(workflow, defaultQuantity, requiredLabItem, proposedUnitPrice));
  }, [
    defaultQuantity,
    form,
    form.formState.isDirty,
    open,
    proposedUnitPrice,
    requiredLabItem,
    workflow,
  ]);

  function selectCatalogItem(index: number, id: string) {
    form.clearErrors("root");
    form.setValue(`lines.${index}.catalogItemId`, id, {
      shouldDirty: true,
      shouldValidate: true,
    });
    const item = catalogItems.find((candidate) => candidate.id === id);
    if (!item) return;
    form.setValue(`lines.${index}.description`, item.name, {
      shouldDirty: true,
    });
    form.setValue(`lines.${index}.unitPrice`, item.basePrice, {
      shouldDirty: true,
    });
    form.setValue("currency", item.currency, { shouldDirty: true });
  }

  function close() {
    mutation.reset();
    setRecordRefreshed(false);
    form.reset(createDefaultValues(workflow, defaultQuantity, requiredLabItem, proposedUnitPrice));
    onOpenChange(false);
  }

  function submit(values: Values) {
    setRecordRefreshed(false);
    form.clearErrors("root");
    if (workflow === "lab") {
      if (!requiredLabItem) {
        form.setError("root", {
          type: "manual",
          message:
            "Configure one active PSeq Lab Service catalog item with code pseq-lab-service and sales unit specimen before issuing this quote.",
        });
        return;
      }

      const requiredLines = values.lines.filter(
        (line) => line.catalogItemId === requiredLabItem.id,
      );
      if (requiredLines.length !== 1) {
        form.setError("root", {
          type: "manual",
          message:
            "Include the PSeq Lab Service catalog item exactly once in the quote.",
        });
        return;
      }

      if (requiredLines[0].quantity !== (defaultQuantity ?? 1)) {
        form.setError("root", {
          type: "manual",
          message: `The PSeq Lab Service quantity must equal the committed sample count of ${defaultQuantity ?? 1}.`,
        });
        return;
      }
      if (
        proposedUnitPrice !== undefined &&
        roundMoney(requiredLines[0].unitPrice) !== roundMoney(proposedUnitPrice) &&
        !values.pricingDecisionReason.trim()
      ) {
        form.setError("pricingDecisionReason", {
          type: "manual",
          message: "Explain why the proposed price was amended.",
        });
        return;
      }
    }

    mutation.mutate(values);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())}
    >
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {workflow === "lab" && proposedUnitPrice !== undefined
              ? "Review proposed laboratory price"
              : `Issue ${workflow === "lab" ? "laboratory" : "data-assembly"} quote`}
          </DialogTitle>
          <DialogDescription>
            {workflow === "lab" && proposedUnitPrice !== undefined
              ? "Approve the proposed price unchanged or amend it. Either decision issues the final quote to the Customer immediately."
              : "Use active Phaeno commercial catalog items, then set the job-specific quantities and prices. Issuing the quote makes it available to the Customer immediately."}
          </DialogDescription>
        </DialogHeader>
        {workflow === "lab" && !requiredLabItem ? (
          <Alert variant="destructive">
            <AlertTitle>PSeq Lab Service item is not ready</AlertTitle>
            <AlertDescription>
              Commercial configuration must contain one active item with code{" "}
              <span className="font-mono">pseq-lab-service</span> and sales unit{" "}
              <span className="font-mono">specimen</span>. Quote issuance is
              paused until that configuration is corrected.
            </AlertDescription>
          </Alert>
        ) : null}
        <form
          id="platform-quote-form"
          noValidate
          onSubmit={form.handleSubmit(submit)}
          className="max-h-[65vh] space-y-5 overflow-y-auto px-1"
        >
          {workflow === "lab" && proposedUnitPrice !== undefined ? (
            <section className="rounded-lg border bg-muted/30 p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Proposed price</p>
                  <p className="mt-1 text-lg font-semibold">{formatMoney(proposedUnitPrice, priceProposal?.currency ?? "USD")}</p>
                  <p className="text-xs text-muted-foreground">per specimen</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Catalog price</p>
                  <p className="mt-1 text-lg font-semibold">{formatMoney(requiredLabItem?.basePrice ?? 0, priceProposal?.currency ?? "USD")}</p>
                  <p className="text-xs text-muted-foreground">per specimen</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Difference</p>
                  <p className="mt-1 text-lg font-semibold">{formatSignedMoney(proposedUnitPrice - (requiredLabItem?.basePrice ?? 0), priceProposal?.currency ?? "USD")}</p>
                  <p className="text-xs text-muted-foreground">from catalog</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quantity</p>
                  <p className="mt-1 text-lg font-semibold">{defaultQuantity ?? 1}</p>
                  <p className="text-xs text-muted-foreground">committed specimens</p>
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Proposed subtotal</p>
                  <p className="mt-1 text-lg font-semibold">{formatMoney(proposedUnitPrice * (defaultQuantity ?? 1), priceProposal?.currency ?? "USD")}</p>
                  <p className="text-xs text-muted-foreground">before tax</p>
                </div>
              </div>
              {priceProposal?.note ? <p className="mt-3 border-t pt-3 text-sm"><span className="font-medium">Pricing note:</span> {priceProposal.note}</p> : null}
            </section>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <Label htmlFor="quotePurpose">Purpose *</Label>
              <select
                id="quotePurpose"
                {...form.register("purpose")}
                className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="Initial">Initial</option>
                <option value="Change">Scope change</option>
              </select>
            </div>
            <div>
              <Label htmlFor="quoteCurrency">Currency *</Label>
              <Input
                id="quoteCurrency"
                maxLength={3}
                className="mt-2 h-9 uppercase"
                {...form.register("currency")}
              />
            </div>
            {workflow === "lab" ? (
              <div>
                <p
                  id="quoteTaxLabel"
                  className="flex items-center gap-2 text-sm leading-none font-medium"
                >
                  Tax
                </p>
                <output
                  id="quoteTaxStatus"
                  aria-labelledby="quoteTaxLabel"
                  aria-describedby="quoteTaxDescription"
                  className="mt-2 flex h-9 w-full items-center rounded-lg border border-input bg-muted/30 px-2.5 text-base md:text-sm"
                >
                  Calculated automatically
                </output>
                <p
                  id="quoteTaxDescription"
                  className="mt-1 text-xs text-muted-foreground"
                >
                  Included when approved tax information is available; otherwise calculated at invoicing.
                </p>
              </div>
            ) : (
              <div>
                <Label htmlFor="quoteTax">Tax</Label>
                <Input
                  id="quoteTax"
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-2"
                  {...form.register("tax")}
                />
              </div>
            )}
            <div>
              <Label htmlFor="quoteExpiresAt">Expiration override</Label>
              <Input
                id="quoteExpiresAt"
                type="date"
                className="mt-2 h-9"
                {...form.register("expiresAt")}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Leave blank to use the configured default validity.
              </p>
            </div>
          </div>
          <fieldset>
            <legend className="text-sm font-medium">
              <RequiredFieldName>Itemized quote</RequiredFieldName>
            </legend>
            <div
              aria-hidden="true"
              className="mt-3 hidden gap-3 px-0 text-sm font-medium lg:grid lg:grid-cols-[minmax(12rem,0.85fr)_minmax(14rem,1.35fr)_5rem_6rem_2rem]"
            >
              <RequiredFieldName>Commercial catalog item</RequiredFieldName>
              <RequiredFieldName>Description</RequiredFieldName>
              <RequiredFieldName>Quantity</RequiredFieldName>
              <RequiredFieldName>Unit price</RequiredFieldName>
              <span className="sr-only">Actions</span>
            </div>
            <div className="mt-3 space-y-3 lg:mt-1 lg:space-y-0 lg:divide-y">
              {lines.fields.map((field, index) => {
                const selectedItemId = String(
                  watchedLines[index]?.catalogItemId ?? "",
                );
                const selectedItem = catalogItems.find(
                  (item) => item.id === selectedItemId,
                );
                const isRequiredLabLine =
                  workflow === "lab" && selectedItemId === requiredLabItem?.id;
                const isLockedRequiredLabLine =
                  isRequiredLabLine && requiredLabLineCount === 1;

                return (
                  <div
                    key={field.id}
                    className="grid min-w-0 gap-3 rounded-lg border p-4 md:grid-cols-[minmax(12rem,0.85fr)_minmax(14rem,1.35fr)_5rem_6rem_2rem] lg:rounded-none lg:border-0 lg:p-0 lg:py-1"
                  >
                    <div className="min-w-0 md:col-start-1 md:row-start-1">
                      <Label
                        htmlFor={`quoteItem-${index}`}
                        className="lg:sr-only"
                      >
                        <RequiredFieldName>
                          Commercial catalog item
                        </RequiredFieldName>
                      </Label>
                      <select
                        id={`quoteItem-${index}`}
                        value={selectedItemId}
                        disabled={isLockedRequiredLabLine}
                        onChange={(event) =>
                          selectCatalogItem(index, event.target.value)
                        }
                        aria-describedby={
                          selectedItem
                            ? `quoteItem-${index}-description`
                            : undefined
                        }
                        className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm lg:mt-0"
                      >
                        <option value="">Select item</option>
                        {catalogItems
                          .filter((item) => item.isActive)
                          .map((item) => (
                            <option
                              key={item.id}
                              value={item.id}
                              disabled={
                                item.id === requiredLabItem?.id &&
                                requiredLabLineCount > 0 &&
                                !isRequiredLabLine
                              }
                            >
                              {item.name}
                              {item.isPSeqLabService
                                ? " · required service"
                                : ""}
                            </option>
                          ))}
                      </select>
                    </div>
                    {selectedItem ? (
                      <p
                        id={`quoteItem-${index}-description`}
                        className="-mt-2 text-xs text-muted-foreground md:col-span-5 md:col-start-1 md:row-start-2"
                      >
                        {isRequiredLabLine
                          ? "Priced per specimen · quantity set from the committed specimen count"
                          : "Priced per unit · set the quantity for this quote"}
                      </p>
                    ) : null}
                    <div className="min-w-0 md:col-start-2 md:row-start-1">
                      <Label
                        htmlFor={`quoteDescription-${index}`}
                        className="lg:sr-only"
                      >
                        <RequiredFieldName>Description</RequiredFieldName>
                      </Label>
                      <Input
                        id={`quoteDescription-${index}`}
                        className="mt-2 lg:mt-0"
                        {...form.register(`lines.${index}.description`)}
                      />
                    </div>
                    <div className="min-w-0 md:col-start-3 md:row-start-1">
                      <Label
                        htmlFor={`quoteQuantity-${index}`}
                        className="lg:sr-only"
                      >
                        <RequiredFieldName>Quantity</RequiredFieldName>
                      </Label>
                      <Input
                        id={`quoteQuantity-${index}`}
                        type="number"
                        step="any"
                        readOnly={isLockedRequiredLabLine}
                        aria-readonly={isLockedRequiredLabLine}
                        className="mt-2 read-only:bg-muted/30 read-only:text-muted-foreground lg:mt-0"
                        {...form.register(`lines.${index}.quantity`)}
                      />
                    </div>
                    <div className="min-w-0 md:col-start-4 md:row-start-1">
                      <Label
                        htmlFor={`quotePrice-${index}`}
                        className="lg:sr-only"
                      >
                        <RequiredFieldName>Unit price</RequiredFieldName>
                      </Label>
                      <Input
                        id={`quotePrice-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        className="mt-2 lg:mt-0"
                        {...form.register(`lines.${index}.unitPrice`)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-7 md:col-start-5 md:row-start-1 lg:mt-0 lg:self-center"
                      aria-label={`Remove quote line ${index + 1}`}
                      disabled={
                        lines.fields.length === 1 || isLockedRequiredLabLine
                      }
                      onClick={() => lines.remove(index)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-end sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  lines.append({
                    catalogItemId: "",
                    description: "",
                    quantity: 1,
                    unitPrice: 0,
                  })
                }
              >
                <Plus data-icon="inline-start" />
                Add quote line
              </Button>
              <div className="sm:text-right">
                <p
                  id="currentQuoteTotalLabel"
                  className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  {workflow === "lab" ? "Current pre-tax total" : "Current quote total"}
                </p>
                <output
                  aria-labelledby="currentQuoteTotalLabel"
                  aria-live="polite"
                  className="mt-1 block text-xl font-semibold tabular-nums"
                >
                  {formatMoney(currentQuoteTotal, currentCurrency)}
                </output>
                {workflow === "lab" ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    The issued quote includes tax when POMS can calculate it.
                  </p>
                ) : null}
              </div>
            </div>
          </fieldset>
          {workflow === "lab" && amendsProposedPrice ? (
            <div>
              <Label htmlFor="pricingDecisionReason">
                <RequiredFieldName>Amendment reason</RequiredFieldName>
              </Label>
              <FieldDescription id="pricingDecisionReason-help">
                Required because the final unit price differs from the proposal. This internal audit note is not shown to the Customer.
              </FieldDescription>
              <Textarea
                id="pricingDecisionReason"
                className="mt-2 min-h-20"
                aria-invalid={Boolean(form.formState.errors.pricingDecisionReason)}
                aria-describedby={`pricingDecisionReason-help${form.formState.errors.pricingDecisionReason ? " pricingDecisionReason-error" : ""}`}
                {...form.register("pricingDecisionReason")}
              />
              <FieldError id="pricingDecisionReason-error">
                {form.formState.errors.pricingDecisionReason?.message}
              </FieldError>
            </div>
          ) : null}
          {form.formState.errors.root?.message ? (
            <Alert variant="destructive" role="alert">
              <AlertTitle>Quote needs attention</AlertTitle>
              <AlertDescription>
                {form.formState.errors.root.message}
              </AlertDescription>
            </Alert>
          ) : null}
          {mutation.error ? (
            <Alert variant="destructive">
              <AlertTitle>Quote was not issued</AlertTitle>
              <AlertDescription>
                {recordRefreshed && isOrderConcurrencyError(mutation.error)
                  ? `The latest ${workflow === "lab" ? "Job" : "request"} was loaded and your quote entries were preserved. Review them, then issue the quote again.`
                  : getOrderErrorMessage(
                      mutation.error,
                      "Review the quote and try again.",
                    )}
              </AlertDescription>
            </Alert>
          ) : null}
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="submit"
            form="platform-quote-form"
            disabled={
              mutation.isPending || (workflow === "lab" && !requiredLabItem)
            }
          >
            {mutation.isPending
              ? "Issuing…"
              : workflow === "lab" && proposedUnitPrice !== undefined
                ? amendsProposedPrice
                  ? "Amend price and issue quote"
                  : "Approve price and issue quote"
                : "Issue quote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function createDefaultValues(
  workflow: "lab" | "assembly",
  defaultQuantity: number | undefined,
  requiredLabItem: CatalogItem | undefined,
  proposedUnitPrice: number | undefined,
): FormValues {
  const item = workflow === "lab" ? requiredLabItem : undefined;
  return {
    purpose: "Initial",
    currency: item?.currency ?? "USD",
    tax: 0,
    expiresAt: "",
    lines: [
      {
        catalogItemId: item?.id ?? "",
        description: item?.name ?? "",
        quantity: defaultQuantity ?? 1,
        unitPrice: proposedUnitPrice ?? item?.basePrice ?? 0,
      },
    ],
    pricingDecisionReason: "",
  };
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

function formatSignedMoney(value: number, currency: string) {
  const amount = formatMoney(Math.abs(value), currency);
  if (value === 0) return amount;
  return `${value > 0 ? "+" : "−"}${amount}`;
}
