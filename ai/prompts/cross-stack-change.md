# Cross-stack change prompt

```text
Inspect the current Phaeno Portal implementation for this request.

Before editing:
- read AGENTS.md and the task-specific context identified by ai/README.md;
- identify the owning `docs/plans/` document;
- trace the current backend endpoint/domain/persistence path and frontend route/query/form path;
- list tenant-authorization, audit, concurrency, and invitation implications;
- distinguish implemented behavior from proposed plan content.

Propose a small implementation slice with its contract and verification.
Do not create or apply an EF migration unless I explicitly request it.

After approval, implement the slice, update the owning plan and test checklist, run only the requested checks, and summarize changed behavior, files, risks, and unresolved decisions.
```
