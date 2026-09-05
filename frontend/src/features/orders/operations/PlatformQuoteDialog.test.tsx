import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PlatformQuoteDialog } from "./PlatformQuoteDialog";

const api = vi.hoisted(() => ({
  getPlatformOrder: vi.fn(),
  isOrderConcurrencyError: vi.fn(),
  issuePlatformQuote: vi.fn(),
}));

vi.mock("#/api/order-management", () => ({
  getOrderErrorMessage: (_error: unknown, fallback: string) => fallback,
  getPlatformOrder: api.getPlatformOrder,
  isOrderConcurrencyError: api.isOrderConcurrencyError,
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
    api.getPlatformOrder.mockResolvedValue({ version: 7 });
    api.isOrderConcurrencyError.mockReturnValue(false);
    api.issuePlatformQuote.mockResolvedValue({});
  });

  it("binds the required PSeq Lab Service line to the committed sample count", async () => {
    renderDialog([canonicalItem]);

    const catalog = screen.getByLabelText(/Commercial catalog item/);
    expect(catalog).toHaveProperty("value", canonicalItem.id);
    expect(catalog).toHaveProperty("disabled", true);
    expect(screen.queryByText("pseq-lab-service")).toBeNull();
    expect(
      screen.getByText(
        "Priced per specimen · quantity set from the committed specimen count",
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText(/Quantity/)).toHaveProperty("value", "3");
    expect(screen.getByLabelText(/Quantity/)).toHaveProperty("readOnly", true);
    expect(screen.getByText("Current pre-tax total")).toBeTruthy();
    expect(screen.getByText("$375.00")).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Quantity/), {
      target: { value: "2" },
    });
    expect(screen.getByText("$250.00")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Issue quote" }));

    expect(
      await screen.findByText(
        "The PSeq Lab Service quantity must equal the committed sample count of 3.",
      ),
    ).toBeTruthy();
    expect(api.issuePlatformQuote).not.toHaveBeenCalled();
  });

  it("uses user-facing per-unit guidance for optional quote lines", () => {
    renderDialog([canonicalItem, unrelatedSpecimenItem]);

    fireEvent.click(screen.getByRole("button", { name: "Add quote line" }));
    const catalogItems = screen.getAllByLabelText(/Commercial catalog item/);
    fireEvent.change(catalogItems[1], {
      target: { value: unrelatedSpecimenItem.id },
    });

    expect(
      screen.getByText("Priced per unit · set the quantity for this quote"),
    ).toBeTruthy();
    expect(screen.queryByText("specimen-handling-fee")).toBeNull();
    expect(
      within(catalogItems[1]).getByRole("option", { name: "Specimen handling fee" }),
    ).toBeTruthy();
  });

  it("pauses quote issuance when the canonical catalog item is unavailable", () => {
    renderDialog([unrelatedSpecimenItem]);

    expect(screen.getByText("PSeq Lab Service item is not ready")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Issue quote" })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("starts from the proposed price and can approve it when issuing the quote", async () => {
    renderDialog([canonicalItem], { unitPrice: 120, currency: "USD", note: "Pilot pricing." });

    expect(screen.getByText("Review proposed laboratory price")).toBeTruthy();
    expect(screen.getByText("Pilot pricing.")).toBeTruthy();
    expect(screen.getByText("Calculated automatically")).toBeTruthy();
    expect(screen.getByText(/otherwise calculated at invoicing/)).toBeTruthy();
    expect(screen.getByLabelText(/Unit price/)).toHaveProperty("value", "120");

    fireEvent.click(screen.getByRole("button", { name: "Approve price and issue quote" }));

    await waitFor(() => expect(api.issuePlatformQuote).toHaveBeenCalledWith(
      "lab",
      "22222222-2222-4222-8222-222222222222",
      expect.objectContaining({
        version: 7,
        tax: 0,
        pricingDecisionReason: null,
        lines: [expect.objectContaining({ unitPrice: 120, quantity: 3 })],
      }),
    ));
    expect(api.getPlatformOrder).toHaveBeenCalledWith(
      "lab",
      "22222222-2222-4222-8222-222222222222",
    );
  });

  it("requires an internal reason when the reviewer amends a proposed price", async () => {
    renderDialog([canonicalItem], { unitPrice: 120, currency: "USD" });
    fireEvent.change(screen.getByLabelText(/Unit price/), { target: { value: "125" } });
    fireEvent.click(screen.getByRole("button", { name: "Amend price and issue quote" }));

    expect(await screen.findByText("Explain why the proposed price was amended.")).toBeTruthy();
    expect(api.issuePlatformQuote).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Amendment reason/), {
      target: { value: "Catalog price applies to this scope." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Amend price and issue quote" }));

    await waitFor(() => expect(api.issuePlatformQuote).toHaveBeenCalledWith(
      "lab",
      "22222222-2222-4222-8222-222222222222",
      expect.objectContaining({
        pricingDecisionReason: "Catalog price applies to this scope.",
        lines: [expect.objectContaining({ unitPrice: 125 })],
      }),
    ));
  });

  it("refreshes a stale Job while preserving the entered quote", async () => {
    const concurrencyError = new Error("stale");
    const onSaved = vi.fn().mockResolvedValue(undefined);
    api.isOrderConcurrencyError.mockImplementation(
      (error) => error === concurrencyError,
    );
    api.issuePlatformQuote.mockRejectedValueOnce(concurrencyError);
    renderDialog([canonicalItem], undefined, onSaved);
    fireEvent.change(screen.getByLabelText(/Unit price/), {
      target: { value: "150" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Issue quote" }));

    expect(await screen.findByText(/The latest Job was loaded/)).toBeTruthy();
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/Unit price/)).toHaveProperty("value", "150");
  });

  it.each(["Cancel", "Close", "Escape"])("protects dirty quote entries when dismissed using %s", async (action) => {
    const onOpenChange = vi.fn();
    renderDialog([canonicalItem], undefined, undefined, onOpenChange);
    fireEvent.change(screen.getByLabelText(/Unit price/), { target: { value: "150" } });

    if (action === "Escape") fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    else fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${action}$`) }));

    expect(await screen.findByText("Discard your unsaved quote changes?")).toBeTruthy();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.getByLabelText(/Unit price/)).toHaveProperty("value", "150");
    expect(screen.getByRole("button", { name: "Issue quote" })).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.queryByText("Discard your unsaved quote changes?")).toBeNull();
    expect(screen.getByLabelText(/Unit price/)).toHaveProperty("value", "150");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(api.issuePlatformQuote).not.toHaveBeenCalled();
  });

  it("closes an untouched quote without a discard prompt", () => {
    const onOpenChange = vi.fn();
    renderDialog([canonicalItem], undefined, undefined, onOpenChange);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByText("Discard your unsaved quote changes?")).toBeNull();
  });

  it("blocks dismissal and editing until quote issuance and refresh finish", async () => {
    let finishIssue!: (value: object) => void;
    let finishRefresh!: () => void;
    api.issuePlatformQuote.mockReturnValue(new Promise((resolve) => { finishIssue = resolve; }));
    const onSaved = vi.fn(() => new Promise<void>((resolve) => { finishRefresh = resolve; }));
    const onOpenChange = vi.fn();
    renderDialog([canonicalItem], undefined, onSaved, onOpenChange);
    fireEvent.change(screen.getByLabelText(/Unit price/), { target: { value: "150" } });
    fireEvent.click(screen.getByRole("button", { name: "Issue quote" }));
    await waitFor(() => expect(api.issuePlatformQuote).toHaveBeenCalledTimes(1));

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveProperty("disabled", true);
    expect(screen.queryByRole("button", { name: /^Close$/ })).toBeNull();
    expect(screen.getByLabelText(/Unit price/).matches(":disabled")).toBe(true);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onOpenChange).not.toHaveBeenCalled();
    await act(async () => { finishIssue({}); });
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onOpenChange).not.toHaveBeenCalled();
    await act(async () => { finishRefresh(); });
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(screen.queryByText("Discard your unsaved quote changes?")).toBeNull();
  });

  it("restores focus to the action that opened the quote", async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return <>
        <button type="button" onClick={() => setOpen(true)}>Review quote</button>
        <PlatformQuoteDialog open={open} workflow="lab" recordId="record-1" defaultQuantity={3} catalogItems={[canonicalItem]} onOpenChange={setOpen} onSaved={vi.fn().mockResolvedValue(undefined)} />
      </>;
    }
    const client = new QueryClient();
    render(<QueryClientProvider client={client}><Harness /></QueryClientProvider>);
    const opener = screen.getByRole("button", { name: "Review quote" });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.change(screen.getByLabelText(/Unit price/), { target: { value: "150" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });
});

function renderDialog(
  catalogItems: Array<typeof canonicalItem>,
  priceProposal?: { unitPrice: number; currency: string; note?: string | null },
  onSaved = vi.fn().mockResolvedValue(undefined),
  onOpenChange = vi.fn(),
) {
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
        defaultQuantity={3}
        priceProposal={priceProposal}
        catalogItems={catalogItems}
        onOpenChange={onOpenChange}
        onSaved={onSaved}
      />
    </QueryClientProvider>,
  );
}
