# Step performance evidence

Status: implemented and verified locally, September 18–19, 2026. Automated and browser results are recorded in the owning test plans and the traceability/governance verification records. Subsequent governance work adds independent review of on-behalf entries and performer/time amendments. Real bench acceptance and production activation remain separate.

## Product scope

Laboratory operators need to distinguish when work actually happened from when its evidence was entered. The same capture applies to individual protocol execution and shared preparation steps. The later governance slice adds on-behalf entry and independently reviewed performer/time amendments using existing roles. Multiple performers and per-tube time overrides within one shared entry remain deferred. See [evidence governance](LAB-EVIDENCE-GOVERNANCE-CONTRACT.md).

New UI records and repeats require confirmation of the actual performer and time. Choose **Now** to confirm performance at the server recording time or **Earlier** to enter a minute-precision local date/time and a late-entry reason. The browser displays its time zone, rejects nonexistent local times and requires a choice for repeated daylight-saving times. It sends an explicit offset. Future entered times are rejected on both client and server. This is operator-attested evidence, not an instrument measurement or independent proof that the physical work occurred.

Corrections continue to require the existing Supervisor authority and reason. They preserve the previous performance evidence, including unknowns, and link to the exact preceding step record. The correcting supervisor is recorded as recorder, not substituted for the original performer. A performed step cannot become a skip. Skips, including automatic conditional skips, never acquire performance evidence.

## Compatible API extension

`POST /api/platform/lab-operations/executions/{id}/steps` and `step` commands on `/api/platform/lab-operations/preparation/batches/{id}/commands` (including the existing report-upload variants) accept optional `performance`:

```json
{ "mode": "now", "personallyPerformed": true }
```

or:

```json
{
  "mode": "earlier",
  "personallyPerformed": true,
  "performedAt": "2026-09-18T09:30-07:00",
  "lateEntryReason": "Entered from the contemporaneous bench worksheet."
}
```

- Personal entry derives the performer from the authenticated actor. On-behalf entry supplies an identified Phaeno staff ID with `personallyPerformed: false` and a required reason, and creates an unverified proposal atomically with the step. Existing role, eligibility, version and coverage guards remain.
- `earlier` accepts only `yyyy-MM-ddTHH:mm±HH:mm`, with a valid calendar date and offset; reason is trimmed, nonempty and at most 4,000 characters. It accepts no server-local/offset-free time. The offset fixes the instant; the API does not claim to verify a separately named geographic time zone.
- `now` accepts no entered timestamp. Personal Now rejects a late-entry reason; on-behalf Now requires one. Both time modes support personal entry or explained on-behalf entry with independent Supervisor review.
- `performance` is rejected on corrections and skips. A correction copies prior performance automatically; new work uses a record or permitted repeat.
- Omitted performance stays unknown for compatible writers. Existing API clients are not globally forced onto a new policy. New optional preparation fields are omitted from serialization when null, preserving old command fingerprints and exact retry handling.
- Preparation captures one server time for the command receipt and all member step records. Existing batch transactions include performance validation, per-tube evidence, resources, exceptions and attachment handling. Exact retries reuse stored evidence and cannot advance the timestamp.

## Persistence and reads

The existing `lab_ops.lab_protocol_executions.captured_results_json` evidence envelope retains schema version 1 with additive optional record fields. Every new record or repeat with performance stores:

| Field | Meaning |
| --- | --- |
| `performance.performedByUserId` | Actual performer ID: authenticated actor for personal entry, explicitly selected staff for pending on-behalf entry; not inferred from older recorder metadata. |
| `performance.performedAtUtc` | Server timestamp for Now; the normalized instant for Earlier. |
| `performance.utcOffsetMinutes` | Zero for server-time confirmation; exact submitted offset for Earlier. |
| `performance.precision` | `server` or `minute`; late-entry precision is not inflated. |
| `performance.entryMode` | `now` or `earlier`. |
| `performance.lateEntryReason` | Trimmed explanation for Earlier, otherwise null. |
| `correctsRecordId` | On a new correction only, the exact prior record ID for that execution/step. |

`recordedByUserId` and `recordedAtUtc` remain server-owned, separate fields. The existing preparation record's `details_json` retains the submitted capture mode/time/reason; resolved evidence belongs to each covered execution and points back through `preparationRecordId`. Existing append-only domain behavior preserves originals. IDs inside JSON are logical references, not new relational foreign keys.

No EF model/column change or migration is required. Old JSON is readable without backfilling performer/time or correction links. The evidence reader rejects malformed new performance metadata rather than presenting it as valid evidence.

Execution detail and preparation member history display performed and recorded identity/time separately, with the retained original offset/precision for late work and the reason. The existing authorized readers resolve both performers and recorders; missing names retain the stable user ID. Preparation detail adds `recorders: [{ id, name }]`. No external audience or new endpoint authorization is introduced.

## Limits and remaining policy

This slice does not establish measured step start/end duration, historical performer-role verification, acceptable late-entry age/review thresholds, cross-step physical chronology. Execution start/end are existing workflow timestamps and must not be used to invent physical timing. Late performance entry does not backdate inventory transactions, resource snapshots or eligibility checks, and does not establish historical lot/calibration validity. These remain scientific/product-policy work in the [owning plan](SAMPLE-TRACEABILITY-AND-INVESTIGATION-PLAN.md#11-productscientific-decisions-to-settle-before-dependent-implementation).

The governance extension checks verified performer/time coverage on profiled analyses and unresolved reviews on governed result paths. Scientific profiles, consolidated investigation, reports and synthetic local restore are now implemented. Real producer/bench/hosted recovery acceptance and production activation remain separate.

## Local verification checkpoint

The full backend solution build passed (zero warnings/errors), frontend typecheck and changed-file lint passed, and documentation generation/check passed for 56 guides. EF reports no pending model changes. Diff and plan link checks passed. Unit/PostgreSQL/E2E cases are authored but unrun; browser/physical acceptance is pending. No migration, commit, push, deployment or production activation occurred for this slice.
