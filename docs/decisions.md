# Decision log

This file records durable decisions visible in current code. Dates are capture dates, not claims about when the original decision was made.

## 2026-07-14: External identity is separated from product authorization

Status: observed in current code.

Clerk authenticates the person, while the API resolves an internal user and active memberships for authorization. Tenant access must not be granted solely from frontend state or external claims.

## 2026-07-14: The API uses feature ownership and a common envelope

Status: observed in current code.

Backend code is organized under `Features/<FeatureName>`, with common API response/error behavior in infrastructure and exception middleware under `/api`.

## 2026-07-14: PostgreSQL persistence owns audit and concurrency behavior

Status: observed in current code.

Auditing and version increments are centralized in EF persistence. Endpoints should participate through the established entity interfaces rather than duplicating this logic.

## 2026-07-14: Normal removal is deactivation

Status: observed in project guidance and persistence rules.

Users and organizations are deactivated for normal product workflows. Hard deletion requires a separately approved purge/retention design.

## Open decisions

- Final partner-versus-distributor terminology and its relationship to `OrganizationKind`.
- File storage provider and lifecycle details.
- Order ownership, fulfillment, and billing semantics.
- Production hosting and deployment workflow.

Open items belong in the relevant `PLANS/` document until resolved.
