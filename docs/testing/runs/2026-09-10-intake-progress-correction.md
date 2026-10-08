# Local intake progress correction — September 10, 2026

The owner authorized the receipt/accession synchronization fix and a data correction for the two reported Jobs. Scope: the configured local development database `localhost/phaeno_ops`, local API, and signed-in local Portal. No hosted data, migration, deployment, or Git mutation was performed by this task.

## Problem and resulting behavior

Physical shipment receipt and tube accession persisted successfully, but did not advance awaiting Lab work or Commercial Job/sample progress. Fully accessioned containers left the accession queue while their Jobs remained excluded from Work.

The first recorded shipment arrival now advances awaiting Lab work to Received. The durable projection updates the Commercial Job to InProgress, propagates verified sample receipt, and marks a sample Accessioned only after all its expected tubes across active shipments have been accessioned. Existing holds, later and terminal states remain protected. Scientific acceptance remains a separate action.

## Completed correction

Saved a before-state snapshot, loaded the corrected local API, and used each existing Lab work record's signed-in **Change milestone → Received** action once. This published the saved intake facts through the same durable projection delivery used by future receipt/accession actions. No tubes were rescanned or recreated.

| Job | Samples / tubes | Commercial status | Commercial version | Lab status / version |
| --- | --- | --- | --- | --- |
| 69SJN4PA | 7 / 26 | PlacedAwaitingSamples → InProgress | 13 → 14 | AwaitingSpecimens → Received; 1 → 2 |
| HS5Y7DB7 | 9 / 18 | PlacedAwaitingSamples → InProgress | 15 → 16 | AwaitingSpecimens → Received; 1 → 2 |

All 16 Commercial samples now have Accessioned status, their existing Lab accession identity, and the exact persisted Lab receipt timestamp. Both Commercial projections report Received at version 2. All four existing/new projection events for the two Jobs are published, with four matching delivery receipts and no delivery error.

Full before/after comparison established that all saved Lab specimens, 44 Lab containers, registered tubes, and shipments are unchanged. This includes physical identity, freezer-box values, actual receipt times, scientific intake disposition, and acceptance/target fields. No box value was interpreted or corrected. Both work-order turnaround targets remain unset.

Local evidence is retained in `artifacts/intake-progress-before.json`, `artifacts/intake-progress-after.json`, `artifacts/intake-progress-delivery.json`, and `artifacts/intake-progress-verification.json`. These contain local operational records and are not public help content.

## Verification

- Signed-in Phaeno Work lists both Jobs as Received, with 7 and 9 specimens respectively. Signed-in Customer Lab services lists both Jobs as In Progress.
- Three domain regression cases passed: replay/identity preservation, held-sample progress, and later/terminal-state protection.
- Four focused PostgreSQL cases passed: the registered-tube receipt/accession journey, complete Commercial/Lab operator journey, monotonic/replay-safe projection delivery, and whole-kit versus partial-fill behavior. The registered-tube fixture also verifies that an outstanding second shipment prevents complete accession until that unused shipment is cancelled. An initial test expectation overlooked that fixture; the corrected expectation and rerun passed.
- Solution build passed with zero warnings/errors. Frontend typecheck and scoped receipt-panel lint passed. Documentation generation/check passed for 56 guides. Whitespace checks passed.
- Local API `/api/health` returned HTTP 200 after reload.

The focused cases establish local application behavior. Physical scanner hardware, Partner browser acceptance, and hosted release acceptance were not exercised. No broad suite or production release is claimed.
