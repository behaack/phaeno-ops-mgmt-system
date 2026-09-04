import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LabJobDetailsDialog } from "./LabJobDetailsDialog";

const api = vi.hoisted(() => ({
  createLabOrder: vi.fn(),
}));

vi.mock("#/api/order-management", async (importOriginal) => {
  const original = await importOriginal<typeof import("#/api/order-management")>();
  return {
    ...original,
    createLabOrder: api.createLabOrder,
  };
});

vi.mock("#/features/auth/session-context", () => ({
  usePhaenoSession: () => ({
    authProvider: "clerk",
    session: {
      capabilities: {
        canCreateLabServiceRequests: true,
      },
    },
  }),
}));

describe("LabJobDetailsDialog price proposal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.createLabOrder.mockResolvedValue({ id: "order-1" });
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

    fireEvent.change(screen.getByLabelText("Job name"), { target: { value: "Hopkins pilot" } });
    fireEvent.change(screen.getByLabelText("Biological source for source group 1"), { target: { value: "Human PBMCs" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Propose a price/ }));
    fireEvent.change(screen.getByLabelText("Proposed price per specimen"), { target: { value: "120.50" } });
    fireEvent.change(screen.getByLabelText(/Pricing note/), { target: { value: "Sales-discussed pilot rate." } });
    fireEvent.change(screen.getByLabelText("Storage requirements"), { target: { value: "Ship frozen." } });
    fireEvent.change(screen.getByLabelText("Safety declaration"), { target: { value: "No known hazards." } });
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
