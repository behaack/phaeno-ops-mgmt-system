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

Local activation is complete after the Owner stopped the Visual Studio API. Four
retained FASTQs (310 bytes) use their Customer/Job/sample/library/capture paths in
the separate local test bucket. Their addresses were converted atomically, with
four maintenance audit events. All other scientific receipt fields are unchanged;
the Local originals remain checksum/length verified. The active Development
configuration and application storage factory read all four S3 files with matching
full checksums and lengths. Credentials use the private named profile outside
source; other Development settings are preserved.

The API and HTTPS frontend are restarted at their existing local addresses. API
health and proxied health return HTTP 200, the Portal renders with HTTP 200, and
anonymous protected laboratory requests return HTTP 401. The normal Visual Studio
API build is refreshed with zero warnings/errors. The temporary published API is
running on port 44399; stop that process before starting a new Visual Studio debug
session on the same port. Detailed mappings, encrypted configuration rollback,
protected credentials and infrastructure receipts remain outside public source.
No authenticated upload or scientific-workflow mutation was performed during this
cutover verification.

S3-aware coordinated backup, off-server protection, populated restore rehearsal
and monitoring remain production requirements. This testing waiver does not waive
scientific verification, source-version preservation or independent QC/publication.
