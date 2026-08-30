import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CrmCompany } from "#/api/crm";
import { CrmCompanyLifecycleDialog } from "./CrmCompanyLifecycleDialog";

const company: CrmCompany = {
  id: "00000000-0000-0000-0000-000000000101",
  name: "Example Biosciences",
  websiteUrl: null,
  domainName: "example.com",
  phone: null,
  industry: "Biotechnology",
  description: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  region: null,
  postalCode: null,
  countryCode: null,
  employeeCount: null,
  lifecycleState: "Target",
  source: null,
  tags: [],
  aliases: [],
  mergedIntoCompanyId: null,
  ownerUserId: "00000000-0000-0000-0000-000000000201",
  ownerName: "Phaeno Admin",
  isActive: true,
  createdAt: "2026-08-26T12:00:00Z",
  updatedAt: "2026-08-26T12:00:00Z",
  version: 1,
};

describe("CRM Company lifecycle dialog", () => {
  it("explains the consequence boundary before deactivation", () => {
    const onConfirm = vi.fn();
    render(
      <CrmCompanyLifecycleDialog
        company={company}
        isPending={false}
        onConfirm={onConfirm}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/does not change Portal access/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Deactivate company" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
