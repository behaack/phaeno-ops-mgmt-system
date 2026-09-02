import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { Label } from "#/components/ui/label";
import { MultiSelect } from "#/components/ui/multi-select";

describe("MultiSelect", () => {
  it("filters incrementally and retains multiple selected values", () => {
    function Harness() {
      const [values, setValues] = useState<string[]>([]);
      return (
        <>
          <Label htmlFor="requested-services">Requested services</Label>
          <MultiSelect
            id="requested-services"
            aria-label="Requested services"
            options={[
              { value: "PSeqLabService", label: "P-Seq Lab Service" },
              { value: "PSeqKit", label: "P-Seq Kit" },
              { value: "FutureService", label: "Future service" },
            ]}
            values={values}
            onValuesChange={setValues}
            placeholder="Select services"
            emptyMessage="No matching services."
          />
        </>
      );
    }

    render(<Harness />);
    const trigger = screen.getByRole("combobox", { name: "Requested services" });
    fireEvent.click(trigger);

    const search = screen.getByRole("searchbox", { name: "Search requested services" });
    fireEvent.change(search, { target: { value: "lab" } });
    expect(screen.queryByRole("option", { name: "P-Seq Kit" })).toBeNull();
    fireEvent.click(screen.getByRole("option", { name: "P-Seq Lab Service" }));

    fireEvent.change(search, { target: { value: "kit" } });
    fireEvent.click(screen.getByRole("option", { name: "P-Seq Kit" }));

    expect(trigger.textContent).toContain("P-Seq Lab Service, P-Seq Kit");
    expect(screen.getByRole("listbox").getAttribute("aria-multiselectable")).toBe("true");
  });
});
