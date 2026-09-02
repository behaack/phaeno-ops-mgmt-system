import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Label } from "#/components/ui/label";
import { SearchableSelect } from "#/components/ui/searchable-select";

describe("SearchableSelect", () => {
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
