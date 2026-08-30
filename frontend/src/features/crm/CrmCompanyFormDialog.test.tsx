import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CrmCompanyFormDialog } from "./CrmCompanyFormDialog";

describe("CRM Company form", () => {
  it("identifies the record as separate from Portal access", () => {
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
      screen.getByText(/does not create a Portal account or grant access/),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-slot="required-legend"]')?.textContent,
    ).toContain("Required");
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
});
