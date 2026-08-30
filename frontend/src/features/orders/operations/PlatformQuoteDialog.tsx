import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import {
  getOrderErrorMessage,
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
import {
  RequiredDialogFooter as DialogFooter,
  RequiredFieldName,
} from "#/components/ui/required-field";

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
        unitPrice: z.coerce.number().nonnegative(),
      }),
    )
    .min(1)
    .max(100),
});
type FormValues = z.input<typeof schema>;
type Values = z.output<typeof schema>;
type CatalogItem = OrderConfiguration["catalogItems"][number];

export function PlatformQuoteDialog({
  open,
  workflow,
  recordId,
  version,
  defaultQuantity,
  catalogItems,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  workflow: "lab" | "assembly";
  recordId: string;
  version: number;
  defaultQuantity?: number;
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
  const defaultValues = createDefaultValues(
    workflow,
    defaultQuantity,
    requiredLabItem,
  );
  const form = useForm<FormValues, unknown, Values>({
    resolver: zodResolver(schema),
    defaultValues,
  });
  const lines = useFieldArray({ control: form.control, name: "lines" });
  const watchedLines = form.watch("lines");
  const requiredLabLineCount = requiredLabItem
    ? watchedLines.filter(
        (line) => line.catalogItemId === requiredLabItem.id,
      ).length
    : 0;
  const mutation = useMutation({
    mutationFn: (values: Values) =>
      issuePlatformQuote(workflow, recordId, {
        ...values,
        version,
        expiresAt: values.expiresAt || null,
      }),
    onSuccess: async () => {
      await onSaved();
      close();
    },
  });

  useEffect(() => {
    if (!open || form.formState.isDirty) return;
    form.reset(createDefaultValues(workflow, defaultQuantity, requiredLabItem));
  }, [
    defaultQuantity,
    form,
    form.formState.isDirty,
    open,
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
    form.reset(createDefaultValues(workflow, defaultQuantity, requiredLabItem));
    onOpenChange(false);
  }

  function submit(values: Values) {
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
    }

    mutation.mutate(values);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())}
    >
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Issue {workflow === "lab" ? "laboratory" : "data-assembly"} quote
          </DialogTitle>
          <DialogDescription>
            Use active Phaeno commercial catalog items, then set the
            job-specific quantities and prices. Issuing the quote makes it
            available to the Customer immediately.
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
          <div className="grid gap-4 sm:grid-cols-3">
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
                className="mt-2 uppercase"
                {...form.register("currency")}
              />
            </div>
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
          </div>
          <div>
            <Label htmlFor="quoteExpiresAt">Expiration override</Label>
            <Input
              id="quoteExpiresAt"
              type="date"
              className="mt-2 max-w-56"
              {...form.register("expiresAt")}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Leave blank to use the configured default validity.
            </p>
          </div>
          <fieldset>
            <legend className="text-sm font-medium">
              <RequiredFieldName>Itemized quote</RequiredFieldName>
            </legend>
            <div className="mt-3 space-y-3">
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
                    className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1.2fr)_7rem_8rem_auto]"
                  >
                    <div>
                      <Label htmlFor={`quoteItem-${index}`}>
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
                        className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
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
                              {item.name} — {item.externalItemId} ·{" "}
                              {item.salesUnit}
                            </option>
                          ))}
                      </select>
                      {selectedItem ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          <span className="font-mono">
                            {selectedItem.externalItemId}
                          </span>{" "}
                          · priced per {selectedItem.salesUnit}
                          {isRequiredLabLine
                            ? " · required for the committed sample count"
                            : ""}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <Label htmlFor={`quoteDescription-${index}`}>
                        <RequiredFieldName>Description</RequiredFieldName>
                      </Label>
                      <Input
                        id={`quoteDescription-${index}`}
                        className="mt-2"
                        {...form.register(`lines.${index}.description`)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`quoteQuantity-${index}`}>
                        <RequiredFieldName>Quantity</RequiredFieldName>
                      </Label>
                      <Input
                        id={`quoteQuantity-${index}`}
                        type="number"
                        step="any"
                        className="mt-2"
                        {...form.register(`lines.${index}.quantity`)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`quotePrice-${index}`}>
                        <RequiredFieldName>Unit price</RequiredFieldName>
                      </Label>
                      <Input
                        id={`quotePrice-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        className="mt-2"
                        {...form.register(`lines.${index}.unitPrice`)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-7"
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
            <Button
              type="button"
              variant="outline"
              className="mt-3"
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
          </fieldset>
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
                {getOrderErrorMessage(
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
            {mutation.isPending ? "Issuing…" : "Issue quote"}
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
        unitPrice: item?.basePrice ?? 0,
      },
    ],
  };
}
