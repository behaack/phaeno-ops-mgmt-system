import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CrmOpportunityStageSummary } from "./CrmOpportunityStageSummary";

const stages = [
  { stageId: "discovery", stageName: "Discovery", probability: 10, pipelineName: "General Sales", count: 32, unpricedCount: 1, currencyTotals: [{ currency: "USD", amount: 3000 }, { currency: "EUR", amount: 50 }] },
  { stageId: "proposal", stageName: "Proposal", probability: 50, pipelineName: "General Sales", count: 1, unpricedCount: 0, currencyTotals: [{ currency: "USD", amount: 0 }] },
  { stageId: "won", stageName: "Won", probability: 100, pipelineName: "General Sales", count: 0, unpricedCount: 0, currencyTotals: [] },
];

describe("opportunity stage summary", () => {
  it("keeps currencies separate and distinguishes unpriced from zero and empty", () => {
    render(<CrmOpportunityStageSummary stages={stages} selectedStageId="" showPipeline={false} onSelect={vi.fn()} />);
    const all = screen.getByRole("button", { name: /^All stages/ });
    expect(within(all).getByLabelText("33 opportunities").textContent).toBe("33");
    expect(all.textContent).not.toContain("opportunities");
    expect(all.textContent).toContain("1 unpriced");
    expect(all.textContent).toMatch(/USD.*3,000/);
    expect(all.textContent).toMatch(/EUR.*50/);
    expect(within(screen.getByRole("button", { name: /^Proposal/ })).getByText(/USD.*0/)).toBeTruthy();
    expect(screen.queryByText("No opportunities")).toBeNull();
    expect(screen.getByRole("button", { name: /^Discovery/ }).textContent).toContain("10%");
    expect(all.textContent).not.toContain("%");
  });
  it("shows configured probabilities for zero counts when a summary omits them", () => {
    const empty = stages.map(stage => ({ ...stage, probability: undefined, count: 0, unpricedCount: 0, currencyTotals: [] }));
    const configuredStages = [{ id: "discovery", probability: 10 }, { id: "proposal", probability: 0 }, { id: "won", probability: 100 }];
    render(<CrmOpportunityStageSummary stages={empty} configuredStages={configuredStages} selectedStageId="" showPipeline={false} onSelect={vi.fn()} />);
    for (const [name, probability] of [["Discovery", 10], ["Proposal", 0], ["Won", 100]] as const) {
      const stage = screen.getByRole("button", { name: new RegExp(`^${name}`) });
      expect(stage.textContent).toContain(`${probability}%`);
      expect(within(stage).getByLabelText("0 opportunities").textContent).toBe("0");
    }
    expect(screen.getByRole("button", { name: /^All stages/ }).textContent).not.toContain("%");
  });
  it("selects a stage and clears the selection with All stages", () => {
    const select = vi.fn();
    render(<CrmOpportunityStageSummary stages={stages} selectedStageId="discovery" showPipeline onSelect={select} />);
    const stage = screen.getByRole("button", { name: /General Sales\s*Discovery/ });
    expect(stage.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(stage);
    expect(select).toHaveBeenLastCalledWith("discovery");
    fireEvent.click(screen.getByRole("button", { name: /^All stages/ }));
    expect(select).toHaveBeenLastCalledWith("");
  });
});
