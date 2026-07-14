# AI context map

Use the smallest context set that covers the task.

| Task | Read first |
| --- | --- |
| Any code change | `AGENTS.md`, then the task-specific context below |
| Account, invitation, or access change | `docs/architecture.md`, `docs/business-rules.md`, `PLANS/AUTH-USER-SYSTEM-PLAN.md` |
| Backend endpoint or persistence change | `README.md`, matching `backend/app/Features` code, API infrastructure, and backend test plan |
| Frontend route or workflow | matching route and feature code, frontend test plan, and `ai/prompts/cross-stack-change.md` |
| File management, orders, or provisioning | the corresponding `PLANS/` file; treat proposed models as unimplemented |
| Verification or handoff | `ai/playbooks/verification.md` and the relevant living test plan |

Durable facts belong in `docs/`. Active implementation state belongs in `PLANS/`. Temporary investigation notes should remain outside the durable docs unless they produce a confirmed decision.
