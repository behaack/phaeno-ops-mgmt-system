# AI context map

Use the smallest context set that covers the task.

| Task | Read first |
| --- | --- |
| Any code change | `AGENTS.md`, then the task-specific context below |
| Account, invitation, or access change | `docs/architecture.md`, `docs/business-rules.md`, `docs/plans/AUTH-USER-SYSTEM-PLAN.md` |
| Backend endpoint or persistence change | `README.md`, matching `backend/app/Features` code, API infrastructure, and backend test plan |
| Frontend route or workflow | matching route and feature code, frontend test plan, and `ai/prompts/cross-stack-change.md` |
| UI/UX, list, record detail, form, modal, feedback, responsive, i18n, privacy, or accessibility behavior | `docs/ui-ux-principles.md`, matching frontend code, and the relevant frontend/E2E plan |
| File management, orders, or provisioning | the corresponding `docs/plans/` file and current feature code; provisioning and the order-management initial release are implemented, while production activation requirements remain tracked in their owning plans |
| Verification or handoff | `ai/playbooks/verification.md` and the relevant living test plan |

Durable facts belong in `docs/`. Active implementation state belongs in `docs/plans/`. Temporary investigation notes should remain outside the durable docs unless they produce a confirmed decision.
