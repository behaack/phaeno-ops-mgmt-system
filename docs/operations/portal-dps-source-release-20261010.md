# Portal DPS source and laboratory UI release — October 10, 2026

The matched Portal API and frontend are live on application source
[a1d3fbb0](https://github.com/behaack/phaeno-ops-mgmt-system/commit/a1d3fbb01747e409a67b99ede1a3ca33063010ab)
under the [preserving release plan](../plans/PORTAL-DPS-SOURCE-RELEASE-20261010-PLAN.md).
[Deploy Portal Green #101](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/38077216862)
succeeded. The API image tag is `sha-a1d3fbb01747-run-38077216862-1` and the promoted
frontend deployment is `dpl_5GLDquYCWMKTVBPUA7ZLE9oGz6R8`. The frontend was built
from an isolated exact-commit archive and promoted without rebuilding after API
source/health verification. Vercel production metadata independently matches the
API deployment's verified source revision.

Release preparation corrected a missing DPS scan-status namespace import and
regenerated the matching API/UI documentation corpus: 56 guides, hash
`6979ec04038c22d5620251f63c156b6ad2c31026f31105bb01e7c64079e58c12`.
The first API attempt stopped before replacing the running API because the
embedded contract schema was missing from the release archive and Docker build.
Both packaging paths now include the canonical schema. A temporary frontend
upload filter also excluded its required integration folder; that filter was
corrected before the successful staged build. Neither failed build was promoted.

The full API Release solution compiles with zero warnings/errors. Frontend
TypeScript, local and Vercel production builds, and generated help consistency
checks pass. The successful container publish includes the embedded DPS schema.
Deployment scanner checks for clean, EICAR, encrypted and oversized content and
scanner health pass. Application regression suites and real DPS execution,
broker/access, lifecycle replay and output admission remain unperformed; source
release does not establish those acceptance results.

This is an update of the existing hosted test environment. No database reset,
replacement, migration, identity cutover, local mock-data import or scientific
write was performed. Hosted S3 storage and ClamAV were preserved; Website row
counts remain `0,1` as checked by the release script. DPS remains disabled and
unconfigured pending Chris Yourch's service validation. Existing scientific
approval and Customer publication remain separate workflows.

Post-release API/Portal/help/Website checks return HTTP 200, database ping returns
204, and direct/proxied anonymous laboratory requests return 401. The live Portal
sign-in form renders. A bounded promoted-frontend error-log query returned no
error entries. Authenticated organization/laboratory workflow acceptance was not
performed because the available production Portal session was signed out.

The protected deployment workflow is restored to `disabled_manually`; automatic
Vercel Git deployment remains disabled for both applications. Existing encrypted
recovery is retained: the prior restore-verified off-server artifact remains
unexpired and its digest matches its private receipt. It is historical
database/Local-file recovery, not current S3 backup coverage. The Owner's hosted-test
S3 recovery deferral remains; commercial production still requires S3-aware backup
and restore rehearsal. Private receipts, smoke results and the successful-run
screenshot are retained under `artifacts/release-checks/dps-source-20261010/`.
