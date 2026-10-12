# Historical Website recovery inspection — October 12, 2026

The Owner approved committing, pushing and running a protected read-only check
after asking whether the pre-reset Website entries are recoverable. Source
`66bf382dfa0671af196b9aa3c287f8fe0c560a63` is pushed; the
[inspection run](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/38265260932)
completed successfully using the existing protected SSH identity and strict
host-key verification. Direct SSH from this machine was rejected; no credentials
or security settings were changed.

Actual server observations:

- `phaeno_portal_green_before_20260929` exists, with 25,343,679 bytes. Its
  connection setting remains disabled.
- `/opt/phaeno.portal-green/reset-20260929` exists.
- `final-before.dump.enc` exists and has SHA-256
  `492bee08c1fc814f8f1b3faf551ce6701207d27d2f96be5b53e4117e0f93cfac`.
- `final-before.key.enc` exists and has SHA-256
  `19c4729538bd3fe0eb9d10b217b4482292cf500a80b4a52b077e2f31458c7ccd`.
- Both hashes exactly match the [September 29 restore-verified receipt](hosted-clean-reset-release-20260929.md).
- Live data and the old database's connection setting are unchanged; no backup
  was decrypted and no restore was performed.

Recovery copies are confirmed available. This is catalog, availability and
checksum evidence, not a fresh isolated restore or a verified current export of
the exact Website rows. The [recovery plan](../plans/WEBSITE-INTAKE-RECOVERY-PLAN.md)
requires selective Website extraction, preservation of current data and historical
opt-outs/completion, duplicate/reference review and explicit authorization before
any hosted import or connection-state change. Do not roll back the whole Portal
database or recreate historical notification backlog.

Application source remains the deployed Website operations release `dedae5d2`;
no application deployment, migration or reset occurred. Portal/Website automatic
deployment holds remain. Local evidence is retained under
`output/website-record-recovery-20261012/`.
