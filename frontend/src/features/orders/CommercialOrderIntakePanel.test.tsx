import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CommercialOrderIntakePanel } from "./CommercialOrderIntakePanel";

const apiMocks = vi.hoisted(() => ({
  handoffs: vi.fn(),
  customers: vi.fn(),
}));

vi.mock("#/api/crm", () => ({ listCrmOrderHandoffs: apiMocks.handoffs }));
vi.mock("#/api/order-management", () => ({
  getOrderErrorMessage: (_error: unknown, fallback: string) => fallback,
  listEligibleCustomerOrganizations: apiMocks.customers,
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
        <CommercialOrderIntakePanel apiEnabled mock={false} />
      </QueryClientProvider>,
    );

    expect(await screen.findByText("PRQ-100")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start Customer order" }));

    expect(screen.getByRole("dialog").textContent).toBe("Start PRQ-100");
  });
});
