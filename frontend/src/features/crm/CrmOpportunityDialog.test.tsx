import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CrmPipeline } from "#/api/crm";
import { listPhaenoUsers } from "#/api/organization-management";
import { CrmOpportunityDialog } from "./CrmOpportunityDialog";

vi.mock("#/api/organization-management", () => ({
  listPhaenoUsers: vi.fn(),
}));

const pipeline: CrmPipeline = {
  id: "pipeline-1",
  name: "General Sales",
  description: null,
  isDefault: true,
  isActive: true,
  stages: [],
  version: 1,
};

describe("CRM Opportunity dialog", () => {
  it("uses the product domain and keeps the Owner control within the modal", () => {
    vi.mocked(listPhaenoUsers).mockResolvedValue([]);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={client}>
        <CrmOpportunityDialog
          open
          companies={[]}
          pipelines={[pipeline]}
          pending={false}
          onOpenChange={vi.fn()}
          onSubmit={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(
      screen.getByText(/Opportunity Number is assigned automatically/i),
    ).toBeTruthy();
    const product = screen.getByLabelText("Product interest");
    expect(product.tagName).toBe("SELECT");
    expect(screen.getByRole("option", { name: "PSeq Lab Service" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "PSeq Kit" })).toBeTruthy();
    expect(screen.getByLabelText("Owner").className).toContain("w-full");
    expect(screen.getByLabelText("Owner").className).toContain("min-w-0");
  });
});
