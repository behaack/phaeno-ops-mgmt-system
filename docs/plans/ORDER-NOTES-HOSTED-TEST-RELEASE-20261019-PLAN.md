# Order notes hosted-test release — October 19, 2026

Completed: exact API/UI source `390341dd9ba913f6f5a416de827ad4de99c8f380` is
live with both approved migrations. See the
[release receipt](../operations/order-notes-test-release-20261019.md) for
preservation, recovery, stale-run containment, verification and remaining gates.

The Owner requested commit, push and deployment of all pending changes. Publish
the private/public rich-text order notes implementation, migration, regression
sources and matching help together. Automated suites remain request-only.

Target the existing Portal Green hosted-test API/database and Portal frontend,
using the environment and preserving recovery process in
[the preceding release plan](RD-NOTEBOOK-HOSTED-TEST-RELEASE-20261017-PLAN.md).
The public Website frontend and OCIA are outside this release.

## Required gates

The earlier API run `39056745064` still reports queued with no jobs on October 19.
Cancellation returns HTTP 409, stating it has not been queued yet; deletion also
fails. The Owner approved resolution and the preserving hosted migration on
October 19. The exact old workflow was inspected: extraction fails under
`set -Eeuo pipefail` if its release path already exists, before runtime installers
or deployment execute. A root-only quarantine directory now occupies
`/opt/phaeno.portal-green/releases/e5c0804c90dfcf68931cc2f3d48525964ea6b419-39056745064-1`.
The failed absence check and absence of executable deployment content were
verified. Retain that fence while the orphan remains queued; never rerun that
old source. GitHub's queue state remains unresolved, but the stale deployment is
neutralized. Do not dispatch another Actions run. Execute the same protected
`deploy-release.sh` directly against an exact Git archive while the workflow
remains disabled, preserving its deployment lock, backup/isolated restore,
scanner, migration, health and intake checks. Vercel Git holds remain in place.

`20261017190934_SplitInternalOrderNotes` adds private/public columns, moves
existing internal descriptions into escaped private rich text, rewrites Draft
JSON and sanitizes cached command responses. It changes existing hosted data
and received explicit Owner authorization before application. The recommended
remedy is this one-time preserving conversion after verified recovery; resetting
affected orders would lose history and is not recommended or authorized.
Local conversion evidence is in [the owning plan](ORDER-MANAGEMENT-PLAN.md).

## Execution after gates clear

1. Read actual hosted source and migration history; enumerate all pending
   migrations, including the earlier additive R&D migration if still pending.
   Preview affected internal orders and replay records without writing.
2. Capture database, runtime and file recovery, restore the database in isolated
   PostgreSQL 18.6 with no live mounts, encrypt and independently verify the
   off-server copy. Preserve all schemas, files and settings. Explicitly compare
   complete `website.web_contacts` and `website.web_orders` records, including
   historical states, identities, timestamps and actors. No email replay.
3. Stage the exact pushed frontend with domain assignment disabled. Deploy the
   same Git archive with the protected host script and approved migrations,
   preserving installed runtime settings. Keep the manual workflow disabled.
4. Verify text-preserving conversion, unchanged unrelated order/replay/audit and
   intake fingerprints, migration history, matching API source/help, scanner,
   health and authorization. Promote the staged frontend only after these pass.
   Verify canonical and prior-pin assets and available signed-in read-only UI.
5. Record exact source/run/deployment, recovery and preservation evidence.

Keep the previous API/UI pair available. Before conversion, preparation failure
leaves the existing release active. After conversion, prefer a preserving forward
repair; old internal-note writers must not resume against the converted model.
Do not downgrade or restore over subsequent writes without separate approval.
Preserve the hosted-test S3 recovery deferral, identity/provider configuration,
Vercel Git holds and commercial/scientific activation boundaries.
