# Business rules

## Accounts and tenants

- A Clerk identity must resolve to an active internal `User` before it can act in the product.
- Users receive access through active `OrganizationMembership` records.
- A platform administrator is an active user with a membership that grants platform-admin capability.
- Platform administrators can manage organizations broadly.
- An active organization administrator can manage members and invitations for that active non-Phaeno organization.
- Non-platform users cannot manage membership of the Phaeno organization.

## Invitations

- Onboarding is invite-only; public self-registration is not the product model.
- Invitations are organization-scoped and have explicit lifecycle states: `Pending`, `Accepted`, `Revoked`, and `Declined`.
- Invitation tokens must be protected and expire according to configuration.
- Email delivery uses Postmark when configured and a logging implementation for local/unconfigured environments.
- Invite acceptance must connect the external Clerk identity to the intended internal user and membership without bypassing tenant checks.

## Lifecycle, audit, and concurrency

- Users and organizations are deactivated rather than hard-deleted in normal workflows.
- Mutable persisted entities use a numeric version for optimistic concurrency; stale writes should return `409 Conflict`.
- Audited entities receive centralized create/update metadata and append-only `AuditEvent` records.
- Password hashes, tokens, secrets, and unnecessary personal data must not appear in audit diffs.

## Current versus planned vocabulary

The current code implements `Phaeno` and `Customer` organizations. `Partner`/`Distributor`, file management, order management, and customer data provisioning are plan-level concepts. Before implementing them, resolve the terminology and ownership questions recorded in:

- `PLANS/CUSTOMER-DISTRIBUTOR-DATA-PROVISIONING-PLAN.md`
- `PLANS/FILE-MANAGEMENT-PLAN.md`
- `PLANS/ORDER-MANAGEMENT-PLAN.md`

Do not promote proposed entities or statuses from those plans into this file until code and tests establish them.
