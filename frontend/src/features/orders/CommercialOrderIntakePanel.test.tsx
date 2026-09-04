import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CommercialOrderIntakePanel } from "./CommercialOrderIntakePanel";

const apiMocks = vi.hoisted(() => ({
  handoffs: vi.fn(),
  customers: vi.fn(),
  orders: vi.fn(),
}));

vi.mock("#/api/crm", () => ({ listCrmOrderHandoffs: apiMocks.handoffs }));
vi.mock("#/api/order-management", () => ({
  getOrderErrorMessage: (_error: unknown, fallback: string) => fallback,
  listCommercialOrders: apiMocks.orders,
  listEligibleCustomerCompanies: apiMocks.customers,
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="#test">{children}</a>,
  useNavigate: () => vi.fn(),
}));
vi.mock("./LabJobDetailsDialog", () => ({
  LabJobDetailsDialog: ({ open, sourceHandoff }: { open: boolean; sourceHandoff?: { requestNumber: string } | null }) =>
    open ? <div role="dialog">{sourceHandoff ? `Start ${sourceHandoff.requestNumber}` : "New Customer order"}</div> : null,
}));

describe("Commercial order intake CRM handoffs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.customers.mockResolvedValue([{ id: "customer-1", name: "Example Customer" }]);
    apiMocks.orders.mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 });
    apiMocks.handoffs.mockResolvedValue([{
      handoff: {
        id: "handoff-1",
        companyId: "company-1",
        opportunityId: "opportunity-1",
        type: "CustomWork",
        relationshipRequestId: "request-1",
        requestNumber: "PRQ-100",
        status: "Approved",
        requestedOrganizationKind: "Customer",
        organizationId: "customer-1",
        idempotencyKey: "handoff-key",
        createdAt: "2026-08-28T12:00:00Z",
        orderId: null,
        orderNumber: null,
        orderStatus: null,
        canStartCustomerOrder: true,
        orderBlockingReason: null,
      },
      companyName: "Example Company",
      opportunityName: "PSeq program",
      organizationName: "Example Customer",
      summary: "Approved custom PSeq scope.",
    }]);
  });

  it("starts pricing from the approved immutable handoff instead of a free Customer choice", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <CommercialOrderIntakePanel
          apiEnabled
          mock={false}
          userId="user-1"
          organizations={[{ id: "customer-1", name: "Example Customer" }]}
        />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("PRQ-100")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start Customer order" }));

    expect(screen.getByRole("dialog").textContent).toBe("Start PRQ-100");
  });

  it("shows active pricing work in the same intake queue", async () => {
    apiMocks.handoffs.mockResolvedValue([]);
    apiMocks.orders.mockResolvedValue({
      items: [{
        id: "order-1",
        orderType: "PSeqLabService",
        number: "JOB-1001",
        status: "QuoteInPreparation",
        reference: "Johns Hopkins pilot",
        organizationId: "customer-1",
        createdAt: "2026-09-03T10:00:00Z",
        updatedAt: "2026-09-03T11:00:00Z",
        version: 3,
        tenantSafeReason: null,
        assignedToUserId: "user-1",
        dueAt: null,
        isOverdue: false,
        proposedUnitPrice: 120,
        proposedCurrency: "USD",
      }],
      page: 1,
      pageSize: 100,
      totalCount: 1,
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <CommercialOrderIntakePanel
          apiEnabled
          mock={false}
          userId="user-1"
          organizations={[{ id: "customer-1", name: "Johns Hopkins University" }]}
        />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("link", { name: "Johns Hopkins pilot" })).toBeTruthy();
    expect(screen.getByText(/JOB-1001 · Johns Hopkins University/)).toBeTruthy();
    expect(screen.getByText("Quote In Preparation")).toBeTruthy();
    expect(screen.getByText("Price proposed · $120.00 per specimen")).toBeTruthy();
    expect(apiMocks.orders).toHaveBeenCalledWith({ activeIntake: true, pageSize: 100 });
  });

  it("does not present a failed intake request as an empty queue", async () => {
    apiMocks.handoffs.mockResolvedValue([]);
    apiMocks.orders.mockRejectedValue(new Error("Orders unavailable"));
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={client}>
        <CommercialOrderIntakePanel
          apiEnabled
          mock={false}
          userId="user-1"
          organizations={[
            { id: "customer-1", name: "Example Customer" },
          ]}
        />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText("Commercial intake could not be loaded"),
    ).toBeTruthy();
    expect(
      screen.queryByText("No commercial intake work is awaiting action."),
    ).toBeNull();
  });
});
