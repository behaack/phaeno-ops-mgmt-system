# SYS-06 recovery execution - September 15, 2026

## Scope and authorization

The Product Owner directed "Close the final case. Phew." after the scoped backup rollout approval request. Proceed under [that reviewed scope](../../plans/FINAL-UAT-RECOVERY-APPROVAL.md): backup maintenance only, with isolated rehearsal before any production interruption. The original workspace and its staged application/UAT changes remain separate from the maintenance checkout.

## Rehearsal identity

The disposable local outer container is `phaeno-sys06-rehearsal-20260915`, ownership label `phaeno.uat-owner=sys06-20260915`. It has its own systemd and nested Docker daemon, no host filesystem or Docker socket mount, and no published outer ports. Its nested database, managed-file volume and API use the exact production names required by the unchanged coordinator. No production resource is used in the rehearsal.

The real current Portal API is published from local source HEAD `7df0ccbef62252732ceae877abb4fe7bb9a721dc` plus the recorded UAT application changes. Source/image identity and assembly hash must accompany results; the label alone is not a clean-release assertion. The fixture uses the existing `Test` environment, a private synthetic signed-token issuer, disabled delivery/scanning and an internal-only PostgreSQL network. The database's required `track_commit_timestamp` setting is enabled. Real Clerk sign-in was proved separately in ACC-06; this rehearsal does not claim provider authentication coverage.

The command-driven scientific journey passes and exports only its generated synthetic database before cleanup, plus its actual generated invoice PDF, released test result bytes and download history. It retains the Job, shipment/receipt, package and billing facts. No operational Customer data or existing UAT Jobs are copied. The export is opt-in through `PSEQ_RECOVERY_EXPORT_DIR`; the ordinary test still deletes its generated database.

## Results

- Full command-driven fixture: passed (2 minutes 10 seconds); final opt-in export rerun passed (1 minute 18 seconds).
- Unchanged Linux safety checks: 26 passed (5 envelope, 6 recovery, 15 file/archive checks).
- Coordinated capture, exact-container watchdog recovery, decrypted isolated restore and authenticated restored downloads: **PASS**.
- Production activation, isolated snapshot verification, encrypted off-server copy and daily timer installation: **PASS**.
- Actual overnight scheduled capture/collection: **pending September 16**. A manual installation run does not satisfy this assertion.

SYS-06 remains open until all required evidence is recorded. The controlling ledger remains 80/81 during execution.

## Completed isolated recovery proof

The runtime assembly SHA-256 was `098A859AFDB23B31EC11D0564EA7134271DD38746415A0AF4222B6EBF621A507`. The exact API container was `ff790436d455587442954cf297f94ee14c675a1fc0e3fadc194d53f468ce3aaa`. Capture `snapshot-20260916T010631Z-59ddfbac-7da5-4000-ae37-f3ae0a98b005` paused that API for 10 seconds, resumed it healthy, and verified 4 schemas, 62 migration records and both required file references. The coordinator encrypted the snapshot and verified plaintext/helper cleanup.

The encrypted pair was decrypted with a rehearsal-only recipient key into a fresh database and managed-file volume. The actual restored API returned HTTP 200 for the original Job, output packages, invoices, invoice PDF and result download. Job `78406948-643e-4e4f-b516-0755a8d49efb`, package `e8509515-50d5-44ad-b1f2-4ab5bccbf644` and invoice `2694c4dc-fe57-402c-bcbf-4335cda11bd4` remained linked. Shipment receipt and completed download history were retained; this fixture has no payment receipt, and no payment-receipt restoration is claimed.

| Restored download | Bytes | SHA-256 before and after |
| --- | ---: | --- |
| Generated invoice PDF | 927 | `fa7266be7c2f2498b3a2cc453a34875516e16fd4c34efbb1c44a2dcc0d4112a4` |
| Released test result | 39 | `96c17a5bef7ad06d8d830a04175d5eedc4728429e6b99ef4dce83e872e336cf1` |

A second coordinator was forcibly killed after stopping the API. Its independently armed systemd timer recovered the **same** API container without a manual restart. Stop/start timestamps were `2026-09-16T01:09:29.776743922Z` and `2026-09-16T01:12:30.186479975Z`, approximately 180.4 seconds apart. The observer's 150.1-second measurement starts later and is not the outage duration. The interrupted attempt emitted no false success. Cleanup removed only the token-labeled orphan helper and its empty working directory.

Retained sanitized evidence: [capture](2026-09-15-sys06-evidence/backup.log), [before](2026-09-15-sys06-evidence/before.json), [after](2026-09-15-sys06-evidence/after.json), [watchdog](2026-09-15-sys06-evidence/watchdog.json). No private key, token, database dump or Customer data is included in these report artifacts.

After collecting evidence, cleanup rechecked the outer container's exact ID and ownership label, then stopped and removed that container and its nested databases, volumes, synthetic keys and restore resources. The existing Finance UAT scanner and Website development database remained running. Local synthetic export/evidence files remain in the ignored workspace temporary directory for diagnosis.

## Production maintenance and unchanged application releases

[Backup-only PR 1](https://github.com/behaack/phaeno-ops-mgmt-system/pull/1) published 13 reviewed maintenance files. Head `7eadae117a6891f339f3cdd8be53b12eeefba29d` merged as `e8df58b92aefebd3f4ddbecde96e23a9ee1fbab0`. The original workspace's application/UAT staging was not modified by this Git operation.

Before merging, live Vercel settings revealed that `main` automatically deploys the Portal, although its application source is older than production. The owner explicitly approved a temporary exact-tree build-skip rule on `phaeno-ops-mgmt-system`, `phaeno-website` and `phaeno-website-dev`. The rule matched only maintenance tree `a63b0a382af913d54570b4edd0d541659ec960dc` (and skipped safely if Git identity could not be read). All three merge checks reported **Canceled by Ignored Build Step**. Each project's original **Automatic** setting was then restored and verified. No application build was promoted.

[Production installation run 35043891714](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/35043891714) completed successfully at `2026-09-16T01:24:06Z`:

- Source API revision `26839b4c7739ca1e5f3934335c9f5a758cd6a55c` returned healthy after a 7-second recorded pause.
- Snapshot `snapshot-20260916T012341Z-2de2eacf-afef-4d28-a36f-b79f1d4dca53` passed database/schema/reference/file verification, encryption and cleanup. Production currently has zero managed-file bytes and zero Jobs/invoices; the separate populated rehearsal supplies real download coverage.
- Independent GitHub artifact `10426387535`, size 882141 bytes, digest `sha256:0e67d803773065d196ed01178d80b0e77ed846ce1fb44ebd3e025fcd2fdff576`, expires October 21, 2026. Export receipt passed before the host timer was enabled.
- Host schedule: 02:00 America/Los_Angeles, 03:00 spring-DST fallback. GitHub collector: 10:47 UTC daily (03:47 Pacific on September 16).
- Post-maintenance API health HTTP 200, database ping HTTP 204, Portal HTTP 200 and Website HTTP 200 at approximately `2026-09-16T01:25:27Z`.

| Release surface | Unchanged identity |
| --- | --- |
| Production API | `26839b4c7739ca1e5f3934335c9f5a758cd6a55c`; deployment run `34736875788` |
| Production Portal | Same source revision; Vercel `dpl_3AgHRLYfVrm1NogVQYFv6abvY6gs`, current `portal.phaenobiotech.com` |
| Production Website | `00959f5600e065714166232b2f579b3b4b2eff57`; Vercel `dpl_H9LEZ3mPteKbp3tp96Q38V61Wig7`, current public domain |

The local UAT application remains HEAD `7df0ccbe` plus the recorded uncommitted application batch. Its newer behavior is **not** asserted to be in production. Production backup reported 62 migration records; this maintenance did not apply a migration or change provider/feature-flag configuration. The isolated rehearsal prerequisites above must not be mistaken for production flags.

## Remaining scheduled evidence and closure rule

The owner explicitly approved checking the overnight run automatically and closing SYS-06 if its evidence passes. Automation `close-final-uat-backup-case` is scheduled for **September 16 at 04:15 America/Los_Angeles**, recurring daily only until resolved. It must verify an actual GitHub `schedule` event, a newer snapshot from the host's scheduled capture, successful collection/export receipt and unexpired encrypted artifact, plus healthy unchanged application releases. It must never substitute another manual backup. On success, update this report, the reconciliation ledger and owning plan, report totals and pause the automation. A delayed or failed scheduled run leaves the case open with an explicit next action.

The owner’s closure instruction applies to the approved software acceptance scope. Physical laboratory processing, scientific validation, provider delivery and rollout of the newer UAT application retain the separate boundaries already documented in the [final-three report](2026-09-15-final-three-acceptance.md). No production restore, new identity grant or broader release acceptance is inferred.
