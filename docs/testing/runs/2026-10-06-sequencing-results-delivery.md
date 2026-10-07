# Sequencing results, FASTQ/ZIP, assembly QC and Customer handoff

Date: October 6, 2026 (America/Los_Angeles).
Scope: Owner-authorized local implementation; no Git mutation or deployment.

## Implemented

- Dedicated Record/Edit results workspace with explicit draft save, note-required
  corrections and immutable numbered results. Successful libraries require exact
  complete verified FASTQ sets and file/mapping confirmation before final receipt.
  Failed/no-run exemptions and no-run null actual timestamps remain.
- Batch ZIP and individual-file paths, tentative configuration, actual paired/
  single-end selection, explicit purchased run/preparation, grouped/split reads,
  generated immutable filenames and retained original/archive-entry identity.
- Bounded browser chunk fingerprints; private resumable staging; streamed FASTQ
  record and ordered mate checks; full stored-byte fingerprints/scan admission.
  ZIP inspection rejects unsafe/duplicate paths, encryption/symlinks and nested
  archives. Report/manifest entries are shown without implicit scientific scope.
- Current assembly input discovery, complete-set guards and current-version
  invalidation, managed-byte rechecks and exact ManagedLocal verification receipts.
  Real DPS adapter remains unavailable and dispatch disabled by existing setup.
- View-first assembly QC and dedicated capture: exact package, Pass/Fail/Hold,
  required decision note/report, optional metrics and explicit sequencing-input
  report coverage. Immutable review versions block approval/release until Pass.
- Package release detail shows QC and one Actions menu, preserves independent
  scientific approval/release roles and Customer Job Files and results/retention.

## Local database evidence

Target verified: localhost:5432/phaeno_ops_clean_20260919.
Applied 20261006231728_FastqIntakeAndAssemblyQc and
20261007000144_BatchFastqArchives. Five added Lab tables; archive-origin columns
on the newly added upload table are nullable for individual-file provenance.
No existing result, reference or scientific row was repaired or converted.
Complete ERD: 240 tables, 3547 fields, 582 foreign keys.

Before/after snapshots of saved result versions, declared locations, target batch
and sendout match SHA-256
B389EFA4E49557330D5A4FF463D382DF9ACB04A275504E90265EACF4B16C8651.
The Owner's two result versions, one declared location and current Success result
remain intact. SQL readback after browser checks: 2 result versions; 0 drafts,
FASTQ sets, ZIP staging records, scientific files, assembly attempts or QC rows.
The browser walkthrough never submitted a valid result, QC or Customer release.

## Verification

- Complete .NET solution including regression sources: builds passed. A duplicate
  using warning discovered at a later checkpoint was removed; final complete solution build passed with zero warnings/errors.
- TypeScript and scoped ESLint passed; automated suites were not run under the
  repository's request-only rule. New parser/archive regression sources and
  results workspace tests are authored and compiled, not reported as executed.
- Documentation generation/check passed: 56 guides, corpus e389874136f2.
- Updated configured local IIS API returned health 200; authenticated browser
  loaded intake metadata and current exact result. Configured layout choices
  correctly replace defaults (one PairedEnd and one SingleEnd option).
- Actual browser controls: ZIP/individual pill choice, per-library collapsed
  sections and required mapping fields; paired layout offers R2; failed library
  removes its upload control. Batch Fail hides uploads/exceptions. No-run has
  exactly three controls (reference, checkbox, reason). Empty note save is blocked
  and focuses results-notes. No external-location input remains in capture.
- 320 CSS-pixel check: no horizontal document overflow for no-run and the expanded
  successful individual-file workspace. Default viewport also has no overflow;
  temporary viewport override was reset. The original user tab/zoom was preserved.
- Dirty navigation opens a shared confirmation with header/body/footer and initial
  Keep reviewing focus. Discarding the agent's unsaved changes returns to the
  unchanged saved batch v2.

## Explicit limitations

The marked synthetic fixture at .tmp/fastq-manual-review contains no biological
data. The browser file-chooser event timed out before setFiles and reset the tool
session; no upload began. Browser screenshot capture also timed out. Documented
Chrome file-URL access guidance was given; no extension permission was changed.
DOM/accessibility and layout evidence do not substitute for the uncompleted
connected byte-upload/import/download or visual/theme screenshot rehearsal.

No current completed assembly/package exists to exercise QC or release against
real records. Real DPS connectivity, local input access, output registration,
representative vendor file size/layout validation, scientific criteria/approval,
hosted acceptance and production activation remain separate evidence gates.
No simulated provider is registered in the normal application.
