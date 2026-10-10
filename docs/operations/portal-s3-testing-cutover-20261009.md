# Portal S3 testing cutover — October 9, 2026

The Owner moved S3-aware backup/restore from testing cutover to commercial production
readiness. The hosted-test API and Portal are active on matching source `9a391b3f`.
S3 is enabled with private, versioned, environment-separated test destinations and
bucket-scoped application credentials; the supplied administrator key is not
installed in the server. Existing unrelated buckets are untouched.

The hosted switch requires the exact test database and an empty referenced/physical
file store, preserves its Local volume, and restores prior settings on failure.
ClamAV, authentication and worker settings are preserved. The Local-only backup
timer is disabled and test backup status explicitly deferred. No EF migration or
database reset was required. Release controls are restored.

Storage regression checks pass: 27 cases and one Unix-only skip. Live S3 probes
verify version-pinned reads, multipart/full-byte checksums, overwrite protection,
permanent-version-delete denial and isolation from other buckets. The hosted
file-service verifier passes storage-area/readback/scan/deletion checks without
business records. Public API/Portal health is HTTP 200 and direct/proxied anonymous
laboratory access is HTTP 401.

Four local retained FASTQs are copied to their Customer/Job/sample/library/capture
paths and full-checksum/length verified. Local originals and database addresses
remain unchanged while their Visual Studio API runs. Local activation requires its
operator to stop that process, followed by atomic address conversion, matching S3
configuration/restart and retained-file access checks. Detailed mappings, protected
credentials and infrastructure receipts remain outside public source.

S3-aware coordinated backup, off-server protection, populated restore rehearsal
and monitoring remain production requirements. This testing waiver does not waive
scientific verification, source-version preservation or independent QC/publication.
