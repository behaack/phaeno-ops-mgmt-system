# Website intake data recovery — October 12, 2026

The Owner requested recovery of historical Website data into the Mailing list
and Demo requests tables. Recovery is complete under the
[scoped plan](../plans/WEBSITE-INTAKE-RECOVERY-PLAN.md). Only
`website.web_contacts` and `website.web_orders` received application-row inserts.
The current Portal database was not replaced, reset, migrated or rolled back.

The source is the retained pre-reset database backup copy,
`phaeno_portal_green_before_20260929`. The original remains closed. Extraction
used an isolated, task-owned clone rather than opening or modifying the archive.
Both encrypted September 29 backup files still match their verified checksums;
no off-server private key was needed or moved. The encrypted backup file itself
was not decrypted. Column names/types/nullability—including stored language
metadata—match the current tables exactly.

Maintenance source:
`b2a5185ca716fdff75c9c21548078f131f033a8d`.
[Preview #1](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/38284319223)
and [restore #2](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/38284814766)
both succeeded. The restore requires the preview's exact source fingerprint:
`281cfbbd134a263ef194a44bd7beaad72dc6ffe5a4cf33425420e2bb2d50395c`.

| Table | Before | Added from backup | After | Active/open after |
| --- | ---: | ---: | ---: | ---: |
| Mailing-list contacts | 0 | 12 | 12 | 12 |
| Demo requests | 1 | 5 | 6 | 0 |

All five historical demo requests were already completed in the source. Their
completion state, dates and actor IDs are retained, as are original contact IDs,
creation times, language and subscription states. The existing demo request's
entire payload is preserved. Thus the open Demo requests queue correctly remains
empty; these six completed records are stored in the table. This recovery does
not reopen completed requests or introduce a completed-history UI.

The operation rejects conflicting IDs/email identities and unexpected triggers,
stages typed CSV, and briefly locks just the two target tables. Before inserts,
it captures the current two-table contents, verifies typed data round trips and
an encrypted archive round trip using the existing recovery public key. The
root-only encrypted before-table archive/key envelope is retained with hashes:

- Archive: `2e5c22cc424d9b3d51121e5d936d7ed49f9b4421da32650338089b41b6929a75`.
- Wrapped key: `32e8a71ca708d0f49827b2eb8350d3f0a65d5298ab9455b603e95a0b2ce365db`.

One transaction inserts missing IDs and verifies every restored and pre-existing
row against its full staged payload before commit. Cleanup confirms the working
database and task-owned container CSVs are removed; plaintext/passphrase files
are removed. Protected receipts and encrypted recovery copies remain on the host.
No notification backlog or delivery records are imported or replayed. No account,
CRM, commercial, scientific, file, provider, worker or authentication change is
performed. Customer-only i18n and deployment holds remain.

API health returns 200 and database ping 204 after recovery. An existing
authenticated Phaeno session shows 12 active signups; both pages work and page 2
contains the final two records. Captured browser errors are empty. No real
unsubscribe, completion or resend is performed during verification. Syntax checks
and the real preview/import/round-trip/conservation checks are the relevant
validation; application test suites were not rerun for this data-only operation.

Local evidence is retained under `output/website-record-recovery-20261012/`.
Application source remains the deployed Website operations release `dedae5d2`;
the maintenance helper and records are published separately.

The Owner also directed permanent preservation of both Website intake tables
during database rebuilds and production moves. The rule is recorded in
[`AGENTS.md`](../../AGENTS.md), including verified recovery copies, complete
record conservation and separate explicit authorization for any deletion.
