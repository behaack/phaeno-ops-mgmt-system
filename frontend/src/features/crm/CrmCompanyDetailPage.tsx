import { LoadingState } from '#/components/ui/content-state'
import { portalAccessTones } from '#/features/organizations/access-status'
import { DomainStatusBadge } from '#/components/ui/domain-status-badge'
import { RequiredLegend } from '#/components/ui/required-field'
import { RequiredFieldName } from '#/components/ui/required-field'
import { DetailField, DetailSummary, DetailHeading } from '#/components/ui/detail-summary'
import { formatDisplayTimestamp } from '#/lib/display-format'
import { PageHeader } from '#/components/ui/page-header'
import { BackLink } from '#/components/ui/back-link'
import { useCrmPermissions } from './use-crm-permissions';
import { CrmProvisioningReturn } from "./CrmListNavigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Combine, ExternalLink, Pencil, Power, PowerOff, UserRoundCog } from "lucide-react";
import { useRef, useState } from "react";
import axios from "axios";

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
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "#/components/ui/dropdown-menu";
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
import { CrmCompanyDepartments } from "./CrmCompanyDepartments";
import { CompanyLabServicePricing } from './CompanyLabServicePricing';

const companyReviewFields: ReadonlyArray<readonly [keyof CrmCompany, string]> = [
  ["name", "Company name"], ["websiteUrl", "Website"], ["domainName", "Domain"],
  ["lifecycleState", "Relationship stage"], ["phone", "Phone"], ["industry", "Industry"],
  ["description", "Relationship summary"], ["addressLine1", "Address line 1"],
  ["addressLine2", "Address line 2"], ["city", "City"], ["region", "Region"],
  ["postalCode", "Postal code"], ["countryCode", "Country"], ["employeeCount", "Employee count"],
  ["source", "Source"], ["tags", "Tags"], ["ownerName", "Owner"], ["isActive", "Active"],
  ["portalAccessStatus", "Portal access"], ["mergedIntoCompanyId", "Merged into Company"],
];
function reviewValue(value: CrmCompany[keyof CrmCompany]) {
  if (Array.isArray(value)) return value.join(", ") || "Not recorded";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return value == null || value === "" ? "Not recorded" : String(value);
}

export function CrmCompanyDetailPage({ companyId }: { companyId: string }) {
  const { canAdminister, canManageLabServicePricing: canManagePrices, canViewLabServicePricing: canViewPrices } = useCrmPermissions();
  const actionsTrigger = useRef<HTMLButtonElement>(null);
  const selectedAction = useRef<(() => void) | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [editTarget, setEditTarget] = useState<CrmCompany | null>(null);
  const [reviewNeeded, setReviewNeeded] = useState(false);
  const [lifecycleTarget, setLifecycleTarget] = useState<CrmCompany | null>(null);
  const [mergeSource, setMergeSource] = useState<CrmMergeSource | null>(null);
  const [ownerTarget, setOwnerTarget] = useState<CrmCompany | null>(null);
  const editOpen = Boolean(editTarget);
  const lifecycleOpen = Boolean(lifecycleTarget);
  const ownerOpen = Boolean(ownerTarget);
  const [storedSection, setActiveSection] = useCrmState<
    "overview" | "people" | "sales" | "departments" | "services" | "requests" | "activity"
  >("section", "overview");
  const allowedSections = canAdminister ? ["overview", "people", "sales", "departments", "services", "requests", "activity"] : ["overview", "people", "sales", ...(canViewPrices ? ['services'] : []), "activity"];
  const activeSection = allowedSections.includes(storedSection) ? storedSection : "overview";
  const companyQuery = useQuery({
    queryKey: ["crm-company", companyId],
    queryFn: () => getCrmCompany(companyId),
  });

  const refreshDirectory = () =>
    queryClient.invalidateQueries({ queryKey: ["crm-companies"] });
  const reloadCompany = useMutation({ mutationFn: () => getCrmCompany(companyId) });
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
      setReviewNeeded(false);
      reloadCompany.reset();
      await refreshDirectory();
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setReviewNeeded(true);
        reloadCompany.mutate();
      }
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
        <LoadingState  label={<>
          Loading company…
        </>} />
      </main>
    );
  }

  const company = companyQuery.data;
  if (!company) {
    return (
      <main className="page-wrap px-4 py-8">
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle><DetailHeading>CRM company not found</DetailHeading></CardTitle>
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
            <BackLink asChild>
              <Link to="/crm/companies" search={previous => previous}>
                Back to companies
              </Link>
            </BackLink>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="page-wrap space-y-6 px-4 py-8">
      <div className="flex flex-wrap gap-2">
        <CrmProvisioningReturn />
        <BackLink asChild>
          <Link to="/crm/companies" search={previous => previous}>Back to companies</Link>
        </BackLink>
      </div>

      <PageHeader title={company.name} description={<>Customer and commercial relationship owned by {company.ownerName}.</>} eyebrow={<div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Company</Badge>
            <Badge variant={company.isActive ? "outline" : "destructive"}>
              {company.isActive ? "Active" : "Inactive"}
            </Badge>
            <DomainStatusBadge status={company.portalAccessStatus} tones={portalAccessTones}>
              {company.portalAccessStatus === "Enabled"
                ? "Portal access enabled"
                : company.portalAccessStatus === "Suspended"
                  ? "Portal access suspended"
                  : "Portal access not enabled"}
            </DomainStatusBadge>
          </div>} actions={<ActionMenu>
          <DropdownMenuTrigger asChild>
            <Button ref={actionsTrigger} variant="outline" className="shrink-0 self-start" aria-label={`Actions for ${company.name}`}>
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-max min-w-48 max-w-[calc(100vw-2rem)]" onCloseAutoFocus={(event) => {
            // Open dialogs after the menu restores focus to its persistent trigger.
            event.preventDefault();
            actionsTrigger.current?.focus();
            const action = selectedAction.current;
            selectedAction.current = null;
            action?.();
          }}>
            <DropdownMenuItem onSelect={() => { selectedAction.current = () => setOwnerTarget(company); }}>
              <UserRoundCog aria-hidden="true" />Change owner
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { selectedAction.current = () => setEditTarget(company); }}>
              <Pencil aria-hidden="true" />Edit
            </DropdownMenuItem>
            {canAdminister ? <>
              <DropdownMenuItem onSelect={() => { selectedAction.current = () => { mergeMutation.reset(); setMergeSource({ id: company.id, name: company.name, version: company.version }); }; }}>
                <Combine aria-hidden="true" />Merge
              </DropdownMenuItem>
              <DropdownMenuItem variant={company.isActive ? "destructive" : "default"} onSelect={() => { selectedAction.current = () => setLifecycleTarget(company); }}>
                {company.isActive ? <PowerOff aria-hidden="true" /> : <Power aria-hidden="true" />}
                {company.isActive ? "Deactivate" : "Reactivate"}
              </DropdownMenuItem>
            </> : null}
          </DropdownMenuContent>
        </ActionMenu>} />

      <Tabs
        value={activeSection}
        onValueChange={(value) =>
          setActiveSection(value as typeof activeSection)
        }
        className="gap-5"
      >
        <TabsList
          aria-label="Company workspace sections"
          className="flex w-full flex-wrap justify-start"
        >
          <TabsTrigger className="min-w-fit flex-none" value="overview">
            Overview
          </TabsTrigger>
          <TabsTrigger className="min-w-fit flex-none" value="people">
            People
          </TabsTrigger>
          <TabsTrigger className="min-w-fit flex-none" value="sales">
            Sales
          </TabsTrigger>
          {canAdminister ? <><TabsTrigger className="min-w-fit flex-none" value="departments">
            Departments
          </TabsTrigger>
          <TabsTrigger className="min-w-fit flex-none" value="requests">
            Requests
          </TabsTrigger></> : null}
          {canAdminister || canViewPrices ? <TabsTrigger className="min-w-fit flex-none" value="services">Services</TabsTrigger> : null}
          <TabsTrigger className="min-w-fit flex-none" value="activity">
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
                <CardTitle><DetailHeading>Company profile</DetailHeading></CardTitle>
                <CardDescription>
                  Core information used to recognize and manage this commercial
                  relationship.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DetailSummary>
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
                </DetailSummary>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle><DetailHeading>Record details</DetailHeading></CardTitle>
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
          <CrmCompanyDepartments company={company} />
        </TabsContent> : null}

        {canAdminister || canViewPrices ? <TabsContent value="services" className="space-y-6">
          {canViewPrices && company.portalRelationship === 'Customer' ? <CompanyLabServicePricing companyId={company.id} canManage={canManagePrices} /> : null}
          {canAdminister ? <>
          {company.accessOrganizationId ? (
            <OrganizationDetailPage
              organizationId={company.accessOrganizationId}
              embedded
              showUsers={false}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle><DetailHeading>Services</DetailHeading></CardTitle>
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
          </> : null}
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
        saveBlocked={reviewNeeded}
        feedback={reviewNeeded ? <Alert variant="destructive">
          <AlertTitle>Review the current Company before saving again</AlertTitle>
          <AlertDescription>
            <p>Your entries are retained. Review changes made since you opened this editor; saving again applies your entered values.</p>
            {reloadCompany.isPending ? <LoadingState  label={<>Loading current Company…</>} /> : reloadCompany.error ? <>
              <p>{apiErrorMessage(reloadCompany.error)}</p>
              <Button type="button" variant="outline" onClick={() => reloadCompany.mutate()}>Retry current record</Button>
            </> : reloadCompany.data && editTarget ? <>
              <dl className="grid gap-2">
                {companyReviewFields.filter(([key]) => JSON.stringify(editTarget[key]) !== JSON.stringify(reloadCompany.data![key])).map(([key, label]) => <div key={key}>
                  <dt className="font-medium">{label}</dt>
                  <dd>Previously: {reviewValue(editTarget[key])}. Current: {reviewValue(reloadCompany.data![key])}.</dd>
                </div>)}
              </dl>
              <Button type="button" variant="outline" onClick={() => {
                const current = reloadCompany.data;
                if (!current) return;
                setEditTarget(current);
                queryClient.setQueryData(["crm-company", current.id], current);
                setReviewNeeded(false);
                editMutation.reset();
              }}>Use reviewed record</Button>
            </> : null}
          </AlertDescription>
        </Alert> : undefined}
        error={
          !reviewNeeded && editMutation.error ? apiErrorMessage(editMutation.error) : undefined
        }
        onOpenChange={(open) => {
          if (!open) { setEditTarget(null); editMutation.reset(); setReviewNeeded(false); reloadCompany.reset(); }
        }}
        onSubmit={(values) => { if (editTarget && !reviewNeeded && !editMutation.isPending) editMutation.mutate({ target: editTarget, values }); }}
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
              <Label htmlFor="company-owner"><RequiredFieldName>Owner</RequiredFieldName></Label>
              <CrmOwnerSelect
                id="company-owner"
                enabled={ownerOpen}
                currentOwnerId={ownerTarget?.ownerUserId}
                currentOwnerName={ownerTarget?.ownerName}
                defaultLabel="Select owner"
              />
            </div>
            <DialogFooter>
              <RequiredLegend className="mr-auto" />
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

function Info({ label, value }: { label: string; value: string }) { return <DetailField label={label} value={value} boxed /> }

function Meta({ label, value }: { label: string; value: string }) { return <DetailField label={label} value={value} /> }

function formatDate(value: string) { return formatDisplayTimestamp(value) }

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
