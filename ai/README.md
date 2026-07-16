# AI context map

Use the smallest context set that covers the task.

| Task | Read first |
| --- | --- |
| Any code change | `AGENTS.md`, then the task-specific context below |
| Account, invitation, or access change | `docs/architecture.md`, `docs/business-rules.md`, `docs/plans/AUTH-USER-SYSTEM-PLAN.md` |
| Backend endpoint or persistence change | `README.md`, matching `backend/app/Features` code, API infrastructure, and backend test plan |
| Frontend route or workflow | matching route and feature code, frontend test plan, and `ai/prompts/cross-stack-change.md` |
| UI/UX, list, record detail, form, modal, feedback, responsive, i18n, privacy, or accessibility behavior | `docs/ui-ux-principles.md`, matching frontend code, and the relevant frontend/E2E plan |
| User-facing behavior or in-portal help | `docs/user-documentation.md`, the affected audience guides in `frontend/src/content/docs/`, matching feature code, and the relevant test plan |
| File management, orders, or provisioning | the corresponding `docs/plans/` file and current feature code; provisioning and the order-management initial release are implemented, while production activation requirements remain tracked in their owning plans |
| HubSpot, CRM, prospect onboarding, service entitlement, direct/custom sale, relationship change, or offboarding | `docs/crm-integration-strategy.md`, `docs/plans/HUBSPOT-PORTAL-LIFECYCLE-PLAN.md`, and `integrations/hubspot/`, then the affected account, Trial Project, order, or provisioning plan; the Phase 0 HubSpot project shell exists, but the runtime integration is not implemented |
| Lab Operations, accessioning, protocols, reagent preparation, library preparation, NGS send-out, solution/schema restructuring, migration reset, provider contract, or future LIMS replacement | `docs/plans/LAB-OPERATIONS-PLAN.md`, `docs/plans/LAB-OPERATIONS-INVENTORY.md`, `docs/plans/LAB-OPERATIONS-CONTRACT.md`, `docs/plans/PSEQ-OPERATIONS-MIGRATION-PLAN.md`, `docs/lims-integration-strategy.md`, `docs/plans/ORDER-MANAGEMENT-PLAN.md`, and current Order Management code; inventory/classification, the planned v1 contract, the clean development-reset sequence, solution/project shells, the single-context schema target, the Accounts, Relationships, and Data Provisioning extractions, and the commercial configuration, Partner kit, integration, notification, and workflow-support slices are complete, but mixed Commercial/Laboratory/pipeline Order Management records, the destructive development reset, clean initial migration, and Lab Operations implementation remain pending |
| Verification or handoff | `ai/playbooks/verification.md` and the relevant living test plan |
| Runtime configuration, deployment boundary, integration recovery, or production readiness | `docs/operations-readiness.md`, `docs/architecture.md`, and the owning feature plan |

For every major-record workflow, treat the standard list -> create/view/edit -> return flow in `docs/ui-ux-principles.md` as application-wide policy. Check the list, detail route, modal behavior, and focus/list-state restoration together rather than reviewing any one screen in isolation.

Durable facts belong in `docs/`. Active implementation state belongs in `docs/plans/`. Temporary investigation notes should remain outside the durable docs unless they produce a confirmed decision.
