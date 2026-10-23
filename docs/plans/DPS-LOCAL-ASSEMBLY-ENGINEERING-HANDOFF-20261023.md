# DPS local assembly engineering handoff — October 23, 2026

Status: **reviewed DPS source/evidence committed locally; DPS push blocked by repository write access; deployment and real pilot held**.

The Owner selected assembled sequences first and deferred reference matching and gene summaries. The implementation changes DPS and its native runner, with no Portal runtime/API, database, authentication, MQTT wire contract or hosted configuration change. At the original verification checkpoint, no Git publication, deployment, hosted worker start or real pilot had occurred. The Owner subsequently authorized review, commit and push only; deployment and the pilot remain held.

The [owning plan](REAL-ASSEMBLY-HOSTED-TEST-IMPLEMENTATION-PLAN.md) controls activation. The [original engineering handoff](../operations/real-assembly-engineering-20261022.md), [original package](../../integrations/dps/README.md) and original receipts remain intact. The [publication index](../../integrations/dps/local-assembly-20261023/README.md) points to the separate, preserved source/proof bundle in the private DPS checkout.

## Review and publication follow-up

Review found no blocking issue for source publication. All 35 committed source paths match the verified patch's canonical bytes; all 14 preserved artifacts match their original exact hashes. Focused tests were not repeated because the reviewed runtime source is identical to the passing checkpoint. No algorithms, contract, approvals, scientific catalog or hosted state changed during publication.

The private DPS branch `codex/real-assembly-sequences` contains source commit `0aecd977f1f516fece22284a10f8b08f81939ab8` and complete evidence head `45d75837e8875bbd2df1fcb4ad649beb7a13f40a`. GitHub rejected its push with HTTP 403 and reports `behaack` has read permission but no push permission. It is the only configured GitHub account. The completed commits remain local pending repository write access or an authorized push route; no remote branch, PR or merge is claimed.

The Portal repository is public and DPS is private. Keep the new native source and detailed test/build evidence in private DPS, at `docs/engineering/real-assembly-20261023/`. The public Portal change contains this planning handoff, living plans and a publication index/status only. Original package snapshots remain byte-preserved, including historical pre-publication flags. A second original completion-package copy remains at `.tmp/dps-local-completion-package-preserved-20261023`. See the [publication status](../../integrations/dps/local-assembly-20261023/publication-receipt.json).

## Delivered locally

- DPS maps every frozen group/part/mate to a private UUID-derived dataset/sample. Original compressed files remain retained; derived plain FASTQs, hashes and original identities are recorded. Recovery verifies existing configuration/request/files instead of silently repairing changed bytes. Expansion, workspace and free-space reserve limits apply.
- A file-only native entry invokes existing Cluster and Inchworm before shared startup. It prohibits database connections, disables external log notifications, rejects legacy entry commands in this build, and checks exact workspace/input/identity bindings. This internal request does not extend the Portal/MQTT contract.
- Native file plumbing uses the selected file metadata, checks file-open/early-EOF failures and invokes pinned BLAST directly with arguments/stdin. Existing scientific query/options and matching/assembly algorithms are retained. The optional NCBI bridge is excluded; accidental use fails explicitly.
- Every produced SMID is assembled. Combined FASTA retains attempt/SMID/native-header attribution. The summary lists every input and SMID, including clusters with no qualifying contigs. Zero assembled contigs fail. These outputs never claim reference matching, gene summaries or scientific QC approval.
- Offline candidate preflight verifies hashes, architecture, actual adapter/version and tool versions without a broker, ledger, approval or assembly. Scientific availability still requires the existing bound dataset/reference/QC approvals. The shipped catalog remains **simulation only**.
- The preparation-only release procedure selects exact clean committed source, Rust 1.93.1, .NET SDK 9.0.307, locked existing dependencies and the file-assembly feature. It records actual versions, resolved runtime libraries and binary/source/build-input hashes without installing tools or activating anything.

The first milestone requires `assembly_output` (FASTA), `assembly_summary` (JSON), and adapter-owned `provenance_report`. Scientific parameters remain explicit and approval-bound. Fixture values and synthetic approval records must never be copied into a deployment catalog.

## Verification

| Check | Result | Boundary |
| --- | --- | --- |
| Actual native build | Pass; `phaeno` 1.0.192 with `pseq-file-assembly/1`; libraries resolved, no NCBI bridge | Local Ubuntu 24.04.3 Linux x64 |
| Focused DPS regression selection | **77 passed, 0 failed, 0 skipped** | .NET 9 Linux x64, including native/process fixtures |
| Same selection on Windows | **61 passed, 0 failed, 16 skipped** | Linux-only cases covered by the Linux run |
| Actual synthetic native journey | 8 FASTQs, 2 groups × 2 parts × 2 mates, gzip/plain; **2 SMIDs, 2 contigs** | Fictional isolated data, no biological qualification |
| Publication/recovery | 3 outputs + manifest, 4 create-only uploads; injected final verification failure recovered twice with the same invocation marker and stop time | Fake isolated S3, actual native engine and actual Portal manifest validator |
| Rejections/holds | Changed scope/reference/derived bytes, extra files, missing/unknown/invalid settings, disk/expansion limits and changed prepared request | Invalid evidence cannot produce a successful publication |
| Existing lifecycle/recovery | Pass: process fencing/cancellation, controlled shutdown, interrupted-stage holds, stable publication versions and receipt preservation | Hosted supervisor acceptance still pending |
| Source handoff | 35 changed/new/deleted files; clean apply, every resulting source hash and reverse check pass | Exact retained merged PR #2 tree, no Git mutation |

The native build has zero warnings/errors. A separate Linux C# build has two existing CS1998 warnings in `DpsMqttServer` and `S3StorageClient`, zero errors. No Portal/frontend/E2E suite was rerun because this follow-up changes no Portal runtime/UI source. Operator documentation and living plans were updated; browser-bundled help does not advertise an unshipped scientific capability.

The original source/build/verification receipts and raw results retain their exact bytes in the private evidence bundle and the preserved local package. The [publication status](../../integrations/dps/local-assembly-20261023/publication-receipt.json) records their hashes. Combined patch SHA256: `81e029134dd58acfc14f98abbb29634baafa55baf8703ae884410db5701bd2d0`. Local native binary SHA256: `f86d4afcbfcc8874c7c11ad541855afdb664730d9dc8d01d028a8afb789eebda`.

## Contract and history preservation

`poms-dps/1.0`, the vendored Portal schema and shared MQTT messages remain unchanged. DPS DTOs match the preserved first engineering package, which completed reference provenance already required by that schema. This follow-up adds no wire fields or Portal endpoint.

The original patch remains SHA256 `31420bba1f321f4636985208c3fb5e835bfc9bab60e25e30586bf3e54cb5db2f`; its source and verification receipts are unchanged. The combined patch contains source only, with no historical ledger, receipts, execution journals, FASTQs or hosted records. No original disputed receipt, reconciled execution, repeat attempt, command, event, storage version or recovery directory was edited. Synthetic fixture directories are separate and removed after use.

No hosted readback was performed in this local follow-up. Earlier hosted counts/health remain historical evidence, not a new live health assertion.

## Remaining gates, in order

1. **DPS push:** review/commit/push is authorized and local review/commits are complete. Grant write access or provide an authorized push route, then push the existing branch without recreating source or receipts. The remote main matched the exact reviewed PR #2 base at this check. If it changes, reconcile deliberately without overwriting concurrent work. Merge remains separate.
2. **Existing server qualification:** prepare/check pinned candidate and tools for the existing development/test server's Linux ARM64 processor. ARM64 comes from that existing machine; this task introduced no new server or architecture choice. Local x64 fixtures do not prove ARM64 execution. Verify host supervision, filesystem/quota enforcement, resource budgets and storage/scanner throughput. The sampled workspace limit is soft; hard allocation enforcement remains a host setup/qualification gate.
3. **Scientific approval:** approve dataset/use permission and specimen/purchased run; pin the tag reference; freeze scientific settings, expected assembled outputs, QC thresholds and independent reviewer. Reference matching/gene summaries are deferred. Fixtures provide none of these approvals.
4. **Preserving deployment/integration:** obtain explicit DPS deployment/start authorization, refresh protected backups and preservation baselines, retain the existing ledger/identities/receipts, and execute the owning plan's release/rollback/readback checks. Verify Describe/Query, storage/admission/scanning and unchanged history without Start. No Portal redeployment is required by this follow-up.
5. **One separately authorized pilot:** after the preceding gates, obtain explicit authorization for one real assembly. Save immutable attempt/command lineage and independently assess actual outputs against approved criteria. Preserve an honest failure/QC outcome and all evidence; do not auto-repeat.

Deployment, hosted start, scientific approvals and the pilot require their separate authorizations. Customer release remains separate.
