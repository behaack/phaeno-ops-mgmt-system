import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PlatformQuoteDialog } from "./PlatformQuoteDialog";

const api = vi.hoisted(() => ({
  issuePlatformQuote: vi.fn(),
}));

vi.mock("#/api/order-management", () => ({
  getOrderErrorMessage: (_error: unknown, fallback: string) => fallback,
  issuePlatformQuote: api.issuePlatformQuote,
}));

const canonicalItem = {
  id: "11111111-1111-4111-8111-111111111111",
  externalItemId: "pseq-lab-service",
  name: "PSeq Lab Service",
  description: "Laboratory service per committed specimen.",
  salesUnit: "specimen",
  basePrice: 125,
  currency: "USD",
  isActive: true,
  isPSeqLabService: true,
  lastSyncedAt: "2026-08-27T12:00:00Z",
  version: 1,
};
const unrelatedSpecimenItem = {
  ...canonicalItem,
  id: "33333333-3333-4333-8333-333333333333",
  externalItemId: "specimen-handling-fee",
  name: "Specimen handling fee",
  isPSeqLabService: false,
};

describe("PlatformQuoteDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("binds the required PSeq Lab Service line to the committed sample count", async () => {
    renderDialog([canonicalItem]);

    const catalog = screen.getByLabelText(/Commercial catalog item/);
    expect(catalog).toHaveProperty("value", canonicalItem.id);
    expect(catalog).toHaveProperty("disabled", true);
    expect(screen.getAllByText("pseq-lab-service").length).toBeGreaterThan(0);
    expect(screen.getByText(/priced per specimen.*required/)).toBeTruthy();
    expect(screen.getByLabelText(/Quantity/)).toHaveProperty("value", "3");

    fireEvent.change(screen.getByLabelText(/Quantity/), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Issue quote" }));

    expect(
      await screen.findByText(
        "The PSeq Lab Service quantity must equal the committed sample count of 3.",
      ),
    ).toBeTruthy();
    expect(api.issuePlatformQuote).not.toHaveBeenCalled();
  });

  it("pauses quote issuance when the canonical catalog item is unavailable", () => {
    renderDialog([unrelatedSpecimenItem]);

    expect(screen.getByText("PSeq Lab Service item is not ready")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Issue quote" })).toHaveProperty(
      "disabled",
      true,
    );
  });
});

function renderDialog(catalogItems: Array<typeof canonicalItem>) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <PlatformQuoteDialog
        open
        workflow="lab"
        recordId="22222222-2222-4222-8222-222222222222"
        version={3}
        defaultQuantity={3}
        catalogItems={catalogItems}
        onOpenChange={vi.fn()}
        onSaved={vi.fn().mockResolvedValue(undefined)}
      />
    </QueryClientProvider>,
  );
}
