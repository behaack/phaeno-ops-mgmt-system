import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { useState } from "react";

import {
  apiErrorMessage,
  createCrmCompany,
  listCrmCompanies,
  type CrmCompanyInput,
} from "#/api/crm";
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
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
  CrmCompanyFormDialog,
  type CrmCompanyFormValues,
} from "./CrmCompanyFormDialog";
import { CrmSavedViewBar } from "./CrmSavedViewBar";

const pageSize = 25;

export function CrmCompaniesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draftSearch, setDraftSearch] = useState("");
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const companiesQuery = useQuery({
    queryKey: ["crm-companies", search, includeInactive, page],
    queryFn: () =>
      listCrmCompanies({ search, includeInactive, page, pageSize }),
  });
  const createMutation = useMutation({
    mutationFn: (values: CrmCompanyFormValues) =>
      createCrmCompany(toInput(values)),
    onSuccess: async (company) => {
      setCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["crm-companies"] });
      await navigate({
        to: "/crm/companies/$companyId",
        params: { companyId: company.id },
      });
    },
  });

  const result = companiesQuery.data;
  const totalPages = Math.max(
    1,
    Math.ceil((result?.totalCount ?? 0) / pageSize),
  );

  return (
    <main className="page-wrap space-y-6 px-4 py-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <Badge variant="secondary" className="mb-3">
            Phaeno CRM
          </Badge>
          <h1 className="text-3xl font-semibold leading-tight">Companies</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            Maintain the complete customer relationship, including optional
            Portal access, services, and operational readiness.
          </p>
        </div>
        <Button className="cursor-pointer" onClick={() => setCreateOpen(true)}>
          <Plus data-icon="inline-start" />
          New company
        </Button>
      </section>

      <Alert>
        <AlertTitle>Companies are the customer record</AlertTitle>
        <AlertDescription>
          Portal access, users, services, and readiness are enabled and managed
          from each Company. Creating a Company alone does not grant access or
          start work.
        </AlertDescription>
      </Alert>

      {companiesQuery.error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load CRM companies</AlertTitle>
          <AlertDescription>
            {apiErrorMessage(companiesQuery.error)}
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Company directory</CardTitle>
          <CardDescription>
            Search by company, domain, or industry. Open the company name to
            view its complete CRM record.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearch(draftSearch.trim());
            }}
          >
            <div className="grid min-w-0 flex-1 gap-1.5">
              <Label htmlFor="crm-company-search">Search companies</Label>
              <Input
                id="crm-company-search"
                value={draftSearch}
                placeholder="Company, domain, or industry"
                onChange={(event) => setDraftSearch(event.target.value)}
              />
            </div>
            <Button type="submit" variant="outline" className="cursor-pointer">
              <Search data-icon="inline-start" />
              Search
            </Button>
            <div className="flex min-h-9 items-center gap-2 sm:pb-0.5">
              <Checkbox
                id="crm-show-inactive"
                className="cursor-pointer"
                checked={includeInactive}
                onCheckedChange={(checked) => {
                  setPage(1);
                  setIncludeInactive(checked === true);
                }}
              />
              <Label htmlFor="crm-show-inactive" className="cursor-pointer">
                Include inactive
              </Label>
            </div>
          </form>

          <CrmSavedViewBar
            recordType="Company"
            currentFilter={{ search, includeInactive }}
            onApply={(filter) => {
              const nextSearch =
                typeof filter.search === "string" ? filter.search : "";
              setDraftSearch(nextSearch);
              setSearch(nextSearch);
              setIncludeInactive(filter.includeInactive === true);
              setPage(1);
            }}
          />

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Company
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Domain
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Industry
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Owner
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(result?.items ?? []).map((company) => (
                  <tr key={company.id}>
                    <td className="px-4 py-3 font-medium">
                      <Link
                        to="/crm/companies/$companyId"
                        params={{ companyId: company.id }}
                        className="cursor-pointer underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        {company.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {company.domainName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {company.industry ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {company.ownerName}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={company.isActive ? "secondary" : "outline"}
                      >
                        {company.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge
                        className="ml-2"
                        variant={
                          company.portalAccessStatus === "Enabled"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {company.portalAccessStatus === "Enabled"
                          ? "Portal enabled"
                          : company.portalAccessStatus === "Suspended"
                            ? "Portal suspended"
                            : "Portal not enabled"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(company.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!companiesQuery.isLoading && !(result?.items.length ?? 0) ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                {search || includeInactive
                  ? "No companies match these filters."
                  : "No CRM companies have been created yet."}
              </p>
            ) : null}
            {companiesQuery.isLoading ? (
              <p
                className="p-8 text-center text-sm text-muted-foreground"
                role="status"
              >
                Loading companies…
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              {result?.totalCount ?? 0}{" "}
              {(result?.totalCount ?? 0) === 1 ? "company" : "companies"}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label="Previous company page"
                disabled={page <= 1 || companiesQuery.isFetching}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <ChevronLeft />
                Previous
              </Button>
              <span aria-live="polite">
                Page {page} of {totalPages}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label="Next company page"
                disabled={page >= totalPages || companiesQuery.isFetching}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
                <ChevronRight />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <CrmCompanyFormDialog
        open={createOpen}
        company={null}
        isPending={createMutation.isPending}
        error={
          createMutation.error
            ? apiErrorMessage(createMutation.error)
            : undefined
        }
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) createMutation.reset();
        }}
        onSubmit={(values) => createMutation.mutate(values)}
      />
    </main>
  );
}

export function toInput(values: CrmCompanyFormValues): CrmCompanyInput {
  const explicitDomain = valueOrNull(values.domainName)?.toLowerCase() ?? null;

  return {
    name: values.name.trim(),
    websiteUrl: valueOrNull(values.websiteUrl),
    domainName: explicitDomain ?? domainFromWebsite(values.websiteUrl),
    phone: valueOrNull(values.phone),
    industry: valueOrNull(values.industry),
    description: valueOrNull(values.description),
    addressLine1: valueOrNull(values.addressLine1),
    addressLine2: valueOrNull(values.addressLine2),
    city: valueOrNull(values.city),
    region: valueOrNull(values.region),
    postalCode: valueOrNull(values.postalCode),
    countryCode: valueOrNull(values.countryCode)?.toUpperCase() ?? null,
    employeeCount: values.employeeCount ? Number(values.employeeCount) : null,
    lifecycleState: values.lifecycleState,
    source: valueOrNull(values.source),
    tags: values.tags
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  };
}

export function domainFromWebsite(websiteUrl: string) {
  const value = valueOrNull(websiteUrl);
  if (!value) return null;

  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function valueOrNull(value: string) {
  const normalized = value.trim();
  return normalized || null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}
