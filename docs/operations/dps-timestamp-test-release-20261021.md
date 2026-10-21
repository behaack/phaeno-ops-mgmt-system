# DPS timestamp hosted-test release — October 21, 2026

Timestamp source `79b0338f5f96b3a5fcbea24b86db89906e922f84` is committed,
pushed and active in the existing hosted test API. The original rejected
whole-second Cancel receipt reconciles without another command or changed
execution times. Fresh simulated cancellation, active recovery, completion and
authenticated verified output downloads pass with the qualifications in the
[acceptance receipt](../testing/runs/2026-10-21-hosted-assembly-final.md).
Mutual TLS **18883** and the Simulated recipe remain enabled.

## Release identity and activation

| Item | Identity |
| --- | --- |
| Source | `79b0338f5f96b3a5fcbea24b86db89906e922f84` |
| Exact Git archive SHA-256 | `fc76ba207deb1ba0d95166c623b012ae2cf8decccba662abd029ff27ee8ccb5f` |
| Image tag | `phaeno-portal-green-api:sha-79b0338f5f96-manual-20261021-1` |
| Image ID | `sha256:3ced49a630f3596d79c1ddc31810dbca966bc617159a97c205b33b96cb101127` |
| Release | `/opt/phaeno.portal-green/releases/79b0338f5f96b3a5fcbea24b86db89906e922f84-manual-20261021-1` |
| Prior image retained | `sha256:175513e5c741915200efdd1904ba6c7c5144489cb35e88c2de86259004815a6d` |
| Final API start after acceptance restart | `2026-10-21T23:14:22.356514817Z` |

The protected exact-source `deploy-release.sh` ran directly, retaining deployment
locking and recovery/preservation/auth/storage/scanner guards. No migration,
identity or storage cutover ran. A first packaging preflight stopped before API
replacement because archived scripts were not executable. Staging executable
modes were corrected, then activation succeeded; the previous API remained
protected during that preflight failure.

The orphaned GitHub run `39056745064` still has zero jobs, is queued, and retains
its `QUARANTINED` release-path fence with no deployment directory. No competing
dispatch was created. `Deploy Portal Green` workflow 315525604 stays
`disabled_manually`; both Vercel Git deployment holds remain false. The Portal
frontend and Website were neither built nor deployed. The later documentation
completion commit does not replace the deployed API identity above.

## Verified recovery and preservation

Fresh full database/runtime/document/Local-file recovery is retained under
`/var/backups/phaeno-portal-deploy/assembly-acceptance-20261020/timestamp-release-20261021`.
Isolated PostgreSQL 18.6 restore and all 250 table fingerprint checks pass.
Encrypted copies were collected off-server and independently decrypted/inspected
without retaining plaintext recovery output.

| Recovery artifact | SHA-256 |
| --- | --- |
| `recovery.tar.gz.enc` | `64c6fc956f204eb5784011f36cf90f5fcad9704006a491d5102b798b6d726b4d` |
| `recovery.key.enc` | `c2e508d327cb78297b67a5957e22ff691d18c37f4699df657d14f24eb093ed15` |
| Additional pre-resumption encrypted DB dump | `f7e938eb27dfe0c03f8d0e78959fd2adb01c90330c282893f99b16528bac9b56` |

The additional recovery includes the retained failed/conflicted assembly before
creating the second synthetic fixture; isolated restore and independent
off-server decryption pass. Protected operational compose/manifest/settings
copies and the preceding image remain for rollback. No old database was restored
over subsequent activity.

Final checks preserve all 610 original non-fixture records and 115 unrelated
runtime/document files with permissions. Website intake history retains all 12
contacts and six Demo requests, complete-record fingerprints
`ef77bd28975f174e0fefaf39931bd25f` and
`95aa679ef04abf2b672f77ee6b9f6222`. All 29 migrations remain through
`20261017190934_SplitInternalOrderNotes`. Only scoped synthetic setup and normal
assembly/audit/receipt/work-order progression changed. No data reset, manual
outcome repair, historical email replay, auth or role change occurred.

## Operational readback and limits

The actual API reports `DPS MQTT discovery confirmed (TLS: True, Port: 18883,
Available: True).` Its SSH forwarding remains API `127.0.0.1:18883` to EC2
`localhost:18883`, validating TLS name `localhost` with the existing private CA
and client certificate. Runtime settings, protected certificates and the
`pseq_data_assembler` 0.1.0 Simulated recipe remain unchanged.

API/database/scanner healthy, tunnel active, public API health/Portal/Website 200
and anonymous assembly 401. Final state has zero active assemblies and no
scientific analyses, QC or result packages from either fixture. Temporary helper
containers/builds/packages and private helper environment files were removed;
encrypted recovery and acceptance receipts remain off-server and on-host.

The original provider ledger failure and conflicting terminal evidence are
retained. The authorized stale-process stop sent no signal because that process
had already exited; a later DPS replacement was external to this task. The
successful recovery covers that combined interruption, not independent
attribution to each outage. HTTP payload replay, automatic browser refresh,
live-provider pre-start cancellation and physical/scientific qualification are
bounded separately in the acceptance receipt. Populated-S3 recovery remains
deferred; `phaeno-portal-backup.timer` stays disabled/inactive. No production,
scientific, Customer or commercial activation is claimed.
