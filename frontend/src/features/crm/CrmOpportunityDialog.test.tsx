import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CrmPipeline } from "#/api/crm";
import { listCrmOwners, listCrmCompanies, listCrmOpportunityDepartments } from "#/api/crm";
import { CrmOpportunityDialog } from "./CrmOpportunityDialog";

vi.mock("#/api/crm", async importOriginal => ({ ...await importOriginal<typeof import("#/api/crm")>(),
  listCrmOwners: vi.fn(),
  listCrmCompanies: vi.fn(),
  listCrmOpportunityDepartments: vi.fn(),
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
  it("searches the directory and requires a Department when the Company has multiple choices", async () => {
    vi.mocked(listCrmOwners).mockResolvedValue([]);
    vi.mocked(listCrmCompanies).mockResolvedValue({ items: [{ id: "beyond-first-page", name: "Large directory Company", domainName: "large.example.test" }] } as Awaited<ReturnType<typeof listCrmCompanies>>);
    vi.mocked(listCrmOpportunityDepartments).mockResolvedValue([{ id: "research", name: "Research" }, { id: "oncology", name: "Oncology" }]);
    const onSubmit = vi.fn();
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CrmOpportunityDialog open pipelines={[pipeline]} pending={false} onOpenChange={vi.fn()} onSubmit={onSubmit} />
    </QueryClientProvider>);
    fireEvent.change(screen.getByRole("combobox", { name: "Company" }), { target: { value: "Large directory" } });
    await waitFor(() => expect(listCrmCompanies).toHaveBeenCalledWith(expect.objectContaining({ search: "Large directory" })));
    fireEvent.click(await screen.findByRole("option", { name: /Large directory Company/ }));
    const department = await screen.findByRole("combobox", { name: "Department" });
    expect(department).toHaveProperty("required", true);
    expect(department).toHaveProperty("value", "");
    expect(listCrmOpportunityDepartments).toHaveBeenCalledWith("beyond-first-page");
    fireEvent.change(screen.getByRole("textbox", { name: "Opportunity name" }), { target: { value: "Evaluate RNA" } });
    fireEvent.click(screen.getByRole("button", { name: "Create opportunity" }));
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(department, { target: { value: "oncology" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Create opportunity" })).toHaveProperty("disabled", false));
    fireEvent.click(screen.getByRole("button", { name: "Create opportunity" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ companyId: "beyond-first-page", departmentId: "oncology" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Company" }), { target: { value: "Another Company" } });
    expect(screen.queryByRole("combobox", { name: "Department" })).toBeNull();
  });
  it("uses the product domain and keeps the Owner control within the modal", () => {
    vi.mocked(listCrmOwners).mockResolvedValue([]);
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
