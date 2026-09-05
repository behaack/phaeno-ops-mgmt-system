import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CrmCompanyFormDialog } from "./CrmCompanyFormDialog";
import { toInput } from "./CrmCompaniesPage";
import type { CrmCompany } from "#/api/crm";

describe("CRM Company form", () => {
  it("keeps Portal access disabled until the Company is approved", () => {
    render(
      <CrmCompanyFormDialog
        open
        company={null}
        isPending={false}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: "New company" })).toBeTruthy();
    expect(
      screen.getByText(/Portal access remains disabled until a reviewed request is approved/),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-slot="required-legend"]')?.textContent,
    ).toContain("Required");
    expect(screen.queryByRole("textbox", { name: "Domain" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Additional details/ }));
    expect(screen.getByRole("textbox", { name: "Domain" })).toBeTruthy();
  });

  it("requires a company name and validates web addresses", async () => {
    const onSubmit = vi.fn();
    render(
      <CrmCompanyFormDialog
        open
        company={null}
        isPending={false}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("Website"), {
      target: { value: "example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create company" }));

    expect(await screen.findByText("Enter a company name.")).toBeTruthy();
    expect(
      await screen.findByText("Enter a complete http:// or https:// address."),
    ).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("describes editing without claiming an existing Company's enabled access is disabled", () => {
    const company: CrmCompany = {
      id: "company-1", name: "Existing Research Company", websiteUrl: null, domainName: null,
      phone: null, industry: null, description: null, addressLine1: null, addressLine2: null,
      city: null, region: null, postalCode: null, countryCode: null, employeeCount: null,
      lifecycleState: "ActiveCustomer", source: null, tags: [], aliases: [], mergedIntoCompanyId: null,
      ownerUserId: "owner-1", ownerName: "Phaeno Owner", accessOrganizationId: "organization-1",
      portalRelationship: "Customer", portalReadiness: "Ready", portalAccessStatus: "Enabled",
      isActive: true, createdAt: "2026-09-01T12:00:00Z", updatedAt: "2026-09-01T12:00:00Z", version: 1,
    };
    render(<CrmCompanyFormDialog open company={company} isPending={false} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Edit company" })).toBeTruthy();
    expect(screen.getByText("Update this Company’s details. Manage Portal access through reviewed Company requests.")).toBeTruthy();
    expect(screen.queryByText(/This creates the customer Company/)).toBeNull();
    expect(screen.queryByText(/Portal access remains disabled/)).toBeNull();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeTruthy();
  });

  it("derives a normalized domain when Website is provided without one", () => {
    expect(
      toInput({
        name: "Example Labs",
        websiteUrl: "https://www.Example.com/research",
        domainName: "",
        phone: "",
        industry: "",
        description: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        region: "",
        postalCode: "",
        countryCode: "",
        employeeCount: "",
        lifecycleState: "Target",
        source: "",
        tags: "",
      }).domainName,
    ).toBe("example.com");
  });
});
