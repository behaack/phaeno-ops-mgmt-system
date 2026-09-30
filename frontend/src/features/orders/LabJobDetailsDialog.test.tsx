import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    session: {
      capabilities: {
        canCreateLabServiceRequests: true,
        canQuoteLabServiceWork: true,
      },
    },
  }),
}));

describe("LabJobDetailsDialog request submission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getCustomerOrderReadiness.mockResolvedValue({ canStartPricing: true, startPricingBlockers: [], quoteBlockers: [], invoiceBlockers: [] });
    api.createLabOrder.mockResolvedValue({ id: "order-1" });
    api.listLabOrderSampleTypes.mockResolvedValue([{ id: '22222222-2222-4222-8222-222222222221', name: 'PSeq Total RNA', revision: 4 }]);
  });

  it("clears the selected Customer and its readiness before choosing another", async () => {
    api.listCustomerOrderDepartments.mockImplementation(async (organizationId: string) =>
      organizationId === 'customer-a'
        ? [{ id: 'general-a', name: 'General A', isDefault: true }]
        : [{ id: 'general-b', name: 'General B', isDefault: true }]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><LabJobDetailsDialog open onOpenChange={vi.fn()} onSaved={vi.fn()}
      platformOrganizations={[{ id: 'customer-a', name: 'Atlas Research' }, { id: 'customer-b', name: 'Borealis Labs' }]}
    /></QueryClientProvider>);

    const customer = screen.getByRole('combobox', { name: 'Customer' });
    fireEvent.change(screen.getByRole('textbox', { name: 'Job name' }), { target: { value: 'Retained job' } });
    fireEvent.focus(customer);
    fireEvent.click(screen.getByRole('option', { name: 'Atlas Research' }));
    const ready = await screen.findByText('Ready to start pricing');
    expect(await screen.findByText('General A')).toBeTruthy();
    expect(within(ready.closest('[data-slot="alert"]') as HTMLElement).getByRole('button', { name: 'Refresh readiness' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Clear Customer' }));
    expect(customer).toHaveProperty('value', '');
    expect(document.activeElement).toBe(customer);
    expect(screen.queryByText('General A')).toBeNull();
    expect(screen.queryByText('Ready to start pricing')).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Job name' })).toHaveProperty('value', 'Retained job');

    fireEvent.click(screen.getByRole('option', { name: 'Borealis Labs' }));
    expect(await screen.findByText('General B')).toBeTruthy();
    await waitFor(() => expect(api.getCustomerOrderReadiness).toHaveBeenLastCalledWith('customer-b', 'general-b'));
  });

  it("sends the explicitly selected Customer department when staff start pricing", async () => {
    api.listCustomerOrderDepartments.mockResolvedValue([
      { id: 'general', name: 'General', isDefault: true },
      { id: 'research', name: 'Research', isDefault: false },
    ]);
    api.initiateCustomerLabOrder.mockResolvedValue({ id: 'order-2' });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><LabJobDetailsDialog open onOpenChange={vi.fn()} onSaved={vi.fn()}
      platformOrganizations={[{ id: 'customer', name: 'Atlas Research' }]}
      sourceHandoff={{ requestId: 'request', requestNumber: 'REQ-1', organizationId: 'customer', organizationName: 'Atlas Research' }}
    /></QueryClientProvider>);
    expect(screen.queryByRole('button', { name: 'Clear Customer' })).toBeNull();
    const department = await screen.findByRole('combobox', { name: 'Department' });
    expect(department).toHaveProperty('value', '');
    expect(api.getCustomerOrderReadiness).not.toHaveBeenCalled();
    await screen.findByRole('option', { name: 'Research' });
    fireEvent.change(department, { target: { value: 'research' } });
    expect(department).toHaveProperty('value', 'research');
    fireEvent.change(screen.getByRole('textbox', { name: 'Job name' }), { target: { value: 'Research job' } });
    await screen.findByRole('option', { name: 'PSeq Total RNA' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Sample type' }), { target: { value: '22222222-2222-4222-8222-222222222221' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Biological source for source group 1' }), { target: { value: 'RNA' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Storage requirements' }), { target: { value: 'Frozen' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Safety declaration' }), { target: { value: 'No hazard' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /I confirm/ }));
    await waitFor(() => expect(api.getCustomerOrderReadiness).toHaveBeenCalledWith('customer', 'research'));
    await screen.findByText('Ready to start pricing');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Start pricing' })).toHaveProperty('disabled', false));
    fireEvent.click(screen.getByRole('button', { name: 'Start pricing' }));
    await waitFor(() => expect(api.initiateCustomerLabOrder).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 'customer', departmentId: 'research', sampleTypeDefinitionId: '22222222-2222-4222-8222-222222222221' })));
  });

  it("keeps a complete draft blocked until Customer readiness can be checked", async () => {
    api.listCustomerOrderDepartments.mockResolvedValue([{ id: 'general', name: 'General', isDefault: true }]);
    api.getCustomerOrderReadiness.mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({
      canStartPricing: false,
      startPricingBlockers: [{ code: 'ManualBlock', label: 'Manual block', nextAction: 'Review the hold.' }],
      quoteBlockers: [], invoiceBlockers: [],
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><LabJobDetailsDialog open onOpenChange={vi.fn()} onSaved={vi.fn()}
      platformOrganizations={[{ id: 'customer', name: 'Atlas Research' }]}
      sourceHandoff={{ requestId: 'request', requestNumber: 'REQ-1', organizationId: 'customer', organizationName: 'Atlas Research' }}
    /></QueryClientProvider>);
    fireEvent.change(screen.getByRole('textbox', { name: 'Job name' }), { target: { value: 'Retained job' } });
    await screen.findByRole('option', { name: 'PSeq Total RNA' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Sample type' }), { target: { value: '22222222-2222-4222-8222-222222222221' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Biological source for source group 1' }), { target: { value: 'Human cells' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Storage requirements' }), { target: { value: 'Frozen' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Safety declaration' }), { target: { value: 'No hazard' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /I confirm/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Retry readiness check' }));
    await screen.findByText('Before starting pricing');
    expect(screen.getByRole('textbox', { name: 'Job name' })).toHaveProperty('value', 'Retained job');
    expect(screen.getByRole('button', { name: 'Start pricing' })).toHaveProperty('disabled', true);
    expect(api.initiateCustomerLabOrder).not.toHaveBeenCalled();
    api.getCustomerOrderReadiness.mockResolvedValue({ canStartPricing: true, startPricingBlockers: [], quoteBlockers: [], invoiceBlockers: [] });
    fireEvent.click(screen.getByRole('button', { name: 'Refresh readiness' }));
    await screen.findByText('Ready to start pricing');
    expect(screen.getByRole('textbox', { name: 'Job name' })).toHaveProperty('value', 'Retained job');
    expect(screen.getByRole('textbox', { name: 'Storage requirements' })).toHaveProperty('value', 'Frozen');
    expect(screen.getByRole('button', { name: 'Start pricing' })).toHaveProperty('disabled', false);
    expect(api.initiateCustomerLabOrder).not.toHaveBeenCalled();
  });

  it("submits the customer scope directly for pricing without a price proposal", async () => {
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
        proposedUnitPrice: undefined,
        priceProposalNote: undefined,
        requestedSpecimenCount: 1,
        sequencingRunCount: 20,
      }),
    ));
  });
});
