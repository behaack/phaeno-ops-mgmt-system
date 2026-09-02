import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HandoffDialog } from "./CrmCompanyRelationships";

describe("Company request dialog", () => {
  it("shows only the fields relevant to the selected request category and type", () => {
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
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Create Company request" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("combobox", { name: "Requested relationship" }),
    ).toBeTruthy();
    expect(
      screen.getByLabelText("Requested products and services"),
    ).toBeTruthy();
    expect(screen.queryByLabelText("Opportunity")).toBeNull();

    fireEvent.change(screen.getByRole("combobox", { name: "Request category" }), {
      target: { value: "Work" },
    });
    expect(
      (screen.getByRole("combobox", { name: "Request type" }) as HTMLSelectElement).value,
    ).toBe("TrialProject");
    expect(screen.getByLabelText("Opportunity")).toBeTruthy();

    fireEvent.change(screen.getByRole("combobox", { name: "Request category" }), {
      target: { value: "Relationship" },
    });
    expect(
      screen.getByRole("combobox", { name: "Requested relationship" }),
    ).toBeTruthy();
    expect(
      screen.queryByLabelText("Requested products and services"),
    ).toBeNull();
    expect(screen.queryByLabelText("Opportunity")).toBeNull();

    fireEvent.change(screen.getByRole("combobox", { name: "Request category" }), {
      target: { value: "OnlineAccess" },
    });
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
