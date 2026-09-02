import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

const companyId = "00000000-0000-0000-0000-000000000901";
const ownerId = "00000000-0000-0000-0000-000000000902";
const opportunityId = "00000000-0000-0000-0000-000000000903";
const leadId = "00000000-0000-0000-0000-000000000904";
const apiRequestPattern = /^https:\/\/127\.0\.0\.1:\d+\/api\//;

test("creates a standalone CRM company without changing Portal access", async ({
  page,
}) => {
  const browserErrors: string[] = [];
  const portalWrites: string[] = [];
  let submitted: Record<string, unknown> | null = null;

  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.route(apiRequestPattern, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (method !== "GET" && !url.pathname.startsWith("/api/platform/crm/")) {
      portalWrites.push(`${method} ${url.pathname}`);
    }

    if (method === "GET" && url.pathname === "/api/platform/crm/companies") {
      return envelope(route, {
        items: [company("Atlas Research")],
        page: 1,
        pageSize: 25,
        totalCount: 1,
      });
    }
    if (
      method === "GET" &&
      url.pathname === `/api/platform/crm/companies/${companyId}`
    ) {
      return envelope(route, company("Atlas Research"));
    }
    if (
      method === "GET" &&
      url.pathname === "/api/platform/crm/administration/saved-views"
    ) {
      return envelope(route, []);
    }
    if (method === "POST" && url.pathname === "/api/platform/crm/companies") {
      submitted = request.postDataJSON() as Record<string, unknown>;
      return envelope(route, company(String(submitted.name)));
    }
    if (["/api/platform/crm/opportunities", "/api/platform/crm/activities", "/api/platform/crm/tasks"].includes(url.pathname)) {
      return envelope(route, emptyPage());
    }
    if (method === "GET") return envelope(route, []);

    return notFound(route);
  });

  await page.goto("/crm/companies");
  await expect(page.getByRole("heading", { name: "Companies" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Atlas Research" })).toBeVisible();
  const crmNavigation = await openCrmNavigation(page);
  await expect(
    crmNavigation.getByRole("button", { name: /^Companies/ }),
  ).toHaveAttribute("aria-current", "page");
  for (const label of [
    "Home",
    "Contacts",
    "Leads",
    "Opportunities",
    "Tasks",
    "Reports",
    "Administration",
  ]) {
    await expect(
      crmNavigation.getByRole("button", { name: new RegExp(`^${label}`) }),
    ).toBeVisible();
  }
  await closeCrmNavigationIfOpen(page);
  await expect(
    page.getByText("Companies are the customer record"),
  ).toBeVisible();

  await page.getByRole("link", { name: "Atlas Research" }).click();
  await expect(page).toHaveURL(`/crm/companies/${companyId}`);
  await expect(page.getByText("Company", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Atlas Research" }),
  ).toBeVisible();
  await expectCompactCardHeaderAction(
    page,
    "Company requests",
    "Create request",
  );
  await page.getByRole("button", { name: "Create request" }).click();
  const requestDialog = page.getByRole("dialog", {
    name: "Create Company request",
  });
  await expect(
    requestDialog.getByRole("combobox", { name: "Request category" }),
  ).toHaveValue(
    "OnlineAccess",
  );
  await requestDialog
    .getByRole("combobox", { name: "Request category" })
    .selectOption("Work");
  await expect(
    requestDialog.getByRole("combobox", { name: "Request type" }),
  ).toHaveValue(
    "TrialProject",
  );
  await expect(requestDialog.getByLabel("Opportunity")).toBeVisible();
  await requestDialog.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("link", { name: "Back to companies" }).click();
  await expect(page.getByRole("heading", { name: "Companies" })).toBeVisible();

  await page.getByRole("button", { name: "New company" }).click();
  const dialog = page.getByRole("dialog", { name: "New company" });
  await expect(dialog).toContainText("Portal access remains disabled until a reviewed request is approved");
  await expectNoSeriousAccessibilityViolations(page, dialog);
  await dialog.getByLabel(/Company name/).fill("Example Biosciences");
  await dialog.getByLabel("Website").fill("https://example.test");
  await dialog.getByRole("button", { name: "Create company" }).click();

  await expect(page).toHaveURL(`/crm/companies/${companyId}`);
  expect(submitted).toMatchObject({
    name: "Example Biosciences",
    websiteUrl: "https://example.test",
    lifecycleState: "Target",
  });
  expect(portalWrites).toEqual([]);
  expect(browserErrors).toEqual([]);
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);
});

test("opens a Lead detail workspace from the Lead queue", async ({ page }) => {
  await page.route(apiRequestPattern, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === `/api/platform/crm/leads/${leadId}`) {
      return envelope(route, lead());
    }
    if (url.pathname === "/api/platform/crm/leads") {
      return envelope(route, {
        items: [lead()],
        page: 1,
        pageSize: 100,
        totalCount: 1,
      });
    }
    if (url.pathname === "/api/platform/crm/administration/saved-views") {
      return envelope(route, []);
    }
    if (
      url.pathname === "/api/platform/crm/activities" ||
      url.pathname === "/api/platform/crm/tasks"
    ) {
      return envelope(route, emptyPage());
    }
    if (route.request().method() === "GET") return envelope(route, []);
    return notFound(route);
  });

  await page.goto("/crm/leads");
  await page.getByRole("link", { name: "Lead A" }).click();

  await expect(page).toHaveURL(`/crm/leads/${leadId}`);
  await expect(page.getByRole("heading", { name: "Lead A" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to leads" })).toBeVisible();
  await expect(
    page.getByText("No qualification decision has been recorded."),
  ).toBeVisible();
  await expect(page.getByText("Qualification notes", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Disqualification reason", { exact: true })).toHaveCount(0);
  await expectCompactCardHeaderAction(page, "Activity timeline", "Log activity");
  await expectCompactCardHeaderAction(page, "Tasks", "New task");
  const leadDetailsBounds = await page
    .getByText("Lead details", { exact: true })
    .locator("xpath=ancestor::*[@data-slot='card']")
    .boundingBox();
  const qualificationBounds = await page
    .getByText("Qualification record", { exact: true })
    .locator("xpath=ancestor::*[@data-slot='card']")
    .boundingBox();
  expect(leadDetailsBounds).not.toBeNull();
  expect(qualificationBounds).not.toBeNull();
  expect(Math.abs(leadDetailsBounds!.width - qualificationBounds!.width)).toBeLessThanOrEqual(1);
});

test("opens an approved Won Opportunity handoff as a locked Customer order", async ({ page }) => {
  await page.route(apiRequestPattern, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === `/api/platform/crm/opportunities/${opportunityId}`) {
      return envelope(route, opportunity());
    }
    if (url.pathname === "/api/platform/crm/pipelines") {
      return envelope(route, [{
        id: "pipeline-1",
        name: "Commercial",
        description: null,
        isDefault: true,
        isActive: true,
        version: 1,
        stages: [{ id: "won-stage", pipelineId: "pipeline-1", name: "Won", position: 1, category: "Won", probability: 100, requiresReason: false, isActive: true, version: 1 }],
      }]);
    }
    if (url.pathname === "/api/platform/crm/companies") {
      return envelope(route, { items: [company("Atlas Research")], page: 1, pageSize: 100, totalCount: 1 });
    }
    if (url.pathname === `/api/platform/crm/companies/${companyId}/handoffs`) {
      return envelope(route, [{
        id: "handoff-1",
        companyId,
        opportunityId,
        type: "CustomWork",
        relationshipRequestId: "request-1",
        requestNumber: "PRQ-ORDER-1",
        status: "Approved",
        requestedOrganizationKind: "Customer",
        organizationId: "customer-1",
        idempotencyKey: "handoff-key",
        createdAt: "2026-08-28T18:00:00Z",
        orderId: null,
        orderNumber: null,
        orderStatus: null,
        canStartCustomerOrder: true,
        orderBlockingReason: null,
      }]);
    }
    if (url.pathname === "/api/platform/lab-service-orders/eligible-customers") {
      return envelope(route, [{ id: "customer-1", name: "Atlas Research Customer" }]);
    }
    if (url.pathname === "/api/users/phaeno") {
      return raw(route, []);
    }
    if (["/api/platform/crm/opportunities", "/api/platform/crm/activities", "/api/platform/crm/tasks"].includes(url.pathname)) {
      return envelope(route, emptyPage());
    }
    if (route.request().method() === "GET") return envelope(route, []);
    return notFound(route);
  });

  await page.goto(`/crm/opportunities/${opportunityId}`);
  await expect(page.getByRole("heading", { name: "PSeq program" })).toBeVisible();
  await expect(page.getByText("OPP-20260828-A1B2C3D4E5")).toBeVisible();
  await expect(page.getByText("PRQ-ORDER-1")).toBeVisible();
  await expectCompactCardHeaderAction(
    page,
    "Customer order handoffs",
    "Create order handoff",
  );
  await page.getByRole("button", { name: "Edit" }).click();
  const editDialog = page.getByRole("dialog", { name: "Edit opportunity" });
  await expect(editDialog.getByLabel("Product interest")).toHaveValue(
    "PSeqLabService",
  );
  await expect(
    editDialog.getByRole("option", { name: "PSeq Kit" }),
  ).toBeAttached();
  const ownerBounds = await editDialog.getByLabel("Owner").boundingBox();
  const dialogBounds = await editDialog.boundingBox();
  expect(ownerBounds).not.toBeNull();
  expect(dialogBounds).not.toBeNull();
  expect(ownerBounds!.x + ownerBounds!.width).toBeLessThanOrEqual(
    dialogBounds!.x + dialogBounds!.width,
  );
  await editDialog.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("button", { name: "Start Customer order" }).click();

  const dialog = page.getByRole("dialog", { name: "Start order from PRQ-ORDER-1" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Atlas Research · PSeq program · PRQ-ORDER-1/)).toBeVisible();
  await expect(dialog.getByLabel("Customer")).toBeDisabled();
  await expect(dialog.getByLabel("Customer")).toHaveValue(
    "Atlas Research Customer",
  );
});

async function expectCompactCardHeaderAction(
  page: Page,
  title: string,
  actionName: string,
) {
  const header = page
    .getByText(title, { exact: true })
    .locator("xpath=ancestor::*[@data-slot='card-header']");
  const titleBounds = await header
    .locator("[data-slot='card-title']")
    .boundingBox();
  const headerBounds = await header.boundingBox();
  const actionBounds = await header
    .getByRole("button", { name: actionName })
    .boundingBox();

  expect(titleBounds).not.toBeNull();
  expect(headerBounds).not.toBeNull();
  expect(actionBounds).not.toBeNull();
  expect(Math.abs(actionBounds!.y - titleBounds!.y)).toBeLessThanOrEqual(2);
  expect(actionBounds!.x).toBeGreaterThanOrEqual(
    titleBounds!.x + titleBounds!.width,
  );
  expect(actionBounds!.width).toBeLessThan(headerBounds!.width * 0.75);
  expect(
    headerBounds!.x + headerBounds!.width -
      (actionBounds!.x + actionBounds!.width),
  ).toBeLessThanOrEqual(20);
}

function company(name: string) {
  return {
    id: companyId,
    name,
    websiteUrl: "https://example.test",
    domainName: "example.test",
    phone: null,
    industry: "Biotechnology",
    description: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    region: null,
    postalCode: null,
    countryCode: null,
    employeeCount: null,
    lifecycleState: "Target",
    source: "Internal",
    tags: [],
    aliases: [],
    mergedIntoCompanyId: null,
    ownerUserId: ownerId,
    ownerName: "Phaeno Admin",
    isActive: true,
    createdAt: "2026-08-26T18:00:00Z",
    updatedAt: "2026-08-26T18:00:00Z",
    version: 1,
  };
}

function opportunity() {
  return {
    id: opportunityId,
    opportunityNumber: "OPP-20260828-A1B2C3D4E5",
    name: "PSeq program",
    companyId,
    companyName: "Atlas Research",
    pipelineId: "pipeline-1",
    pipelineName: "Commercial",
    stageId: "won-stage",
    stageName: "Won",
    stageCategory: "Won",
    ownerUserId: ownerId,
    ownerName: "Phaeno Admin",
    productInterest: "PSeqLabService",
    amount: 25000,
    currency: "USD",
    probability: 100,
    expectedCloseDate: "2026-08-28",
    nextStep: null,
    competitors: null,
    description: null,
    tags: [],
    closedAt: "2026-08-28T18:00:00Z",
    outcomeReason: "Approved scope",
    isActive: true,
    createdAt: "2026-08-20T18:00:00Z",
    updatedAt: "2026-08-28T18:00:00Z",
    version: 3,
  };
}

function lead() {
  return {
    id: leadId,
    kind: "Company",
    displayName: "Lead A",
    companyName: "Company A",
    firstName: null,
    lastName: null,
    email: null,
    phone: null,
    source: null,
    status: "New",
    qualificationNotes: null,
    disqualificationReason: null,
    nextAction: null,
    ownerUserId: ownerId,
    ownerName: "Bill Haack",
    tags: [],
    convertedAt: null,
    convertedCompanyId: null,
    convertedContactId: null,
    convertedOpportunityId: null,
    isActive: true,
    createdAt: "2026-08-28T18:00:00Z",
    updatedAt: "2026-08-28T18:00:00Z",
    version: 1,
  };
}

function emptyPage() {
  return { items: [], page: 1, pageSize: 100, totalCount: 0 };
}

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

async function envelope(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, data, error: null }),
  });
}

async function raw(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(data),
  });
}

async function notFound(route: Route) {
  await route.fulfill({
    status: 404,
    contentType: "application/json",
    body: JSON.stringify({
      success: false,
      data: null,
      error: { code: "not_mocked", message: "Not mocked." },
    }),
  });
}

async function openCrmNavigation(page: Page) {
  const navigation = page.getByRole("navigation", { name: "CRM sections" });
  if (!(await navigation.isVisible())) {
    await page
      .getByRole("button", { name: /Open CRM navigation/ })
      .click();
  }
  await expect(navigation).toBeVisible();
  return navigation;
}

async function closeCrmNavigationIfOpen(page: Page) {
  const closeButton = page.getByRole("button", {
    name: "Close CRM navigation",
  });
  if (await closeButton.isVisible()) await closeButton.click();
}
