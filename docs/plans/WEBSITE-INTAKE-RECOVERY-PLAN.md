# Historical Website intake recovery

Prepared October 12, 2026. Status: read-only inspection complete; recovery copies
confirmed available. The Owner subsequently authorized recovery of the two
Website tables; the guarded preview and additive import are complete.

The Owner explicitly approved committing, pushing and running the protected
read-only verification on October 12. This authorizes inspection only; it does
did not authorize live recovery, connection changes, a deployment or a reset.
The Owner then explicitly requested recovery from the backup into the Mailing
list and Demo requests tables. This authorizes the scoped recovery below.

The Owner asks whether the Website entries excluded during the September 29
clean reset are recoverable. The [reset receipt](../operations/hosted-clean-reset-release-20260929.md)
records the original `phaeno_portal_green_before_20260929` database with
connections disabled, plus encrypted backup files that passed disposable restore
verification. Their availability was initially unconfirmed. The recorded
local recovery directory is absent in this checkout. The API hostname resolves
to an already trusted SSH host, but this machine's key is rejected. No live
database, connection setting, file or application has been changed.

## Read-only inspection

The prepared [manual workflow](../../.github/workflows/inspect-website-recovery.yml)
reuses the existing protected production SSH secrets and strict host-key checks.
It has no schedule, push trigger, restore mode or data-mutation input. It reads
the PostgreSQL catalog for the retained database's existence/size and disabled
connection state. It checks the encrypted dump/key-envelope availability and
hashes against the recorded September 29 receipt. It does not connect to or
re-enable the retired database, decrypt backups, expose private keys or record
contents, restart services, migrate, restore, deploy or change live data.

Publishing requires the Owner's Git authorization under AGENTS.md. A successful
job is not itself proof that copies exist: inspect its explicit existence and
checksum results. Availability/checksum evidence is distinct from a fresh
isolated restore and row-count/column verification.

## Subsequent recovery boundary

If inspection confirms usable copies, prepare a Website-only extraction and
comparison from an isolated recovery source. Preserve current Portal data and
the current demo request; do not roll back the whole database. Review duplicate
IDs/emails, retained completion/unsubscribe state and audited user references.
Preserve original timestamps and opt-out decisions. Do not recreate a notification
backlog or send historical messages. Current-model conversion is a one-time
repair, not a runtime compatibility layer. Actual hosted import/restoration and
any connection-state changes require explicit Owner authorization after the
candidate records and impact are concrete and reviewable.

## Confirmed availability — October 12, 2026

Inspection source `66bf382dfa0671af196b9aa3c287f8fe0c560a63` was committed/pushed
under the Owner's explicit approval. Protected run `38265260932` succeeded.
The retained pre-reset database exists, has 25,343,679 bytes and still has
connections disabled. The server recovery directory and both encrypted files
exist; their SHA-256 values exactly match the September 29 restore-verified
receipt. This confirms recovery copies are available. No current row extraction,
fresh isolated restore, private-key decryption, live import or connection-state
change was performed by inspection. See the [inspection receipt](../operations/website-intake-recovery-inspection-20261012.md).

## Authorized two-table recovery

Use the retained pre-reset database as the verified database backup copy. Clone
it into an isolated, task-owned working database; leave the original's connection
setting disabled. The encrypted dump/key envelopes remain unmodified and their
verified checksums are required before extraction. This avoids needing or moving
the off-server private decryption key. Do not restore the entire backup into the
live Portal database.

The [guarded helper](../../deployment/hetzner/green/recover-website-intake.py) and
[manual workflow](../../.github/workflows/recover-website-intake.yml) target only
`website.web_contacts` and `website.web_orders`. Preview validates exact column
names/types/nullability, including shadow language metadata, stages typed CSV,
reports candidate/current/active counts and rejects conflicting IDs or normalized
emails. Existing identical rows are preserved. The source fingerprint from that
preview is required for restore. No dependency, runtime/model, schema migration,
authentication or application deployment changes are involved.

Restore briefly locks the two target tables while readers continue normally.
Before inserts, it captures both current tables, verifies typed CSV round trips,
encrypts a scoped backup using the existing recovery public key, verifies an
encryption round trip and retains the encrypted archive/key envelope on the host.
It inserts only missing IDs in one transaction, verifies every recovered row and
every prior row's full payload, then commits. Any pre-commit failure rolls back.
Unexpected conflicts or source/schema drift stop the operation for review; no
deletion, overwrite, truncation or additional data restoration is authorized.

Original IDs, timestamps, language and unsubscribe/completion states are retained.
No notification deliveries/backlog are imported or replayed. Current scientific,
commercial, account and file data and all provider/worker settings are preserved.
Task-owned database/container-file and plaintext intermediates are removed after
verification; root-only receipts and encrypted rollback copies remain. Rollback
after commit requires review of newer activity and separate authorization; do not
restore an old whole database or blindly delete later records.

Acceptance requires actual preview counts/fingerprint, verified before-table
backup, atomic conservation checks, cleanup, unchanged original archive connection
state and authenticated queue reads. Current active queues may exclude recovered
completed/unsubscribed records; recovery does not reactivate historical records.

## Completed recovery — October 12, 2026

Maintenance source `b2a5185ca716fdff75c9c21548078f131f033a8d` was published for
the requested recovery. Preview `38284319223` succeeded with 12 contact and five
demo-request candidates, no conflicts, matching schemas and source digest
`281cfbbd134a263ef194a44bd7beaad72dc6ffe5a4cf33425420e2bb2d50395c`.
Restore `38284814766` succeeded with verified before-table encrypted backup,
atomic import, exact source/prior-row conservation and task-owned cleanup.

Final counts are 12 mailing-list contacts (all active) and six demo requests
(all completed), including the preserved existing request. The original backup
database stays closed, no messages replay and no other application tables are
modified. API health/database ping pass; authenticated Portal reads reach all 12
contacts across two pages. No model migration or application deployment occurs.
See the [completed recovery receipt](../operations/website-intake-recovery-20261012.md).
