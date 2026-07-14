# Verification playbook

Choose checks by changed surface. The detailed rule remains: do not run tests automatically unless requested.

## Documentation only

- Confirm every referenced path exists.
- Search for contradictory terminology, especially partner/distributor and auth-provider wording.
- Run `git diff --check`.

## Backend

From the repository root:

```powershell
dotnet build .\backend\PhaenoPortal.slnx
dotnet test .\backend\PhaenoPortal.slnx
```

For account changes, include focused coverage for authorization, tenant scope, invite lifecycle, audit behavior, and stale-version conflicts.

## Frontend

From `frontend/`:

```powershell
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run test:e2e
```

For UI changes, verify keyboard operation, focus, required-field errors, narrow layouts, dark mode, and reduced motion. For auth work, verify signed-out, loading/bootstrap, authorized, unauthorized, and expired-session states.

## Handoff

Report which checks actually ran. Do not describe an unrun build, test, browser flow, or deployment as verified.
