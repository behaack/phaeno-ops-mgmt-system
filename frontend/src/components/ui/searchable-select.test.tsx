import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Label } from "#/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "#/components/ui/dialog";
import { SearchableSelect } from "#/components/ui/searchable-select";

describe("SearchableSelect", () => {
  it("closes choices before dismissing the containing dialog with Escape", () => {
    const onOpenChange = vi.fn();
    render(<Dialog open onOpenChange={onOpenChange}><DialogContent>
      <DialogTitle>Select a request</DialogTitle><DialogDescription>Choose an eligible request.</DialogDescription>
      <Label htmlFor="escape-choice">Request</Label>
      <SearchableSelect id="escape-choice" options={[{ value: "request-1", label: "Request one" }]} value="" onValueChange={vi.fn()} placeholder="Search" emptyMessage="No requests." />
    </DialogContent></Dialog>);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    expect(screen.getByRole("listbox")).toBeTruthy();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
  it("returns option focus to the input on Escape before allowing dialog dismissal", () => {
    const onOpenChange = vi.fn();
    const onEscapeKeyDown = vi.fn();
    const onValueChange = vi.fn();
    render(<Dialog open onOpenChange={onOpenChange}><DialogContent onEscapeKeyDown={onEscapeKeyDown}>
      <DialogTitle>Select a request</DialogTitle><DialogDescription>Choose an eligible request.</DialogDescription>
      <Label htmlFor="option-escape-choice">Request</Label>
      <SearchableSelect id="option-escape-choice" options={[{ value: "request-1", label: "Request one" }]} value="request-1" onValueChange={onValueChange} placeholder="Search" emptyMessage="No requests." />
    </DialogContent></Dialog>);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    act(() => input.focus());
    const option = screen.getByRole("option", { name: "Request one" });
    act(() => option.focus());
    expect(document.activeElement).toBe(option);
    fireEvent.keyDown(option, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe("Request one");
    expect(onValueChange).not.toHaveBeenCalled();
    expect(onEscapeKeyDown).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onEscapeKeyDown).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
  it("uses workflow-specific messages and exposes its control for validation focus", () => {
    const ref = vi.fn();
    render(<>
      <Label htmlFor="trial-choice">Trial request</Label>
      <SearchableSelect id="trial-choice" value="" onValueChange={vi.fn()}
        options={Array.from({ length: 51 }, (_, index) => ({ value: String(index), label: `Request ${index}` }))}
        placeholder="Find a request" emptyMessage="No requests available."
        resultsLabel="Trial request search results" selectionMessage="Select a Trial request."
        noMatchMessage="No matching Trial requests." narrowMessage={(count) => `Narrow ${count} Trial requests.`}
        inputRef={ref} aria-invalid aria-describedby="trial-choice-error" />
      <p id="trial-choice-error">Choose a request.</p>
    </>);
    const control = screen.getByRole("combobox", { name: "Trial request" }) as HTMLInputElement;
    expect(ref).toHaveBeenCalledWith(control);
    expect(control.getAttribute("aria-invalid")).toBe("true");
    fireEvent.focus(control);
    expect(screen.getByRole("listbox", { name: "Trial request search results" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Narrow 51 Trial requests.");
    fireEvent.change(control, { target: { value: "missing" } });
    expect(screen.getByRole("status").textContent).toBe("No matching Trial requests.");
    expect(control.validationMessage).toBe("Select a Trial request.");
  });

  it("incrementally filters options and selects the stable value", () => {
    const onValueChange = vi.fn();
    function Harness() {
      const [value, setValue] = useState("");

      return (
        <>
          <Label htmlFor="customer-search">Customer</Label>
          <SearchableSelect
            id="customer-search"
            options={[
              { value: "alpha", label: "Alpha Diagnostics" },
              { value: "johns-hopkins", label: "Johns Hopkins University" },
              { value: "zenith", label: "Zenith Research" },
            ]}
            value={value}
            onValueChange={(nextValue) => {
              setValue(nextValue);
              onValueChange(nextValue);
            }}
            placeholder="Search eligible Customers"
            emptyMessage="No eligible Customers available."
          />
        </>
      );
    }

    render(<Harness />);

    const customer = screen.getByRole("combobox", { name: "Customer" });
    fireEvent.focus(customer);
    fireEvent.change(customer, { target: { value: "Hopkins" } });

    expect(screen.queryByRole("option", { name: "Alpha Diagnostics" })).toBeNull();
    fireEvent.click(
      screen.getByRole("option", { name: "Johns Hopkins University" }),
    );

    expect(onValueChange).toHaveBeenLastCalledWith("johns-hopkins");
    expect((customer as HTMLInputElement).value).toBe(
      "Johns Hopkins University",
    );
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
