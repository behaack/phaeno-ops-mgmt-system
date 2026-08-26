import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CrmMergeDialog } from "./CrmMergeDialog";

describe("CRM merge dialog", () => {
  it("requires an explicit target and reason before preserving a merge audit", () => {
    const onSubmit = vi.fn();
    render(
      <CrmMergeDialog
        open
        recordLabel="Company"
        candidates={[{ id: "target-id", name: "Example Biosciences" }]}
        pending={false}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText(/permanent merge audit/)).toBeTruthy();
    expect(screen.getByText("* Required")).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Target record/), {
      target: { value: "target-id" },
    });
    fireEvent.change(screen.getByLabelText(/Merge reason/), {
      target: { value: "Confirmed duplicate after review." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Merge records" }));

    expect(onSubmit).toHaveBeenCalledWith(
      "target-id",
      "Confirmed duplicate after review.",
    );
  });
});
