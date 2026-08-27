import { describe, expect, it } from "vitest";

import { resolveCustomerOrganizationState } from "./customer-organization-state";

describe("resolveCustomerOrganizationState", () => {
  it.each([
    [true, false, false, 0, "mock"],
    [false, true, false, 0, "loading"],
    [false, false, true, 0, "error"],
    [false, false, false, 0, "empty"],
    [false, false, false, 1, "ready"],
  ] as const)(
    "keeps mock, loading, error, empty, and ready states distinct",
    (mock, isLoading, isError, eligibleCount, expected) => {
      expect(
        resolveCustomerOrganizationState({
          mock,
          isLoading,
          isError,
          eligibleCount,
        }),
      ).toBe(expected);
    },
  );
});
