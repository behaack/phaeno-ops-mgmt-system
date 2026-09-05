import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CrmCompanyRelationships, HandoffDialog } from "./CrmCompanyRelationships";

const api = vi.hoisted(() => ({
  listCompanyContacts: vi.fn(),
  listCrmOpportunities: vi.fn(),
  listCrmHandoffs: vi.fn(),
}));

vi.mock("#/api/crm", async (importOriginal) => ({
  ...await importOriginal<typeof import("#/api/crm")>(),
  ...api,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, params = {}, search = {}, children, ...props }: {
    to: string;
    params?: Record<string, string>;
    search?: Record<string, string>;
    children: ReactNode;
  }) => {
    const path = Object.entries(params).reduce((result, [key, value]) => result.replace(`$${key}`, value), to);
    const query = new URLSearchParams(search).toString();
    return <a href={`${path}${query ? `?${query}` : ""}`} {...props}>{children}</a>;
  },
}));

describe("Company relationship collections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listCompanyContacts.mockResolvedValue([]);
    api.listCrmOpportunities.mockResolvedValue({ items: [] });
    api.listCrmHandoffs.mockResolvedValue([]);
  });

  it("announces loading without describing pending collections as empty", () => {
    api.listCompanyContacts.mockReturnValue(new Promise(() => {}));
    api.listCrmOpportunities.mockReturnValue(new Promise(() => {}));
    renderRelationships("relationships");

    expect(screen.getByText("Loading contacts…")).toBeTruthy();
    expect(screen.getByText("Loading opportunities…")).toBeTruthy();
    expect(screen.queryByText("No contacts associated.")).toBeNull();
    expect(screen.queryByText("No opportunities recorded.")).toBeNull();
    expect(screen.getByRole("button", { name: "Associate" })).toHaveProperty("disabled", true);
  });

  it("recovers contacts and opportunities separately without false empty states", async () => {
    api.listCompanyContacts.mockRejectedValueOnce(new Error("offline"));
    api.listCrmOpportunities.mockRejectedValueOnce(new Error("offline"));
    renderRelationships("relationships");

    expect(await screen.findByText("Could not load contacts")).toBeTruthy();
    expect(await screen.findByText("Could not load opportunities")).toBeTruthy();
    expect(screen.queryByText("No contacts associated.")).toBeNull();
    expect(screen.queryByText("No opportunities recorded.")).toBeNull();
    expect(screen.getByRole("button", { name: "Associate" })).toHaveProperty("disabled", true);

    fireEvent.click(screen.getByRole("button", { name: "Retry contacts" }));
    expect(await screen.findByText("No contacts associated.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Associate" })).toHaveProperty("disabled", false);
    expect(screen.getByText("Could not load opportunities")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry opportunities" }));
    expect(await screen.findByText("No opportunities recorded.")).toBeTruthy();
  });

  it("retains previously loaded records and explains a failed refresh", async () => {
    api.listCompanyContacts.mockResolvedValueOnce([{ id: "association-1", contactId: "contact-1", contactName: "Avery Scientist", isActive: true }]);
    const { client } = renderRelationships("relationships");
    expect(await screen.findByRole("link", { name: /Avery Scientist/ })).toBeTruthy();
    api.listCompanyContacts.mockRejectedValue(new Error("offline"));

    await act(async () => { await client.invalidateQueries({ queryKey: ["crm-company-contacts", "company-1"] }); });

    expect(await screen.findByText("Could not load contacts")).toBeTruthy();
    expect(screen.getByText(/Previously loaded records are shown/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Avery Scientist/ })).toBeTruthy();
    expect(screen.queryByText("No contacts associated.")).toBeNull();
  });

  it("recovers Company requests and carries the selected request and Company into Trials", async () => {
    api.listCrmHandoffs.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce([
      { id: "request-1", requestNumber: "REQ-1", type: "TrialProject", status: "PendingReview", createdAt: "2026-09-05T10:00:00Z" },
      { id: "request-2", requestNumber: "REQ-2", type: "TrialProject", status: "Applied", trialProjectId: "trial-2", createdAt: "2026-09-05T10:00:00Z" },
    ]);
    renderRelationships("requests");

    expect(await screen.findByText("Could not load Company requests")).toBeTruthy();
    expect(screen.queryByText("No Company requests")).toBeNull();
    expect(screen.getByRole("button", { name: "Create request" })).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("button", { name: "Retry Company requests" }));
    expect(await screen.findByRole("link", { name: "Start Trial" })).toHaveProperty("href", expect.stringContaining("/trial-projects?requestId=request-1&fromCompanyId=company-1"));
    expect(screen.getByRole("link", { name: "Open Trial" })).toHaveProperty("href", expect.stringContaining("/trial-projects/trial-2?fromCompanyId=company-1"));
  });

  it("requires reliable opportunity choices for reviewed work and preserves request entries through retry", async () => {
    api.listCrmOpportunities.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ items: [{ id: "opportunity-1", name: "PSeq evaluation" }] });
    renderRelationships("requests");
    await waitFor(() => expect(screen.getByRole("button", { name: "Create request" })).toHaveProperty("disabled", false));
    fireEvent.click(screen.getByRole("button", { name: "Create request" }));
    expect(screen.getByRole("button", { name: "Create pending request" })).toHaveProperty("disabled", false);
    fireEvent.change(screen.getByRole("combobox", { name: "What does this Company need?" }), { target: { value: "Work" } });
    expect(await screen.findByText("Could not load opportunities")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Summary"), { target: { value: "Evaluate our samples together" } });
    expect(screen.getByLabelText("Opportunity")).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "Create pending request" })).toHaveProperty("disabled", true);
    expect(screen.queryByRole("option", { name: "No specific opportunity" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Retry opportunities" }));
    expect(await screen.findByRole("option", { name: "PSeq evaluation" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create pending request" })).toHaveProperty("disabled", false);
    expect(screen.getByLabelText("Summary")).toHaveProperty("value", "Evaluate our samples together");
  });
});

function renderRelationships(view: "relationships" | "requests") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return { client, ...render(<QueryClientProvider client={client}><CrmCompanyRelationships companyId="company-1" view={view} /></QueryClientProvider>) };
}

describe("Company request dialog", () => {
  it("shows only the fields relevant to the selected request category and type", () => {
    const onSubmit = vi.fn();
    render(
      <HandoffDialog
        open
        opportunities={[
          {
            id: "00000000-0000-0000-0000-000000000101",
            name: "P-Seq evaluation",
          },
        ]}
        pending={false}
        error={null}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Create Company request" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("combobox", { name: "Requested relationship" }),
    ).toBeTruthy();
    expect(
      screen.queryByLabelText("Requested products and services"),
    ).toBeNull();
    expect(screen.queryByLabelText("Opportunity")).toBeNull();
    expect(screen.queryByLabelText("Internal notes")).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Create pending request" }),
    );
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "PortalOnboarding",
        requestedServices: [],
        summary: "Onboarding request",
        internalNotes: null,
      }),
    );

    const category = screen.getByRole("combobox", {
      name: "What does this Company need?",
    });

    fireEvent.change(category, { target: { value: "ProductsAndServices" } });
    expect(
      screen.getByLabelText("Requested products and services"),
    ).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: "Request type" })).toBeNull();

    fireEvent.change(category, { target: { value: "Work" } });
    expect(
      (screen.getByRole("combobox", { name: "Request type" }) as HTMLSelectElement).value,
    ).toBe("TrialProject");
    expect(screen.getByLabelText("Opportunity")).toBeTruthy();

    fireEvent.change(category, { target: { value: "Relationship" } });
    expect(
      screen.getByRole("combobox", { name: "Requested relationship" }),
    ).toBeTruthy();
    expect(
      screen.queryByLabelText("Requested products and services"),
    ).toBeNull();
    expect(screen.queryByLabelText("Opportunity")).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Request type" })).toBeNull();

    fireEvent.change(category, { target: { value: "OnlineAccess" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Request type" }), {
      target: { value: "Offboarding" },
    });
    expect(
      screen.queryByRole("combobox", { name: "Requested relationship" }),
    ).toBeNull();
    expect(
      screen.queryByLabelText("Requested products and services"),
    ).toBeNull();
  });
});
