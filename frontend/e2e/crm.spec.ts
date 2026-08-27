import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

const companyId = "00000000-0000-0000-0000-000000000901";
const ownerId = "00000000-0000-0000-0000-000000000902";
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
      url.pathname === "/api/platform/crm/administration/saved-views"
    ) {
      return envelope(route, []);
    }
    if (method === "POST" && url.pathname === "/api/platform/crm/companies") {
      submitted = request.postDataJSON() as Record<string, unknown>;
      return envelope(route, company(String(submitted.name)));
    }

    return notFound(route);
  });

  await page.goto("/crm/companies");
  await expect(page.getByRole("heading", { name: "Companies" })).toBeVisible();
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
  await expect(page.getByRole("link", { name: "Atlas Research" })).toBeVisible();
  await expect(
    page.getByText("CRM records are separate from Portal accounts"),
  ).toBeVisible();

  await page.getByRole("button", { name: "New company" }).click();
  const dialog = page.getByRole("dialog", { name: "New company" });
  await expect(dialog).toContainText("does not create a Portal account or grant access");
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
