# Historical Website intake recovery

Prepared October 12, 2026. Status: inspection prepared, not published or run.

The Owner explicitly approved committing, pushing and running the protected
read-only verification on October 12. This authorizes inspection only; it does
not authorize live recovery, connection changes, a deployment or a reset.

The Owner asks whether the Website entries excluded during the September 29
clean reset are recoverable. The [reset receipt](../operations/hosted-clean-reset-release-20260929.md)
records the original `phaeno_portal_green_before_20260929` database with
connections disabled, plus encrypted backup files that passed disposable restore
verification. Their present availability is not yet confirmed. The recorded
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
