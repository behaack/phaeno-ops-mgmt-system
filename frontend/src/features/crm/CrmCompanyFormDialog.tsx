import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { CrmCompany } from "#/api/crm";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
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

const companySchema = z.object({
  name: z.string().trim().min(1, "Enter a company name.").max(255),
  websiteUrl: z
    .string()
    .trim()
    .max(2048)
    .refine(isEmptyOrHttpUrl, "Enter a complete http:// or https:// address."),
  domainName: z
    .string()
    .trim()
    .max(253)
    .refine(isEmptyOrDomain, "Enter a domain such as example.com."),
  phone: z.string().trim().max(50),
  industry: z.string().trim().max(150),
  description: z.string().trim().max(2000),
  addressLine1: z.string().trim().max(255),
  addressLine2: z.string().trim().max(255),
  city: z.string().trim().max(150),
  region: z.string().trim().max(150),
  postalCode: z.string().trim().max(30),
  countryCode: z.string().trim().max(2),
  employeeCount: z
    .string()
    .trim()
    .refine(
      (value) => !value || (/^\d+$/.test(value) && Number(value) >= 0),
      "Enter a whole number.",
    ),
  lifecycleState: z.enum([
    "Target",
    "Engaged",
    "ActiveCustomer",
    "Partner",
    "FormerRelationship",
    "Other",
  ]),
  source: z.string().trim().max(150),
  tags: z.string().trim(),
});

export type CrmCompanyFormValues = z.infer<typeof companySchema>;

export function CrmCompanyFormDialog({
  company,
  error,
  isPending,
  onOpenChange,
  onSubmit,
  open,
}: {
  company: CrmCompany | null;
  error?: string;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CrmCompanyFormValues) => void;
  open: boolean;
}) {
  const form = useForm<CrmCompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: valuesFor(company),
    mode: "onBlur",
  });

  useEffect(() => {
    if (open) form.reset(valuesFor(company));
  }, [company, form, open]);

  const editing = Boolean(company);
  const formId = editing ? "edit-crm-company" : "create-crm-company";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit company" : "New company"}</DialogTitle>
          <DialogDescription>
            This creates the customer Company. Portal access remains disabled
            until a reviewed request is approved.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <form
          id={formId}
          className="grid gap-4"
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <Field
            id={`${formId}-name`}
            label="Company name"
            required
            error={form.formState.errors.name?.message}
          >
            <Input
              id={`${formId}-name`}
              autoComplete="organization"
              aria-invalid={Boolean(form.formState.errors.name)}
              {...form.register("name")}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id={`${formId}-website`}
              label="Website"
              error={form.formState.errors.websiteUrl?.message}
            >
              <Input
                id={`${formId}-website`}
                type="url"
                inputMode="url"
                placeholder="https://example.com"
                aria-invalid={Boolean(form.formState.errors.websiteUrl)}
                {...form.register("websiteUrl")}
              />
            </Field>
            <Field
              id={`${formId}-domain`}
              label="Domain"
              error={form.formState.errors.domainName?.message}
            >
              <Input
                id={`${formId}-domain`}
                inputMode="url"
                placeholder="example.com"
                aria-invalid={Boolean(form.formState.errors.domainName)}
                {...form.register("domainName")}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id={`${formId}-lifecycle`} label="Lifecycle">
              <select
                id={`${formId}-lifecycle`}
                className="h-9 rounded-md border bg-background px-3 text-sm"
                {...form.register("lifecycleState")}
              >
                <option value="Target">Target</option>
                <option value="Engaged">Engaged</option>
                <option value="ActiveCustomer">Active customer</option>
                <option value="Partner">Partner</option>
                <option value="FormerRelationship">Former relationship</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field id={`${formId}-source`} label="Source">
              <Input id={`${formId}-source`} {...form.register("source")} />
            </Field>
            <Field
              id={`${formId}-employees`}
              label="Employees"
              error={form.formState.errors.employeeCount?.message}
            >
              <Input
                id={`${formId}-employees`}
                type="number"
                min="0"
                aria-invalid={Boolean(form.formState.errors.employeeCount)}
                {...form.register("employeeCount")}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${formId}-address-1`} label="Address line 1">
              <Input
                id={`${formId}-address-1`}
                autoComplete="address-line1"
                {...form.register("addressLine1")}
              />
            </Field>
            <Field id={`${formId}-address-2`} label="Address line 2">
              <Input
                id={`${formId}-address-2`}
                autoComplete="address-line2"
                {...form.register("addressLine2")}
              />
            </Field>
            <Field id={`${formId}-city`} label="City">
              <Input
                id={`${formId}-city`}
                autoComplete="address-level2"
                {...form.register("city")}
              />
            </Field>
            <Field id={`${formId}-region`} label="State or region">
              <Input
                id={`${formId}-region`}
                autoComplete="address-level1"
                {...form.register("region")}
              />
            </Field>
            <Field id={`${formId}-postal`} label="Postal code">
              <Input
                id={`${formId}-postal`}
                autoComplete="postal-code"
                {...form.register("postalCode")}
              />
            </Field>
            <Field id={`${formId}-country`} label="Country code">
              <Input
                id={`${formId}-country`}
                autoComplete="country"
                maxLength={2}
                placeholder="US"
                {...form.register("countryCode")}
              />
            </Field>
          </div>
          <Field id={`${formId}-tags`} label="Tags">
            <Input
              id={`${formId}-tags`}
              placeholder="Comma-separated"
              {...form.register("tags")}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id={`${formId}-phone`}
              label="Phone"
              error={form.formState.errors.phone?.message}
            >
              <Input
                id={`${formId}-phone`}
                type="tel"
                autoComplete="tel"
                aria-invalid={Boolean(form.formState.errors.phone)}
                {...form.register("phone")}
              />
            </Field>
            <Field
              id={`${formId}-industry`}
              label="Industry"
              error={form.formState.errors.industry?.message}
            >
              <Input
                id={`${formId}-industry`}
                aria-invalid={Boolean(form.formState.errors.industry)}
                {...form.register("industry")}
              />
            </Field>
          </div>
          <Field
            id={`${formId}-description`}
            label="Relationship summary"
            error={form.formState.errors.description?.message}
          >
            <textarea
              id={`${formId}-description`}
              rows={4}
              className={textareaClass}
              aria-invalid={Boolean(form.formState.errors.description)}
              {...form.register("description")}
            />
          </Field>
        </form>
        <RequiredDialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={isPending}>
            {isPending
              ? "Saving…"
              : editing
                ? "Save changes"
                : "Create company"}
          </Button>
        </RequiredDialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  children,
  error,
  id,
  label,
  required,
}: {
  children: ReactNode;
  error?: string;
  id: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>
        {required ? <RequiredFieldName>{label}</RequiredFieldName> : label}
      </Label>
      {children}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function valuesFor(company: CrmCompany | null): CrmCompanyFormValues {
  return {
    name: company?.name ?? "",
    websiteUrl: company?.websiteUrl ?? "",
    domainName: company?.domainName ?? "",
    phone: company?.phone ?? "",
    industry: company?.industry ?? "",
    description: company?.description ?? "",
    addressLine1: company?.addressLine1 ?? "",
    addressLine2: company?.addressLine2 ?? "",
    city: company?.city ?? "",
    region: company?.region ?? "",
    postalCode: company?.postalCode ?? "",
    countryCode: company?.countryCode ?? "",
    employeeCount: company?.employeeCount?.toString() ?? "",
    lifecycleState: company?.lifecycleState ?? "Target",
    source: company?.source ?? "",
    tags: company?.tags.join(", ") ?? "",
  };
}

function isEmptyOrHttpUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isEmptyOrDomain(value: string) {
  return (
    !value ||
    (value.includes(".") &&
      !value.includes("/") &&
      !value.includes(":") &&
      !/\s/.test(value))
  );
}

const textareaClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
