# Data provisioning reference journey

This explicit verification tool exercises the first organization-data-
provisioning slice against PostgreSQL and temporary managed storage. It calls
the production controllers with authenticated test identities and verifies:

- synthetic source registration, evidence, upload, scan, and readiness
- immutable version snapshot, checksum, publication, and eligibility
- exact-version Prospect grant and idempotent retry
- tenant list/detail, individual download, archive download, and audit history
- cross-organization non-discovery
- immediate revocation
- database transaction rollback and temporary-storage cleanup

The tool does not alter authentication configuration or validate Clerk JWT
signature middleware. It supplies authenticated external identities directly to
the application authorization layer. JWT integration remains a separate test
boundary.

Set `PSEQ_OPERATIONS_REFERENCE_CONNECTION` to an isolated or development database
that already has all migrations applied, then run:

```powershell
dotnet run --project backend/tools/PSeq.Operations.ReferenceJourney/PSeq.Operations.ReferenceJourney.csproj
```

These schema overrides are optional:

- `PSEQ_OPERATIONS_REFERENCE_COMMERCIAL_SCHEMA` defaults to `commercial_ops`.
- `PSEQ_OPERATIONS_REFERENCE_LABORATORY_SCHEMA` defaults to `lab_ops`.
- `PSEQ_OPERATIONS_REFERENCE_MIGRATIONS_HISTORY_SCHEMA` defaults to `public`.

Fixture rows are enclosed in one transaction and rolled back. Uploaded fixture
bytes use a run-specific temporary directory that is removed before exit.
