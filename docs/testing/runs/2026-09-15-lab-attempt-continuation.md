# Specimen-attempt UAT continuation — September 15, 2026

This pass finishes eight targeted LAB-09 check groups and fixes an actual draft-loss defect. **LAB-09 remains incomplete; whole-case acceptance stays 33/81 (40.7%), with 48 remaining.** Its remaining policy/replay, completed-legacy and independent scientific-approval variants are listed below. No partial checks are counted as another passed case.

## Connected results

| Check group | Observed result and retained evidence |
| --- | --- |
| Legacy policy/adoption | The existing TEST ONLY legacy fixture had one specimen-level Planned execution and no selected source. Operator policy adoption was denied; Supervisor explicitly reviewed the instruction and confirmed it through the UI. Selecting the accepted source attached the existing execution to exactly one attempt. No new execution was created, and the unrelated job-level execution remained Planned/unlinked. |
| Competing selection/start | Two actual Operator/Supervisor sessions reviewed the source before selection. First selection succeeded; second returned 409. Wrong source barcode returned 400. First start succeeded; stale second start returned 409. A cancellation dialog opened before start retained its entered reason after the stale cancellation was rejected. The selection dialog's title changes after refreshed attempt data; the initial exact-title harness assertion was corrected without repeating selection. |
| Policy/history protection | Attempting policy adoption after processing started returned 409. The separate historical source-less fixture also rejected adoption and retained its full work DTO, original execution and zero attempts. No historical source identity was inferred. |
| Operational hold/resume | Actual Supervisor Hold attempt records owner, reason and next action. Source selection and step evidence are blocked while held. Resolve attempt hold resumes the same attempt and source; no fallback starts. |
| Same-attempt QC repeat | On the existing expressly simulated protocol, initial QC Hold, permitted repeat Fail and permitted repeat Pass retain the same attempt. Hold/Fail keep it unresolved and refuse another source selection. Successful repeat restores InProgress. All previous QC evidence remains. These are prescribed software values and a TEST ONLY reference, not measurements, new material/equipment use, a real output container or scientific validity. |
| Retirement between stages | Supervisor records the prescribed final simulated QC and completes only Stage 1. The attempt stays InProgress with Stage 2 unassigned. Retirement impact includes this exact Job as active work, and a confirmed retirement attempt returns `protocol_processing_dependency` (409). Full protocol DTO and attempt workspace remain unchanged. |
| Held/cancelled concurrent clients | Two real sessions concurrently attempt selection, policy adoption and next-stage assignment on each of the retained explicitly synthetic OnHold/Cancelled Job fixtures: 12 responses are 409 `execution_work_unavailable`. Complete work and attempt readbacks remain unchanged. This supplements the retained true source-intake-versus-start race in the [tube-intake run](2026-09-14-tube-intake-uat.md), which already proved that an unavailable source cannot start. |
| Keyboard/draft/narrow themes | Keyboard opens the attempt action; blank submission shows both required-field errors. At 390×480, light/dark modes have no page overflow and the action footer remains visible. Declined discard preserves both edited fields; accepted discard closes and returns focus. No action is saved by these layout checks. Settled dark screenshot was inspected; an earlier capture during theme resolution was replaced after verifying the computed foreground token. |

## Defect fixed

**Edited attempt details could be lost on Escape without a discard question.** The dialog read React Hook Form's dirty flag only inside callbacks, so it did not reliably subscribe to changes. Reading the flag during render fixes close/navigation protection. Before-unload protection now also includes a pending save.

The actual connected check failed before correction and passed afterward: declining discard retains the entered reason, accepting discard closes, and focus returns. The new focused `LabSpecimenPage.test.tsx` regression covers retained evidence, navigation protection and absence of business writes. That test, TypeScript, scoped lint and generated documentation checks pass. Updated Phaeno execution help explains the recovery. No API, model, dependency or authentication change was needed. Generated corpus: 56 guides, hash `7661d1beb1ba06cc1fa91e05b3b98b270f8e3127cf8d2ae6f0003c74a6349138`.

## Independent readback and continuation

- Work `defb6430-cd68-4b1a-933d-3bcff4428908`, **TEST ONLY LAB10-13 LEGACY**, now uses the confirmed run-one/failure-fallback policy. This intentionally advances its earlier [legacy refresh checkpoint](2026-09-14-tube-intake-uat.md); it does not change the original owner walkthrough.
- Exactly one attempt: `86393a06-c31b-4692-921c-7127dd728a51`, InProgress, source `9c9cb844-3726-4253-83e8-792a632a550b` / **PH-S-6PE233LHYE-U**. Operational hold is resolved.
- Original execution `9ee7f278-aa99-4e47-81b7-1cfe2f53612b` is Completed with five evidence records: identity, Hold, Fail repeat, Pass repeat, and Supervisor Pass. The unrelated job-level execution is still Planned. There is no Stage 2 execution or new source attempt. Preserve this between-stage checkpoint.
- Historical fixture `8eeff58b-61c0-4fc5-8b61-1059e55bb938` retains zero attempts and its original source-less processing record. The unknown-intake and foreign-specimen tubes were not selected or changed.
- Held Job `d0787311-f869-42c3-b31a-316551cd23b5` and Cancelled Job `b4b19f7f-7c56-479e-9b34-8fa4fe451ae8` retain their original planned attempts/tray history. No temporary role grants or configuration were introduced.

PostgreSQL readback independently verifies source/attempt/execution identities and counts, all five retained evidence records, policy and event history, and no historical attempt. HTTP journals retain the rejected requests, actors, versions and complete before/after DTOs. Backend DTO/JSON nesting, enum spelling and endpoint assumptions were corrected in the harness; rejected requests did not save, and successful actions were resumed from the journal rather than repeated.

Environment remains UI `https://localhost:3016`, API `https://localhost:7116`, database `127.0.0.1:5436/phaeno_ops_lab06_uat`. Existing API binary, external-provider restrictions and inactive retention processing remain unchanged. No deployment, shared migration, external message or Git mutation. All browser sessions/interceptions are closed. No physical or scientific approval is claimed.

## Remaining LAB-09 closure work

1. Step 1: close the explicit one-/three-tube policy crosswalk, older unfinalized order confirmation preserving snapshots, and historical V1 authorization replay. The new standard and Trial submission evidence is reusable, but does not itself demonstrate every older-policy variant.
2. Step 12: add the explicit Completed historical legacy variant. The Started historical denial and successful unstarted adoption are now covered.
3. Step 9: retain the existing successful attempt/library/batch path, then provide the required positive independent scientific-approval evidence from an eligible controlled output. Reviewer read-only tracing and failed approval gates are not positive approval. This is a named dependency shared with LAB-06, not another general regression round.

LAB-09 therefore moves from primarily remote scheduling to a named-gate disposition while retaining the remaining remote items above. Current scheduling split is three primarily remote cases and 45 named-gate cases; total incomplete cases stays 48. No other acceptance criteria are waived.

Ignored evidence in `tmp/uat-closure/`: `lab09-continuation.json`, `lab09-qc.json`, `lab09-stage-gap.json`, `lab09-job-guards.json`, `lab09-layout.json`, `lab09-readback.sql/.json`, `lab09-verified.json`, and `lab09-draft-light.png` / `lab09-draft-dark.png`. Connected scripts are under `tmp/uat-closure-identities/`. Resume the named remaining variants; do not rerun these saved actions.

Follow-up: the [policy/history closeout](2026-09-15-policy-history-and-shipping-access-uat.md) resolves remaining items 1 and 2 above. Only item 3, positive independent scientific approval of an eligible controlled output, remains. The saved between-stage checkpoint is unchanged.
