import { useCrmPermissions } from './use-crm-permissions';
import { CrmProvisioningReturn } from "./CrmListNavigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Combine,
  ExternalLink,
  Pencil,
  Power,
  PowerOff,
  UserRoundCog,
} from "lucide-react";
import { useState } from "react";

import {
  apiErrorMessage,
  assignCrmCompanyOwner,
  getCrmCompany,
  mergeCrmCompany,
  setCrmCompanyActive,
  updateCrmCompany,
  type CrmCompany,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Label } from "#/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "#/components/ui/tabs";
import {
  CrmCompanyFormDialog,
  type CrmCompanyFormValues,
} from "./CrmCompanyFormDialog";
import { CrmCompanyLifecycleDialog } from "./CrmCompanyLifecycleDialog";
import { CrmCompanyRelationships } from "./CrmCompanyRelationships";
import { CrmCompanyPeople } from "./CrmCompanyPeople";
import { CrmCompanySales } from "./CrmCompanySales";
import { CrmCustomFields } from "./CrmCustomFields";
import { CrmRecordWork } from "./CrmRecordWork";
import { CrmMergeDialog, type CrmMergeSource } from "./CrmMergeDialog";
import { CrmOwnerSelect } from "./CrmOwnerSelect";
import { toInput } from "./CrmCompaniesPage";
import { OrganizationDetailPage } from "#/features/organizations/OrganizationDetailPage";
import { useCrmState } from './CrmListNavigation';
import { OrganizationDepartmentsPanel } from "#/features/organizations/OrganizationDepartmentsPanel";

export function CrmCompanyDetailPage({ companyId }: { companyId: string }) {
  const { canAdminister } = useCrmPermissions();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [editTarget, setEditTarget] = useState<CrmCompany | null>(null);
  const [lifecycleTarget, setLifecycleTarget] = useState<CrmCompany | null>(null);
  const [mergeSource, setMergeSource] = useState<CrmMergeSource | null>(null);
  const [ownerTarget, setOwnerTarget] = useState<CrmCompany | null>(null);
  const editOpen = Boolean(editTarget);
  const lifecycleOpen = Boolean(lifecycleTarget);
  const ownerOpen = Boolean(ownerTarget);
  const [storedSection, setActiveSection] = useCrmState<
    "overview" | "people" | "sales" | "departments" | "requests" | "activity"
  >("section", "overview");
  const allowedSections = canAdminister ? ["overview", "people", "sales", "departments", "requests", "activity"] : ["overview", "people", "sales", "activity"];
  const activeSection = allowedSections.includes(storedSection) ? storedSection : "overview";
  const companyQuery = useQuery({
    queryKey: ["crm-company", companyId],
    queryFn: () => getCrmCompany(companyId),
  });

  const refreshDirectory = () =>
    queryClient.invalidateQueries({ queryKey: ["crm-companies"] });
  const editMutation = useMutation({
    mutationFn: ({ target, values }: { target: CrmCompany; values: CrmCompanyFormValues }) => {
      return updateCrmCompany(target.id, {
        ...toInput(values),
        version: target.version,
      });
    },
    onSuccess: async (company) => {
      queryClient.setQueryData(["crm-company", company.id], company);
      setEditTarget(null);
      await refreshDirectory();
    },
  });
  const lifecycleMutation = useMutation({
    mutationFn: (target: CrmCompany) => {
      return setCrmCompanyActive(
        target.id,
        !target.isActive,
        target.version,
      );
    },
    onSuccess: async (company) => {
      queryClient.setQueryData(["crm-company", company.id], company);
      setLifecycleTarget(null);
      await refreshDirectory();
    },
  });
  const mergeMutation = useMutation({
    mutationFn: ({ source, targetId, reason }: { source: CrmMergeSource; targetId: string; reason: string }) =>
      mergeCrmCompany(
        source.id,
        targetId,
        reason,
        source.version,
      ),
    onSuccess: async (target) => {
      setMergeSource(null);
      await refreshDirectory();
      await navigate({
        to: "/crm/companies/$companyId",
        params: { companyId: target.id },
      });
    },
  });
  const ownerMutation = useMutation({
    mutationFn: ({ target, ownerUserId }: { target: CrmCompany; ownerUserId: string }) =>
      assignCrmCompanyOwner(
        target.id,
        ownerUserId,
        target.version,
      ),
    onSuccess: async (company) => {
      queryClient.setQueryData(["crm-company", company.id], company);
      setOwnerTarget(null);
      await refreshDirectory();
    },
  });

  if (companyQuery.isLoading) {
    return (
      <main className="page-wrap px-4 py-8">
        <p className="text-sm text-muted-foreground" role="status">
          Loading company…
        </p>
      </main>
    );
  }

  const company = companyQuery.data;
  if (!company) {
    return (
      <main className="page-wrap px-4 py-8">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>CRM company not found</CardTitle>
            <CardDescription>
              The selected company could not be loaded.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {companyQuery.error ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {apiErrorMessage(companyQuery.error)}
                </AlertDescription>
              </Alert>
            ) : null}
            <Button asChild variant="outline">
              <Link to="/crm/companies" search={previous => previous}>
                <ArrowLeft data-icon="inline-start" />
                Back to companies
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="page-wrap space-y-6 px-4 py-8">
      <CrmProvisioningReturn />
      <Button asChild variant="ghost" size="sm">
        <Link to="/crm/companies" search={previous => previous}>
          <ArrowLeft data-icon="inline-start" />
          Back to companies
        </Link>
      </Button>

      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge variant="secondary">Company</Badge>
            <Badge variant={company.isActive ? "outline" : "destructive"}>
              {company.isActive ? "Active" : "Inactive"}
            </Badge>
            <Badge variant={company.portalAccessStatus === "Enabled" ? "secondary" : "outline"}>
              {company.portalAccessStatus === "Enabled"
                ? "Portal access enabled"
                : company.portalAccessStatus === "Suspended"
                  ? "Portal access suspended"
                  : "Portal access not enabled"}
            </Badge>
          </div>
          <h1 className="break-words text-3xl font-semibold leading-tight">
            {company.name}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            Customer and commercial relationship owned by {company.ownerName}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setOwnerTarget(company)}>
            <UserRoundCog data-icon="inline-start" />
            Change owner
          </Button>
          <Button variant="outline" onClick={() => setEditTarget(company)}>
            <Pencil data-icon="inline-start" />
            Edit
          </Button>
          {canAdminister ? <><Button variant="outline" onClick={() => { mergeMutation.reset(); setMergeSource({ id: company.id, name: company.name, version: company.version }); }}>
            <Combine data-icon="inline-start" />
            Merge
          </Button>
          <Button
            variant={company.isActive ? "destructive" : "outline"}
            onClick={() => setLifecycleTarget(company)}
          >
            {company.isActive ? (
              <PowerOff data-icon="inline-start" />
            ) : (
              <Power data-icon="inline-start" />
            )}
            {company.isActive ? "Deactivate" : "Reactivate"}
          </Button></> : null}
        </div>
      </section>

      <Tabs
        value={activeSection}
        onValueChange={(value) =>
          setActiveSection(value as typeof activeSection)
        }
        className="gap-5"
      >
        <TabsList
          aria-label="Company workspace sections"
          className="flex h-auto w-full flex-wrap justify-start"
        >
          <TabsTrigger className="min-w-fit flex-none px-3 py-1.5" value="overview">
            Overview
          </TabsTrigger>
          <TabsTrigger className="min-w-fit flex-none px-3 py-1.5" value="people">
            People
          </TabsTrigger>
          <TabsTrigger className="min-w-fit flex-none px-3 py-1.5" value="sales">
            Sales
          </TabsTrigger>
          {canAdminister ? <><TabsTrigger className="min-w-fit flex-none px-3 py-1.5" value="departments">
            Departments &amp; services
          </TabsTrigger>
          <TabsTrigger className="min-w-fit flex-none px-3 py-1.5" value="requests">
            Requests
          </TabsTrigger></> : null}
          <TabsTrigger className="min-w-fit flex-none px-3 py-1.5" value="activity">
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {canAdminister && !company.accessOrganizationId ? (
            <Alert>
              <AlertTitle>Online access is not enabled</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  This Company remains the customer record. Create an online
                  access request only when its users need to sign in.
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveSection("requests")}
                >
                  Open requests
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Company profile</CardTitle>
                <CardDescription>
                  Core information used to recognize and manage this commercial
                  relationship.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2">
                  <Info label="Domain" value={company.domainName ?? "Not recorded"} />
                  <Info label="Industry" value={company.industry ?? "Not recorded"} />
                  <Info label="Phone" value={company.phone ?? "Not recorded"} />
                  <Info label="Lifecycle" value={spaced(company.lifecycleState)} />
                  <Info label="Source" value={company.source ?? "Not recorded"} />
                  <Info
                    label="Employees"
                    value={company.employeeCount?.toLocaleString() ?? "Not recorded"}
                  />
                  <div className="rounded-lg border p-4">
                    <dt className="text-xs font-medium text-muted-foreground">Website</dt>
                    <dd className="mt-1 text-sm font-medium">
                      {company.websiteUrl ? (
                        <a
                          href={company.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex cursor-pointer items-center gap-1 underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                          {company.websiteUrl}
                          <ExternalLink className="size-3.5" aria-hidden="true" />
                        </a>
                      ) : (
                        "Not recorded"
                      )}
                    </dd>
                  </div>
                  <div className="rounded-lg border p-4 sm:col-span-2">
                    <dt className="text-xs font-medium text-muted-foreground">
                      Relationship summary
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap text-sm">
                      {company.description ?? "No relationship summary recorded."}
                    </dd>
                  </div>
                  <Info label="Address" value={formatAddress(company)} />
                  <Info
                    label="Tags"
                    value={company.tags.length ? company.tags.join(", ") : "None"}
                  />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Record details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-4">
                  <Meta label="CRM owner" value={company.ownerName} />
                  <Meta label="Created" value={formatDate(company.createdAt)} />
                  <Meta label="Last updated" value={formatDate(company.updatedAt)} />
                </dl>
              </CardContent>
            </Card>
          </div>
          <CrmCustomFields recordType="Company" recordId={companyId} />
        </TabsContent>

        <TabsContent value="people">
          <CrmCompanyPeople
            companyId={companyId}
            companyName={company.name}
            accessOrganizationId={company.accessOrganizationId}
          />
        </TabsContent>

        <TabsContent value="sales">
          <CrmCompanySales companyId={companyId} company={company} />
        </TabsContent>

        {canAdminister ? <TabsContent value="requests">
          <CrmCompanyRelationships companyId={companyId} view="requests" currentRelationship={company.portalRelationship} />
        </TabsContent> : null}

        {canAdminister ? <TabsContent value="departments" className="space-y-6">
          {company.accessOrganizationId ? (
            <>
              <OrganizationDepartmentsPanel organizationId={company.accessOrganizationId} deliveryLocations={company.portalRelationship === 'Customer'} companyId={companyId} />
              <OrganizationDetailPage
                organizationId={company.accessOrganizationId}
                embedded
                showUsers={false}
              />
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Departments &amp; services</CardTitle>
                <CardDescription>
                  Online access has not been approved for this Company.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button type="button" onClick={() => setActiveSection("requests")}>
                  Open Company requests
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent> : null}

        <TabsContent value="activity">
          <CrmRecordWork links={{ companyId }} />
        </TabsContent>
      </Tabs>

      {(editMutation.error || lifecycleMutation.error) &&
      !editOpen &&
      !lifecycleOpen ? (
        <Alert variant="destructive">
          <AlertDescription>
            {apiErrorMessage(editMutation.error ?? lifecycleMutation.error)}
          </AlertDescription>
        </Alert>
      ) : null}

      <CrmCompanyFormDialog
        open={editOpen}
        company={editTarget}
        isPending={editMutation.isPending}
        error={
          editMutation.error ? apiErrorMessage(editMutation.error) : undefined
        }
        onOpenChange={(open) => {
          if (!open) { setEditTarget(null); editMutation.reset(); }
        }}
        onSubmit={(values) => { if (editTarget) editMutation.mutate({ target: editTarget, values }); }}
      />
      <CrmCompanyLifecycleDialog
        company={lifecycleTarget}
        isPending={lifecycleMutation.isPending}
        error={
          lifecycleMutation.error
            ? apiErrorMessage(lifecycleMutation.error)
            : undefined
        }
        onOpenChange={(open) => {
          if (!open) { setLifecycleTarget(null); lifecycleMutation.reset(); }
        }}
        onConfirm={() => { if (lifecycleTarget) lifecycleMutation.mutate(lifecycleTarget); }}
      />
      <Dialog open={ownerOpen} onOpenChange={(open) => { if (!open) { setOwnerTarget(null); ownerMutation.reset(); } }}>
        <DialogContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const ownerUserId = String(
                new FormData(event.currentTarget).get("ownerUserId") ?? "",
              );
              if (ownerUserId && ownerTarget) ownerMutation.mutate({ target: ownerTarget, ownerUserId });
            }}
          >
            <DialogHeader>
              <DialogTitle>Change Company owner</DialogTitle>
              <DialogDescription>
                Assign responsibility for this commercial relationship to an
                active Phaeno user.
              </DialogDescription>
            </DialogHeader>
            {ownerMutation.error ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {apiErrorMessage(ownerMutation.error)}
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="grid gap-1.5">
              <Label htmlFor="company-owner">Owner *</Label>
              <CrmOwnerSelect
                id="company-owner"
                enabled={ownerOpen}
                currentOwnerId={ownerTarget?.ownerUserId}
                currentOwnerName={ownerTarget?.ownerName}
                defaultLabel="Select owner"
              />
            </div>
            <DialogFooter>
              <span className="mr-auto text-xs text-muted-foreground">
                * Required
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setOwnerTarget(null); ownerMutation.reset(); }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={ownerMutation.isPending}>
                {ownerMutation.isPending ? "Saving…" : "Change owner"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {mergeSource ? <CrmMergeDialog
        recordLabel="Company"
        source={mergeSource}
        pending={mergeMutation.isPending}
        error={
          mergeMutation.error ? apiErrorMessage(mergeMutation.error) : undefined
        }
        onClose={() => { setMergeSource(null); mergeMutation.reset(); }}
        onSubmit={(targetId, reason) =>
          mergeMutation.mutate({ source: mergeSource, targetId, reason })
        }
      /> : null}
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function spaced(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function formatAddress(company: {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  countryCode: string | null;
}) {
  const locality = [company.city, company.region, company.postalCode]
    .filter(Boolean)
    .join(", ");
  return (
    [company.addressLine1, company.addressLine2, locality, company.countryCode]
      .filter(Boolean)
      .join("\n") || "Not recorded"
  );
}
