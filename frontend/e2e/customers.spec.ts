import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

import type { CrmCompany } from "../src/api/crm";
import type {
  RelationshipRequest,
  ServiceEntitlement,
} from "../src/api/organization-management";

const companyId = "00000000-0000-0000-0000-000000000901";
const organizationId = "00000000-0000-0000-0000-000000000101";
const membershipId = "00000000-0000-0000-0000-000000000201";
const entitlementId = "00000000-0000-0000-0000-000000000301";
const requestId = "00000000-0000-0000-0000-000000000401";
const apiRequestPattern = /^https:\/\/127\.0\.0\.1:\d+\/api\//;

test("reviews Portal access in CRM without a separate customer directory", async ({
  page,
}) => {
  let requests = [pendingAccessRequest()];

  await page.route(apiRequestPattern, async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (
      method === "GET" &&
      url.pathname === "/api/platform/relationships/requests"
    ) {
      return envelope(route, requests);
    }
    if (
      method === "POST" &&
      url.pathname ===
        `/api/platform/relationships/requests/${requestId}/decision`
    ) {
      expect(route.request().postDataJSON()).toEqual({
        approved: true,
        reason: "Commercial onboarding approved.",
        version: 1,
        orderingAuthorized: true,
      });
      const approved = {
        ...requests[0],
        organizationId,
        status: "Approved" as const,
        version: 2,
      };
      requests = [];
      return envelope(route, approved);
    }

    return notFound(route);
  });

  await page.goto("/customers");
  await expect(
    page.getByRole("heading", { name: "Company request review" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Atlas Research" })).toHaveAttribute(
    "href",
    `/crm/companies/${companyId}`,
  );
  await expect(page.getByText("Portal accounts", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /New Portal account/i })).toHaveCount(
    0,
  );

  await page.getByRole("button", { name: "Approve and enable access" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Approve and enable Portal access",
  });
  await expect(dialog).toContainText(
    "Approval enables Portal access on this Company",
  );
  await expectNoSeriousAccessibilityViolations(page, dialog);
  await dialog
    .getByLabel(/Approval reason/)
    .fill("Commercial onboarding approved.");
  await dialog
    .getByRole("button", { name: "Approve and enable access" })
    .click();

  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByText("No Company requests are waiting for review."),
  ).toBeVisible();
});

test("resolves a legacy access link to the canonical Company workspace", async ({
  page,
}) => {
  const eligibleRequest = relationshipRequest();
  let entitlement: ServiceEntitlement = serviceEntitlement();

  await page.route(apiRequestPattern, async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (
      method === "GET" &&
      (url.pathname ===
        `/api/platform/crm/companies/by-access/${organizationId}` ||
        url.pathname === `/api/platform/crm/companies/${companyId}`)
    ) {
      return envelope(route, company());
    }
    if (
      method === "GET" &&
      url.pathname === `/api/platform/crm/companies/${companyId}/contacts`
    ) {
      return envelope(route, []);
    }
    if (
      method === "GET" &&
      url.pathname === `/api/platform/crm/companies/${companyId}/handoffs`
    ) {
      return envelope(route, []);
    }
    if (
      method === "GET" &&
      [
        "/api/platform/crm/opportunities",
        "/api/platform/crm/activities",
        "/api/platform/crm/tasks",
      ].includes(url.pathname)
    ) {
      return envelope(route, {
        items: [],
        page: 1,
        pageSize: 100,
        totalCount: 0,
      });
    }
    if (
      method === "GET" &&
      (url.pathname === "/api/platform/crm/administration/custom-fields" ||
        url.pathname ===
          `/api/platform/crm/administration/custom-field-values/${companyId}`)
    ) {
      return envelope(route, []);
    }
    if (method === "GET" && url.pathname === `/api/organizations/${organizationId}`) {
      return json(route, customerOrganization());
    }
    if (
      method === "GET" &&
      url.pathname ===
        `/api/platform/relationships/organizations/${organizationId}/summary`
    ) {
      return envelope(route, organizationSummary());
    }
    if (
      method === "GET" &&
      url.pathname ===
        `/api/platform/relationships/organizations/${organizationId}/operational-readiness`
    ) {
      return envelope(route, operationalReadiness());
    }
    if (
      method === "GET" &&
      url.pathname === `/api/users/organization/${organizationId}`
    ) {
      return json(route, [organizationUser()]);
    }
    if (method === "GET" && url.pathname === "/api/invitations") {
      return json(route, []);
    }
    if (
      method === "GET" &&
      url.pathname ===
        `/api/platform/relationships/organizations/${organizationId}/entitlements`
    ) {
      return envelope(route, [entitlement]);
    }
    if (
      method === "GET" &&
      url.pathname === "/api/platform/relationships/requests"
    ) {
      return envelope(route, [eligibleRequest]);
    }
    if (
      method === "POST" &&
      url.pathname ===
        `/api/platform/relationships/organizations/${organizationId}/entitlements/${entitlementId}/end`
    ) {
      const body = route.request().postDataJSON() as { reason: string };
      entitlement = {
        ...entitlement,
        effectiveTo: "2026-09-01T12:00:00Z",
        endReason: body.reason,
        isEffective: false,
        isUsable: false,
        version: entitlement.version + 1,
      };
      return envelope(route, entitlement);
    }
    if (
      method === "POST" &&
      url.pathname === `/api/memberships/${membershipId}/deactivate`
    ) {
      return json(route, {});
    }

    return notFound(route);
  });

  await page.goto(`/customers/${organizationId}`);
  await expect(page.getByRole("heading", { name: "Atlas Research" })).toBeVisible();
  await expect(page.getByText("Company", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Portal access and services" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to companies" })).toBeVisible();
  await expect(page.getByText("Back to Portal accounts")).toHaveCount(0);

  await page.getByRole("tab", { name: "Services" }).click();
  await expect(page.getByText("PSeq Lab Service", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "End now" }).click();
  const endDialog = page.getByRole("dialog", {
    name: "End service entitlement",
  });
  await endDialog.getByLabel(/End reason/).fill("Commercial term ended.");
  await endDialog.getByRole("button", { name: "End entitlement" }).click();
  await expect(page.getByText("Commercial term ended.")).toBeVisible();

  await page.getByRole("tab", { name: "Users" }).click();
  const usersPanel = page.getByRole("tabpanel", { name: "Users" });
  await expect(usersPanel.getByText("member@example.com")).toBeVisible();
  await usersPanel.getByRole("button", { name: "Deactivate" }).click();
  const memberDialog = page.getByRole("dialog", {
    name: "Deactivate membership",
  });
  await expect(memberDialog).toContainText("Atlas Research");
  await expectNoSeriousAccessibilityViolations(page, memberDialog);
});

async function expectNoSeriousAccessibilityViolations(
  page: Page,
  locator: ReturnType<Page["getByRole"]>,
) {
  const results = await new AxeBuilder({ page })
    .include(await locator.evaluate((element) => `#${element.id}`))
    .analyze();
  expect(
    results.violations.filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical",
    ),
  ).toEqual([]);
}

async function json(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function envelope(route: Route, data: unknown) {
  await json(route, { success: true, data, error: null });
}

async function notFound(route: Route) {
  await route.fulfill({
    status: 404,
    contentType: "application/json",
    body: JSON.stringify({ error: "Unhandled test route" }),
  });
}

function company(): CrmCompany {
  return {
    id: companyId,
    name: "Atlas Research",
    websiteUrl: "https://atlas.example",
    domainName: "atlas.example",
    phone: null,
    industry: "Biotechnology",
    description: "Synthetic customer for Company access coverage.",
    addressLine1: null,
    addressLine2: null,
    city: null,
    region: null,
    postalCode: null,
    countryCode: null,
    employeeCount: null,
    lifecycleState: "ActiveCustomer",
    source: "Internal",
    tags: [],
    aliases: [],
    mergedIntoCompanyId: null,
    ownerUserId: "00000000-0000-0000-0000-000000000902",
    ownerName: "Phaeno Admin",
    accessOrganizationId: organizationId,
    portalRelationship: "Customer",
    portalReadiness: "Ready",
    portalAccessStatus: "Enabled",
    isActive: true,
    createdAt: "2026-08-26T18:00:00Z",
    updatedAt: "2026-09-01T18:00:00Z",
    version: 2,
  };
}

function pendingAccessRequest(): RelationshipRequest {
  return {
    id: requestId,
    requestNumber: "PRQ-ACCESS",
    companyId,
    organizationId: null,
    candidateOrganizationName: "Atlas Research",
    requestType: "Onboarding",
    source: "FirstPartyCrm",
    status: "PendingReview",
    requestedOrganizationKind: "Customer",
    sourceReference: "Company onboarding",
    summary: "Enable Customer Portal access.",
    internalNotes: null,
    requestedByUserId: "00000000-0000-0000-0000-000000000903",
    reviewedByUserId: null,
    reviewedAt: null,
    decisionReason: null,
    appliedByUserId: null,
    appliedAt: null,
    applicationNotes: null,
    requestedServices: ["PSeqLabService"],
    createdAt: "2026-09-01T10:00:00Z",
    updatedAt: "2026-09-01T10:00:00Z",
    version: 1,
  };
}

function customerOrganization() {
  return {
    id: organizationId,
    name: "Atlas Research",
    description: "Internal tenant scope for Atlas Research.",
    kind: "Customer",
    portalReadiness: "Ready",
    portalReadinessNote: "Configured for test coverage.",
    isActive: true,
    createdAt: "2026-07-15T10:00:00Z",
    updatedAt: "2026-07-15T10:00:00Z",
    version: 1,
  };
}

function organizationSummary() {
  return {
    organizationId,
    organizationName: "Atlas Research",
    organizationKind: "Customer",
    isActive: true,
    portalReadiness: "Ready",
    portalReadinessNote: "Configured for test coverage.",
    administratorStatus: "Active",
    activeMemberCount: 1,
    pendingInvitationCount: 0,
    effectiveServices: ["PSeqLabService"],
    pendingRequestCount: 0,
  };
}

function operationalReadiness() {
  return {
    organizationId,
    state: "Ready",
    canStageOrder: true,
    canIssueQuote: true,
    hasManualBlock: false,
    manualBlockReason: null,
    blockers: [],
  };
}

function organizationUser() {
  return {
    id: "00000000-0000-0000-0000-000000000501",
    email: "member@example.com",
    firstName: "Portal",
    lastName: "Member",
    isActive: true,
    status: "Active",
    memberships: [
      {
        id: membershipId,
        organizationId,
        organizationName: "Atlas Research",
        organizationKind: "Customer",
        isActive: true,
        isOrganizationAdmin: false,
        createdAt: "2026-07-15T10:00:00Z",
        updatedAt: "2026-07-15T10:00:00Z",
        version: 1,
      },
    ],
    version: 1,
  };
}

function serviceEntitlement(): ServiceEntitlement {
  return {
    id: entitlementId,
    organizationId,
    service: "PSeqLabService",
    effectiveFrom: "2026-07-15T12:00:00Z",
    effectiveTo: null,
    configurationStatus: "Ready",
    sourceRequestId: requestId,
    approvedByUserId: "00000000-0000-0000-0000-000000000601",
    notes: "Configured service.",
    endReason: null,
    isEffective: true,
    isUsable: true,
    createdAt: "2026-07-15T12:00:00Z",
    updatedAt: "2026-07-15T12:00:00Z",
    version: 1,
  };
}

function relationshipRequest(): RelationshipRequest {
  return {
    ...pendingAccessRequest(),
    organizationId,
    requestType: "ServiceChange",
    status: "Approved",
    reviewedByUserId: "00000000-0000-0000-0000-000000000702",
    reviewedAt: "2026-07-15T12:00:00Z",
    decisionReason: "Approved.",
    version: 2,
  };
}
