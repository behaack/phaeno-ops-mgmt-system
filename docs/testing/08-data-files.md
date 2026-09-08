# 08 — Files, curated data and retention

Use [shared prerequisites](TEST-DATA.md). Curated Data Library grants and operational result releases are different workflows. Do not apply operational release deadlines to curated packages without their owning policy.

## DAT-01 — Managed source intake and immutable curated publication

**Setup:** P-FILE; owned/de-identified source evidence; harmless approved-format files with known checksums; controlled scan failures.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Register source shell, build draft revision and upload approved files through managed storage. | Size/type/checksum/scan/storage identity retained; source ownership is explicit, not inferred from processed customer data. |
| 2 | Try readiness/publication with missing ownership/de-identification evidence or failed/pending file scan. | Gate blocks readiness/publication; editable draft remains and no partial external version appears. |
| 3 | Resolve gates, mark exact source revision Ready, then create curated draft from it. | Ready source immutable; draft captures exact source snapshot. |
| 4 | Review title/summary/scientific context/manifest and publish, then mark eligible. | Atomic immutable package version; publication/eligibility grants no organization access by itself. |
| 5 | Create source/version 2 and compare version 1; archive source or retire disposable package version with reason. | Existing lineage/grants/history unchanged; retired version cannot receive new grants. |

**Handoff:** Keep eligible v1/v2 and exact manifests for DAT-02; retain original file checksums.

## DAT-02 — Exact-version grants, Department scope, upgrades and revocation

**Setup:** Published eligible v1/v2; Customer/Partner/Prospect fixtures; P-FILE; Research-only members.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Start package assignment for Company without access; follow Open Company access setup and return after reviewed setup. | Pending version/scope selection retained; Company access approval does not silently grant package. |
| 2 | Review and grant v1 to Research; compare Research, Operations and Customer B sessions. | Only authorized scope lists/views/downloads whole exact package; no per-file accidental broadening. |
| 3 | Publish/enable v2 and reopen v1 grant without upgrade. | Grant stays pinned to v1. |
| 4 | Explicitly upgrade to v2; refresh/retry. | One atomic supersession, prior grant/history retained, no duplicate active grant. |
| 5 | Revoke with reason, then test future access. On separate active grant deactivate/reactivate Company. | Revocation blocks future access; scope reactivation restores only still-active eligible grants, never revoked ones. |

**Cleanup:** Keep one active scoped grant for DAT-03; revoke disposable broad grants after testing.

## DAT-03 — Quarantine, investigation, clearance and withdrawal attestation

**Setup:** One source-derived package granted to two test organizations; P-FILE; controlled administrator recipients; isolated safety-concern fixture.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Quarantine affected source/package with internal reason and safe external instructions. | All affected grants suspend viewing/downloading; no deletion or grant revocation is falsely reported. |
| 2 | Use Phaeno investigation access with and without recorded purpose. | Purpose required for investigation view/download; tenant route does not bypass quarantine. |
| 3 | Clear an unchanged-safe variant with documented outcome; keep one grant revoked. | Only still-active eligible grants resume; revoked/inactive access stays blocked. |
| 4 | On unsafe variant withdraw and review affected-organization attestations/notices. | One organization attestation obligation with due/reminder/evidence, retained unsafe immutable history. |
| 5 | Record a controlled external attestation received by Phaeno. Inspect no-recipient/delivery-failure variant. | Contact/source and Recorded by Phaeno provenance retained; failed notice is recoverable without restoring data access. |

**Cleanup:** Governance resolution must follow agreed test outcome; never clear real quarantine for test convenience.

## DAT-04 — Authorized individual/ZIP downloads and completion evidence

**Setup:** Clean released Customer Lab, Trial and included Assembly packages with two files; eligible billing for Assembly; multiple authorized members; real isolated storage.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Download one file completely; inspect bytes/size/checksum against manifest and receipt. | Exact released content; completed full response recorded, not merely clicked/requested. |
| 2 | Begin another download and interrupt/cancel before completion; refresh receipt. | Attempt remains failed/cancelled/incomplete; no false retention completion. |
| 3 | Interrupt a ZIP, then successfully download full ZIP and inspect every entry/checksum. | Failed ZIP credits none of its files from that attempt; earlier successful transfers remain. Successful complete ZIP credits included files. |
| 4 | Download as another authorized organization member, then internal Phaeno user on separate incomplete fixture. | External successful file satisfies organization condition; internal download does not. Member privacy/administrator history permissions respected. |
| 5 | Try wrong tenant/Department, withdrawn release and payment-held Assembly fixture. | Current authorization/governance/commercial gates enforced for individual and ZIP routes; no bytes leak. |

**Handoff:** Keep attempted/completed transfer records with safe IDs for DAT-05. Browser fixtures alone cannot prove full provider-stream completion.

## DAT-05 — Frozen retention, warnings, grace and cutoff

**Setup:** P-ADMIN; disposable new operational releases A/B, isolated controllable deadline/commit-time fixtures; required processing/enforcement recorded as enabled for applicable assertions. Never change workstation/production clock.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Set valid test global policy and organization override with reason, then release A/B. Change current policy afterward. | Each release freezes effective version/UTC warning/standard/final dates; existing schedules never move. Invalid days or warning ≥ standard rejected. |
| 2 | Complete all external downloads for A; leave one file incomplete for B. Advance isolated clock to warning point and run enabled processing. | One warning for incomplete B; no repeated/daily warning or late stale reminder for fully completed A. |
| 3 | At standard deadline evaluate A/B and inspect display/time zones. | A closes at standard; B receives whole-package conditional grace. Later completion does not shorten B grace. |
| 4 | Test full completion committed after standard deadline and unverifiable timing fixtures. | Late success cannot erase grace; unavailable durable timing fails safely with recovery, never invented deadlines. |
| 5 | At applicable final cutoff attempt new file/ZIP requests and inspect an already admitted bounded transfer. | New requests denied independently of cleanup; earlier admitted transfer obeys original time limit/current access. |
| 6 | Inspect old undated historical release and failed/missing-recipient notice. | No invented historical schedule; retry same notice after resolving recipients/provider, keeping deadlines unchanged. |

**Cleanup:** Restore isolated configuration through supported revisions. If any process is disabled, its automatic assertion is Blocked; do not infer activation from a visible schedule.

## DAT-06 — Preservation, quarantine, byte deletion and reissue receipts

**Setup:** Disposable expired operational release with verified receipt, separate preservation and quarantine variants; authorized file admin; isolated cleanup/revocation providers.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open retained receipt and place Preserve bytes hold with reason. | Cleanup blocked; original access cutoff/deadlines unchanged; internal hold reason absent from external receipt. |
| 2 | On monitored variant use Quarantine and suspend access during active download. | Active transfer stops and new requests fail; action is unavailable when required monitoring is absent. |
| 3 | Release preservation hold after deadline; test active-transfer/shared-file/provider-failure blockers and retry existing cleanup. | Cleanup respects blockers and retries same objects; Downloads closed is not reported as Files deleted. |
| 4 | After successful isolated physical deletion inspect provider evidence and receipt/print view. | Bytes absent with verified deletion facts; manifest/checksums/original deadlines/download history still retained. |
| 5 | Regenerate/approve a new same-workflow/sample package with new file objects after deletion; link reissue with reason. Try wrong-organization/sample variant. | Only eligible lineage links; old bytes/dates are not restored; original receipt links new release and remains immutable history. |

**Cleanup:** Delete only disposable test bytes under approved test configuration. Retain receipts/reissue and restore-drill evidence; production deletion is not part of this pack's execution permission.

**Sources:** [source guide](../../frontend/src/content/docs/phaeno/data-source-registry.mdx), [grant guide](../../frontend/src/content/docs/phaeno/data-organization-grants.mdx), [governance](../../frontend/src/content/docs/phaeno/data-governance-recovery.mdx), [retention](../../frontend/src/content/docs/phaeno/configuration-and-recovery.mdx), [file plan](../plans/FILE-MANAGEMENT-PLAN.md), [retention tests](../../backend/test/ReleasedDeliverableLifecyclePostgresTests.cs), [receipt E2E](../../frontend/e2e/release-receipt.spec.ts).
