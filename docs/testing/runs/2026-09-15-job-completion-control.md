# Job completion control — September 15, 2026

## Outcome

Two local defects are corrected: the staff Job page now exposes the existing completion command to Commercial Operators, and the domain rejects completion with zero samples. The controlling ledger remains **36/81 Pass, 45 blocked**. FIN-01 and FIN-03 remain incomplete.

The completion dialog identifies the Job, explains invoice issuance and scientific independence, and requires deliberate confirmation. Empty, unfinished and held Commercial samples block submission. A lost response preserves the same operation key and reviewed version, including after closing and reopening the dialog. A stale-version response requires explicit reload and renewed review. Pending completion blocks repeat submission and dismissal.

## Verification

- Eight focused component tests pass, including permissions, outcomes, confirmation, uncertain response, conflict and pending recovery.
- Two backend domain tests pass: empty-roster completion is rejected without changing status/time; normal post-acceptance roster finalization remains available.
- TypeScript and scoped lint pass.
- Documentation generation/check pass for 56 guides. Fresh authenticated help search returns 200 with the matching corpus hash, and the revised billing guide renders its Confirm completion instructions (`tmp/uat-closure/completion-docs.json`).
- Actual isolated Clerk sessions: P-PRICE sees the completion control; P-ADMIN without CommercialOperator does not.
- Retained Job `TEST-TEN-BILLING-GATE`, ID `dedac238-1c7d-458c-89ab-e94e0af96420`, version 1, has zero samples. Confirmation stays disabled; before/after API data are identical. No invoice or other business write was attempted.
- Six dialog layouts at 1440/390/320 px in light/dark show no page overflow. Escape closes the dialog. Mobile screenshot inspected.
- After refreshing the isolated API, a direct authorized completion request against that same empty test Job returns 409 `order_action_not_allowed`. Job data remain identical. Independent PostgreSQL readback confirms zero invoices for the Job and zero idempotency receipts for this rejected attempt. The initial combined harness then hit an incorrect documentation-manifest field name; this happened after the guard assertions passed, and documentation verification was separated without repeating the completion request.

Local connected evidence: `tmp/uat-closure/completion-control.json` and `completion-control-{light,dark}-{1440,390,320}.png`. Repeatable local harness: `tmp/uat-closure-identities/completion-control.mjs`. Backend verification artifacts use `tmp/completion-check-build` and do not replace a deployed release.

The isolated port-7116 API now uses `tmp/completion-check-build/bin/PSeq.Operations.Api/debug/PSeq.Operations.Api.dll`, SHA-256 `323C9FA1E5D85F9AF7553E36C40365F3751F9F11E95D3CF3685A0A7383C41CF4`. The launcher preserves the existing `127.0.0.1:5436/phaeno_ops_lab06_uat` database, local storage, scanner settings and disabled external senders. Health returns 200/healthy. Help corpus is `39652c4798a2…`. No deployed environment changed. Guard evidence is `tmp/uat-closure/completion-guard.json`.

## Remaining prerequisites

The existing Lab-to-Commercial projection advances receipt and accession, not terminal outcomes. Failed processing caused by exhausted material is distinct from rejected intake and must retain that meaning. The Product Owner has been asked whether failed specimens require a reviewed price adjustment or remain billable under the accepted quote. That decision, the supported terminal handoff, and the approved positive scientific journey still precede FIN-01 invoice/PDF acceptance. FIN-03 reuses its completed reversal/adjustment checks and waits for the legitimate immutable PDF.

No saved laboratory outcome was changed to manufacture completion. No new fixture, real communication, shared migration, Git operation or deployment was performed in this continuation.
