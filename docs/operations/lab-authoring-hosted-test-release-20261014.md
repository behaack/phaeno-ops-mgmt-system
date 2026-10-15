# Lab procedure authoring review and hosted-test release

Owner scope: review bugs/edge cases, update documentation, commit, push and deploy
the paired API/UI to the existing hosted test environment. The
[preserving release plan](../plans/LAB-AUTHORING-HOSTED-TEST-RELEASE-20261014-PLAN.md)
owns the conversion, recovery, cutover and rollback boundaries.

## Review corrections and local checks

- Block complete workflow presentation/printing if any exact protocol pin is
  missing, unreadable or mismatched, including retained retired revisions.
- Keep the concurrency token loaded with the edited content. Background refresh
  cannot silently authorize overwriting a newer revision.
- Pause instruction selection, movement and editing during illustration upload;
  preserve its receiving instruction. Enforce the 100-instruction copy limit and
  retain the selected source identity if the source list refreshes/reorders.
  Assign new instruction/field identities before same-named content is moved.
  Empty saved procedures are blocked rather than replaced with blank instructions.
- Update protocol draft authorship on edit, preserving independent approval for
  the last editor. Preserve approved content and explicit administrator overrides.
- Participate in master-mix retirement concurrency when saving/approving a
  reference; inspect exact production pins without a case-sensitive JSON filter.
- Reject null instruction/image entries, empty/truncated raster headers and
  excessive image dimensions. Existing scanning, protected reads and exact-byte
  approval verification remain required.
- Pause the old API before the database recovery snapshot and preserving model
  conversion. Any migration execution failure requires state inspection before
  an old-model restart. Compare Website intake full-record fingerprints.

Focused backend checks pass: 54 cases. Seven focused frontend files pass: 44 cases.
The parallel frontend attempt timed out under concurrent build load; the serial
run passed without relaxing global timeouts. Release solution build has zero
warnings/errors. Frontend production build/typecheck/lint pass. Updated guide corpus has 56 guides,
version `1d0e7cb954a3`. Full suites and PostgreSQL reference suites were not run.

Initial hosted preflight confirms API/UI source
`10e0dc9e5c6b0b739fd7efd3d570451e7194cbad`, prior frontend
`dpl_8zVMVFGDMKG3Ui3pNt3VzP9oYbUd`, PostgreSQL migration
`20261007025545_VersionedVendorLibraryExceptions` and S3 provider. The protected
server inventory contains 243 table/metadata fingerprint rows, including 12
Website contacts and 6 demo requests. Runtime recovery is archived/checksummed
privately. Retain the existing S3 recovery deferral and Local bytes.

## Release evidence

Release source `573843a1e3cb40bbc207c865aace4c8d7debf727` was committed and
pushed to main, with ordinary remote equality verified. The committed archive
SHA-256 is `1c34bfd81d3d92c4471c213ec90a8368239da7f7e8af63160d999eb6457e4475`.
Unrelated user-card documentation edits were excluded.

API [deployment run 38668224349](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/38668224349)
succeeds with preserving migration enabled. Running image is
`phaeno-portal-green-api:sha-573843a1e3cb-run-38668224349-1`, image identity
`sha256:daa9700c9dcf81ad1af39732bbe1ee87c70385e070eda5003da4307f8ff3d17d`.
Migration `20261014234438_ProtocolFirstLabProcedures` is applied. The old API
paused at 01:59:19 UTC on October 15; the successful deployment manifest is
01:59:40 UTC, approximately 21 seconds later.

The custom-format recovery dump passed isolated restore rehearsal and cleanup
before migration. Encrypted dump/key checksums pass on-server and after transfer
to the owner-only local recovery folder. Recovery basename is
`pre-migration-20261015T015919Z-573843a1e3cb`; encrypted dump SHA-256 is
`28546df1aeeb58dfa1e1a0b692c7d7a99d32b9bee37290b655eba2a7eb81f5eb`.
The private runtime archive checksum also passes. Recovery material is retained;
no live destructive restore was performed.

Post-conversion inventory has 245 table/metadata entries versus 243 before the
migration. All 242 unaffected entries match exactly; only the expected kit
workflow JSON conversion differs. One original approved kit revision is archived
and its content/order/source identity verifies. There were no hosted kit runs or
step records to convert; populated execution preservation was checked locally.
Both Website intake full-record fingerprints match, preserving all 12 contacts
and 6 demo requests. Approval/metadata fingerprints match. No reset, data deletion
or hosted operational fixture was used. S3 selection and the existing recovery
deferral remain unchanged; no illustration asset was created during smoke checks.

Frontend `dpl_72xTuemmuELHyQeujcZhJPqU9KDy` is ready at that same source and
promoted without rebuilding. Independent alias lookup confirms
[portal.phaenobiotech.com](https://portal.phaenobiotech.com/lab-configuration)
points to this deployment. Staged/live/previous-pin requests all load
`/assets/index-DvWyiS2c.js`. Existing skew protection remains enabled; its version
boundary advances from `1792010639159` to `1792029304727`, the exact staged
build creation time, to retire older UI routing pins after the model cutover.

The deployed API help corpus SHA-256 equals the committed file:
`ac4c3d5bdce4ff3981789db7f5a5b7bcab221b53056a95e954be024e579a6527`.
Portal, Lab Settings, help, Website and API health return 200; database ping is
204. Direct protected illustration and proxied work-attention reads return 401
when anonymous. Protected staging also passes 200/200/401 page/health/auth checks.
The bounded deployment-scoped frontend error scan (30 minutes, at most 25 records)
is empty; the newly running API has no error-level log entries in the checked
10-minute window.

The actual signed-in hosted browser reloads the new entry and shows Protocols,
Workflows and Historical Lab steps. The retained approved mock kit revision opens
in overview/bench presentation with exact revision/source attribution, and its
editor loads the retained instruction without a save or approval. It returns to
the read-only view. Screenshot evidence is retained privately as
`hosted-lab-procedure-bench.jpg`. No authentication/session reset or browser
permission change occurred.

Deploy Portal Green is restored to `disabled_manually`. Both Portal and Website
Vercel Git deployment holds remain false. The source deployment is complete;
this receipt is published separately without rebuilding unchanged application
code. Existing provider, storage, identity and commercial-activation boundaries
remain in force.

## Remaining acceptance

Authenticated illustration upload/read, browser-native multipage Letter/A4 PDF,
touch, 200% zoom and full assistive-technology qualification remain unperformed.
The browser extension's file-access restriction was preserved. No operational
approval, physical assembly, specimen consumption or scientific/business sign-off
is inferred from local fictional authoring or hosted read-only smoke checks.
