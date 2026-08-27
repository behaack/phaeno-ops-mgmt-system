export type CustomerOrganizationState =
  | "mock"
  | "loading"
  | "error"
  | "empty"
  | "ready";

export function resolveCustomerOrganizationState({
  mock,
  isLoading,
  isError,
  eligibleCount,
}: {
  mock: boolean;
  isLoading: boolean;
  isError: boolean;
  eligibleCount: number;
}): CustomerOrganizationState {
  if (mock) return "mock";
  if (isLoading) return "loading";
  if (isError) return "error";
  return eligibleCount > 0 ? "ready" : "empty";
}
