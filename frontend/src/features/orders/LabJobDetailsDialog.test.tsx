import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LabJobDetailsDialog } from "./LabJobDetailsDialog";

const api = vi.hoisted(() => ({
  createLabOrder: vi.fn(),
  initiateCustomerLabOrder: vi.fn(),
  listCustomerOrderDepartments: vi.fn(),
  getCustomerOrderReadiness: vi.fn(),
  listLabOrderSampleTypes: vi.fn(),
}));

vi.mock("#/api/order-management", async (importOriginal) => {
  const original = await importOriginal<typeof import("#/api/order-management")>();
  return {
    ...original,
    listCustomerOrderDepartments: api.listCustomerOrderDepartments,
    getCustomerOrderReadiness: api.getCustomerOrderReadiness,
    listLabOrderSampleTypes: api.listLabOrderSampleTypes,
    createLabOrder: api.createLabOrder,
    initiateCustomerLabOrder: api.initiateCustomerLabOrder,
  };
});

vi.mock("#/features/auth/session-context", () => ({
  usePhaenoSession: () => ({
    authProvider: "clerk",
    selectedOrganizationId: 'partner-organization',
    session: {
      memberships: [{ organizationId: 'partner-organization', organizationKind: 'Partner' }],
      capabilities: {
        canCreateLabServiceRequests: true,
        canQuoteLabServiceWork: true,
      },
    },
  }),
}));

describe("Partner LabJobDetailsDialog request submission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getCustomerOrderReadiness.mockResolvedValue({ canStartPricing: true, startPricingBlockers: [], quoteBlockers: [], invoiceBlockers: [] });
    api.createLabOrder.mockResolvedValue({ id: "order-1" });
    api.listLabOrderSampleTypes.mockResolvedValue([{ id: '22222222-2222-4222-8222-222222222221', name: 'PSeq Total RNA', revision: 4 }]);
  });

  it("submits Partner scope directly for pricing without a price proposal", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <LabJobDetailsDialog
          open
          onOpenChange={vi.fn()}
          onSaved={vi.fn()}
        />
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Job name" }), { target: { value: "Hopkins pilot" } });
    await screen.findByRole('option', { name: 'PSeq Total RNA' });
    fireEvent.change(screen.getByRole("combobox", { name: "Sample type" }), { target: { value: "22222222-2222-4222-8222-222222222221" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Biological source for source group 1" }), { target: { value: "Human PBMCs" } });
    expect(screen.queryByRole("checkbox", { name: /Propose a price/ })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Submit lab service request" })).toBeTruthy();
    expect(screen.getByText(/pricing for you to accept or decline/)).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox", { name: "Storage requirements" }), { target: { value: "Ship frozen." } });
    fireEvent.change(screen.getByRole("textbox", { name: "Safety declaration" }), { target: { value: "No known hazards." } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Sample-sequencing runs" }), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit request" }));

    await waitFor(() => expect(api.createLabOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        customerReference: "Hopkins pilot",
        sampleTypeDefinitionId: "22222222-2222-4222-8222-222222222221",
        submitForPricing: true,
        requestedSpecimenCount: 1,
        sequencingRunCount: 20,
      }),
    ));
  });
});
