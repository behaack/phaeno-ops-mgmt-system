# SYS-06 recovery execution - September 15, 2026

## Scope and authorization

The Product Owner directed "Close the final case. Phew." after the scoped backup rollout approval request. The reviewed scope covered backup maintenance only, with isolated rehearsal before the production interruption. The original workspace and its staged application/UAT changes remained separate from the maintenance checkout.

## Rehearsal identity

The disposable local outer container is `phaeno-sys06-rehearsal-20260915`, ownership label `phaeno.uat-owner=sys06-20260915`. It has its own systemd and nested Docker daemon, no host filesystem or Docker socket mount, and no published outer ports. Its nested database, managed-file volume and API use the exact production names required by the unchanged coordinator. No production resource is used in the rehearsal.

The real current Portal API is published from local source HEAD `7df0ccbef62252732ceae877abb4fe7bb9a721dc` plus the recorded UAT application changes. Source/image identity and assembly hash must accompany results; the label alone is not a clean-release assertion. The fixture uses the existing `Test` environment, a private synthetic signed-token issuer, disabled delivery/scanning and an internal-only PostgreSQL network. The database's required `track_commit_timestamp` setting is enabled. Real Clerk sign-in was proved separately in ACC-06; this rehearsal does not claim provider authentication coverage.

The command-driven scientific journey passes and exports only its generated synthetic database before cleanup, plus its actual generated invoice PDF, released test result bytes and download history. It retains the Job, shipment/receipt, package and billing facts. No operational Customer data or existing UAT Jobs are copied. The export is opt-in through `PSEQ_RECOVERY_EXPORT_DIR`; the ordinary test still deletes its generated database.

## Results

### September 17 closure — SYS-06 Pass

**81/81 software cases are closed: 40 ordinary passes and 41 explicitly simulated software passes.** This section supersedes the historical pending dispositions below. The owner authorized automatic closure when genuine scheduled evidence passed; that condition is now met.

#### Genuine scheduled collection

- [Run `35113420745`](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/35113420745) completed successfully with event **`schedule`**, branch `main`, maintenance revision `e8df58b92aefebd3f4ddbecde96e23a9ee1fbab0`. It started September 16 at `15:09:30Z` (08:09 Pacific), approximately 4 hours 22 minutes after the configured collection time, and completed at `15:10:01Z`. This proves scheduled execution, not an on-time collection guarantee.
- Host snapshot `snapshot-20260916T090002Z-260bcfb1-9808-4111-928b-b5d87fc04f21` was created at 02:00:02 Pacific, after the initial installation snapshot. The [receipt](2026-09-15-sys06-evidence/2026-09-16-scheduled-receipt.env) matches authorized application `5d57de217542efeafbe45b1bd654dc1ed200a6be` and migration `20260916000046_AddLabChangeQuoteSnapshots`.
- Encrypted off-server artifact **`10453261809`**, 882139 bytes, remains unexpired until `2026-10-21T15:09:53Z`; ZIP digest `96039fd22daa2674bd15a0bc33d8b2c5fe31725e6cb8e638ebb65ae1783dc407`.
- Downloaded encrypted payload, wrapped key and receipt all match the [three SHA-256 entries](2026-09-15-sys06-evidence/2026-09-16-scheduled-encrypted.sha256). Workflow logs report `coordinated_backup=PASS` and `backup_export_receipt=PASS`. Receipt flags `restore_verified`, `api_resumed`, `envelope_roundtrip` and `cleanup_verified` are all true. This scheduled export is distinct from the earlier manual recovery export of the same host snapshot.

#### September 17 continuity and current release

Today's scheduled GitHub collection had not appeared at the 04:17 Pacific check. After checking recent runs for duplicates, the authorized **collect-latest** fallback [run `35215010171`](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/35215010171) succeeded. It collected the existing 02:00:09 Pacific host snapshot `snapshot-20260917T090009Z-c10b5971-769b-4307-94c3-738c7be2c9ef`; it did not trigger a capture or interrupt the API.

- Off-server artifact **`10494054992`**, 892379 bytes, expires `2026-10-22T11:18:55Z`; ZIP digest `0f39fe3fad7ccb49aed37ec6b629d58a4a7a7bf286ea807c77d2fa7affe48382`. Collection and export-receipt steps passed; [all three checksums](2026-09-15-sys06-evidence/2026-09-17-recovery-encrypted.sha256) match. This manual recovery is supplemental evidence; the scheduled assertion is satisfied by `35113420745` above.
- Today's [receipt](2026-09-15-sys06-evidence/2026-09-17-recovery-receipt.env) identifies application `52d21681517018ee77735e33e323518c808a27fd`, the same migration and all four verification flags true. The September 16 production invitation repair was explicitly requested after the scoped fix-and-deploy approval question in task “Align Search and Status” (`01a0aa3d-071e-7152-a1dc-2f2e0448ad37`, repair turn `01a0ab19-1d78-7f91-a4fe-dc0cc7d78ae2`); its completion records that exact release.
- [API deployment `35125322003`](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/35125322003) succeeded for `52d21681517018ee77735e33e323518c808a27fd`. Vercel's live Production Deployment panel independently identifies the matching Portal source, **Ready**, deployment [`dpl_9AEybubY8YACgvd9WJMJi4UABCPW`](https://vercel.com/cadexgenomics/phaeno-ops-mgmt-system/9AEybubY8YACgvd9WJMJi4UABCPW), assigned to `portal.phaenobiotech.com`.
- The live Website production panel remains **Ready** at source `00959f5600e065714166232b2f579b3b4b2eff57`, deployment [`dpl_H9LEZ3mPteKbp3tp96Q38V61Wig7`](https://vercel.com/cadexgenomics/phaeno-website/H9LEZ3mPteKbp3tp96Q38V61Wig7).
- [Fresh health checks](2026-09-15-sys06-evidence/2026-09-17-health.json) at 04:25 Pacific: API health **200**, database ping **204**, Portal root **200**, Website **200**.

Both production receipts have zero managed files/bytes; populated restored-download proof remains the separate isolated rehearsal below. Only nonsensitive receipts, hashes and metadata are retained in the repository; encrypted payloads and wrapped keys remain outside it. No application deployment, migration, production restore, access change or Git mutation occurred in this closure check.

#### Required-step crosswalk and closure boundary

| SYS-06 step | Passing evidence |
| --- | --- |
| 1 — Exact environment/release | Rehearsal identity, production release report, receipts and current matched API/UI/Website identity above |
| 2 — Coordinated isolated capture | Completed isolated recovery proof below; bounded writer pause and return to service |
| 3 — Failure/watchdog | Same-container forced-kill recovery, orphan cleanup and no false successful snapshot below |
| 4 — Populated isolated restore | Retained Job/package/invoice links, history and matching invoice/result download bytes below |
| 5 — Independent scheduled/off-server backup | Actual schedule-event run `35113420745`, newer host snapshot, unexpired artifact, three matching hashes and export receipt |
| 6 — Reconciled acceptance | Controlling ledger now 81/81 software cases; owner-authorized conditional closure satisfied |

Scoped Markdown link checks and whitespace checks passed; the ledger reconciled to exactly 40 Pass and 41 Pass (simulated) rows. Completion automation `close-final-uat-backup-case` was then set to **PAUSED**, confirmed by the app. Retained [run/artifact metadata](2026-09-15-sys06-evidence/2026-09-17-run-verification.json) accompanies the receipts. Pausing ends its temporary missed-export fallback; it does not disable the host timer or GitHub's daily collection. GitHub collection delay remains an operational timing limitation. Physical laboratory processing, scientific validation, real provider delivery and final business acceptance remain separate; this closure does not assert those outcomes or re-test later application changes.

### September 16 recovery — 05:29–05:32 Pacific

The owner asked to fix the missing collection. Authenticated GitHub access was available in this continuation after the command's network restriction was handled through the approved escalation. No credential change was needed. The backup workflow was already active on default branch `main`, its `47 10 * * *` schedule was present there, and repository Actions were enabled. No repository-side schedule configuration error was found. GitHub had emitted no scheduled run; the precise scheduler-side cause remains unknown. [GitHub documents that scheduled events can be delayed or dropped](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

**The host created the overnight snapshot at `2026-09-16T09:00:02Z` (02:00:02 Pacific).** The authorized recovery used only `collect-latest`; no new capture, API interruption, application deployment, migration or production restore occurred.

- [Recovery collection run `35096088897`](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/35096088897): success, `workflow_dispatch`, `main` maintenance revision `e8df58b92aefebd3f4ddbecde96e23a9ee1fbab0`, completed `2026-09-16T12:29:18Z`.
- Snapshot: `snapshot-20260916T090002Z-260bcfb1-9808-4111-928b-b5d87fc04f21`; newer than the installation snapshot. Its receipt identifies deployed application `5d57de217542efeafbe45b1bd654dc1ed200a6be` and migration `20260916000046_AddLabChangeQuoteSnapshots`.
- Receipt flags: `restore_verified=true`, `api_resumed=true`, `envelope_roundtrip=true`, `cleanup_verified=true`. Actual managed-file count/bytes remain zero; populated restoration proof remains the separate rehearsal above.
- Encrypted off-server artifact `10445867906`: 882139 bytes; unexpired, expires `2026-10-21T12:29:17Z`; ZIP digest `sha256:76544ac2f151a512e13ec55b8eab69a08a063e1863856fcaafbe56b68257872c`.
- The encrypted payload, wrapped key and receipt were downloaded and verified; all three SHA-256 entries matched. The downloaded archive files were then moved into a dedicated Windows temporary directory outside the repository. Retained nonsensitive evidence: [receipt](2026-09-15-sys06-evidence/2026-09-16-overnight-receipt.env) and [encrypted checksums](2026-09-15-sys06-evidence/2026-09-16-overnight-encrypted.sha256). No payload or key is added to repository evidence.
- The export-record step returned `backup_export_receipt=PASS` after artifact upload. Timer-install step was skipped.
- Reissued enable for the existing GitHub workflow; readback shows `active`, updated `2026-09-16T12:30:26Z`. This is a recovery action, not proof that GitHub's next schedule event will fire.
- Updated the existing 04:15 Pacific acceptance automation to recover a missed collection with `collect-latest` when a fresh host snapshot lacks a verified off-server artifact. It inspects recent runs first, never substitutes a new backup, retains the scheduled-evidence requirement and pauses only after genuine closure. This fallback is tied to the active acceptance automation, not an always-on server service.
- Post-recovery API health **200**, database ping **204**, Portal **200**.

**SYS-06 remains Blocked only on a genuine GitHub schedule-event collection. Total remains 80/81.** The overnight backup and its independently stored recovery copy are now verified. Manual collection does not close the remaining scheduled assertion. The next automatic check remains active for September 17 at 04:15 Pacific.

### September 16 scheduled follow-up — 04:17 Pacific

**SYS-06 remains Blocked; the ledger stays 80/81.** GitHub's repository run API returned zero `schedule` runs, and the backup workflow still listed only installation run `35043891714` (`workflow_dispatch`). Workflow `359220409` is active and the repository default branch is `main`. At this checkpoint the 10:47 UTC collection had not appeared, approximately 30 minutes after its configured time. This establishes missing scheduled evidence, not a confirmed host-backup failure.

The read-only status dispatch could not be submitted in this session: the local GitHub CLI credential was invalid and the selected browser was signed out. No credential or permission was changed. Consequently the overnight host snapshot, its deployed-revision/migration receipt, export receipt and new off-server artifact remain unverified. No manual backup or substitute collection was run.

Live checks at approximately `2026-09-16T11:17:35Z` returned API health **200 / healthy**, database ping **204** and Portal root **200**. The last successful API deployment listed by GitHub remains `35044889461`, source `5d57de217542efeafbe45b1bd654dc1ed200a6be`; runtime image and Portal deployment identity were not independently re-established by these health responses. The previously recorded release remains the required baseline.

Evidence: [scheduled-run query](2026-09-15-sys06-evidence/2026-09-16-scheduled-check.json). Next action: keep the authorized automation active and inspect the next actual scheduled run. If collection is still absent, use an authenticated read-only status check to inspect the host snapshot/timer before proposing any operational change. Closure still requires the new receipt and encrypted artifact; the automation is not paused while this gate is open.

### September 15 execution results

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

**Subsequent authorized application rollout:** the owner then requested API/UI production deployment and separately approved the migration. API run `35044889461` and Portal Production deployment `dpl_3WMeZTvFToF9MtTcNpKK5f2ohcNH` now run `5d57de217542efeafbe45b1bd654dc1ed200a6be`, with `20260916000046_AddLabChangeQuoteSnapshots` applied. [Release evidence](2026-09-15-production-release.md). The prior unchanged-release table above is the maintenance checkpoint, not the current application baseline. The scheduled follow-up was updated to verify the new revision/migration; public Website remains unchanged.

The owner explicitly approved checking the overnight run automatically and closing SYS-06 if its evidence passes. Automation `close-final-uat-backup-case` is scheduled for **September 16 at 04:15 America/Los_Angeles**, recurring daily only until resolved. It must verify an actual GitHub `schedule` event, a newer snapshot from the host's scheduled capture, successful collection/export receipt and unexpired encrypted artifact, plus healthy unchanged application releases. It must never substitute another manual backup. On success, update this report, the reconciliation ledger and owning plan, report totals and pause the automation. A delayed or failed scheduled run leaves the case open with an explicit next action.

The owner’s closure instruction applies to the approved software acceptance scope. Physical laboratory processing, scientific validation, provider delivery and rollout of the newer UAT application retain the separate boundaries already documented in the [final-three report](2026-09-15-final-three-acceptance.md). No production restore, new identity grant or broader release acceptance is inferred.
