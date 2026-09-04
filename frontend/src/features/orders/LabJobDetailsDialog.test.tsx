import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LabJobDetailsDialog } from "./LabJobDetailsDialog";

const api = vi.hoisted(() => ({
  createLabOrder: vi.fn(),
  initiateCustomerLabOrder: vi.fn(),
  listDepartments: vi.fn(),
}));

vi.mock("#/api/organization-management", async (importOriginal) => ({
  ...await importOriginal<typeof import("#/api/organization-management")>(),
  listDepartments: api.listDepartments,
}));

vi.mock("#/api/order-management", async (importOriginal) => {
  const original = await importOriginal<typeof import("#/api/order-management")>();
  return {
    ...original,
    createLabOrder: api.createLabOrder,
    initiateCustomerLabOrder: api.initiateCustomerLabOrder,
  };
});

vi.mock("#/features/auth/session-context", () => ({
  usePhaenoSession: () => ({
    authProvider: "clerk",
    session: {
      capabilities: {
        canCreateLabServiceRequests: true,
        canQuoteLabServiceWork: true,
      },
    },
  }),
}));

describe("LabJobDetailsDialog price proposal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.createLabOrder.mockResolvedValue({ id: "order-1" });
  });

  it("sends the explicitly selected Customer department when staff start pricing", async () => {
    api.listDepartments.mockResolvedValue([
      { id: 'general', name: 'General', isDefault: true },
      { id: 'research', name: 'Research', isDefault: false },
    ]);
    api.initiateCustomerLabOrder.mockResolvedValue({ id: 'order-2' });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><LabJobDetailsDialog open onOpenChange={vi.fn()} onSaved={vi.fn()}
      platformOrganizations={[{ id: 'customer', name: 'Atlas Research' }]}
      sourceHandoff={{ requestId: 'request', requestNumber: 'REQ-1', organizationId: 'customer', organizationName: 'Atlas Research' }}
    /></QueryClientProvider>);
    const department = await screen.findByRole('combobox', { name: 'Department' });
    await waitFor(() => expect(department).toHaveProperty('value', 'general'));
    fireEvent.change(department, { target: { value: 'research' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Job name' }), { target: { value: 'Research job' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Biological source for source group 1' }), { target: { value: 'RNA' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Storage requirements' }), { target: { value: 'Frozen' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Safety declaration' }), { target: { value: 'No hazard' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /I confirm/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Start pricing' }));
    await waitFor(() => expect(api.initiateCustomerLabOrder).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 'customer', departmentId: 'research' })));
  });

  it("submits an optional USD price proposal with the job scope", async () => {
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
    fireEvent.change(screen.getByRole("textbox", { name: "Biological source for source group 1" }), { target: { value: "Human PBMCs" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Propose a price/ }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Proposed price per specimen" }), { target: { value: "120.50" } });
    fireEvent.change(screen.getByLabelText(/Pricing note/), { target: { value: "Sales-discussed pilot rate." } });
    fireEvent.change(screen.getByRole("textbox", { name: "Storage requirements" }), { target: { value: "Ship frozen." } });
    fireEvent.change(screen.getByRole("textbox", { name: "Safety declaration" }), { target: { value: "No known hazards." } });
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));

    await waitFor(() => expect(api.createLabOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        customerReference: "Hopkins pilot",
        proposedUnitPrice: 120.5,
        priceProposalNote: "Sales-discussed pilot rate.",
        requestedSpecimenCount: 1,
      }),
    ));
  });
});
