import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HandoffDialog } from "./CrmCompanyRelationships";

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
