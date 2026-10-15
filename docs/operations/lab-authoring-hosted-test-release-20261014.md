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

Publication/deployment identities and post-conversion preservation results are
recorded here after each gate completes. A staged build alone is not a live release.

## Remaining acceptance

Authenticated illustration upload/read, browser-native multipage Letter/A4 PDF,
touch, 200% zoom and full assistive-technology qualification remain unperformed.
The browser extension's file-access restriction was preserved. No operational
approval, physical assembly, specimen consumption or scientific/business sign-off
is inferred from local fictional authoring or hosted read-only smoke checks.
