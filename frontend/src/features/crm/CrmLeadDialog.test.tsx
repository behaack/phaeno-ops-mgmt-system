import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { CrmLeadDialog } from "./CrmLeadDialog";

describe("CRM lead dialog", () => {
  it("captures a standalone individual lead without creating downstream records", () => {
    const onSubmit = vi.fn();
    renderDialog(
      <CrmLeadDialog
        open
        pending={false}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText(/before creating durable Company/)).toBeTruthy();
    expect(screen.getByText("* Required")).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Display name/), {
      target: { value: " Ada Lovelace " },
    });
    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Ada" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create lead" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "Individual",
        displayName: "Ada Lovelace",
        firstName: "Ada",
        email: "ada@example.com",
      }),
    );
  });

  it("makes Company name required when the lead represents an organization", async () => {
    renderDialog(
      <CrmLeadDialog
        open
        pending={false}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Lead type"), {
      target: { value: "Company" },
    });

    await waitFor(() =>
      expect(
        screen.getByLabelText(/Company name/).getAttribute("required"),
      ).not.toBeNull(),
    );
  });
});

function renderDialog(dialog: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{dialog}</QueryClientProvider>,
  );
}
