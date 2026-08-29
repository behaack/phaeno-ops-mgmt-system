import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CrmCompanyContact } from "#/api/crm";
import { CrmCompanyContactEditDialog } from "./CrmCompanyContactEditDialog";

const relationship: CrmCompanyContact = {
  id: "relationship-1",
  companyId: "company-1",
  companyName: "Johns Hopkins University",
  contactId: "contact-1",
  contactName: "Joe Blow",
  jobTitle: "President and CEO",
  relationshipRole: "Decision maker",
  isPrimaryCompany: true,
  effectiveFrom: "2026-08-28",
  effectiveTo: null,
  isActive: true,
  version: 3,
};

describe("CRM Company relationship editor", () => {
  it("edits the shared relationship fields from either record workspace", () => {
    const onSubmit = vi.fn();
    render(
      <CrmCompanyContactEditDialog
        value={relationship}
        pending={false}
        error={null}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "Edit Company relationship" }),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Job title"), {
      target: { value: "Chief Executive Officer" },
    });
    fireEvent.change(screen.getByLabelText("Relationship role"), {
      target: { value: "Executive sponsor" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save relationship" }));

    expect(onSubmit).toHaveBeenCalledWith({
      jobTitle: "Chief Executive Officer",
      relationshipRole: "Executive sponsor",
      isPrimaryCompany: true,
      effectiveFrom: "2026-08-28",
      effectiveTo: null,
    });
  });
});
