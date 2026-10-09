# M82N5JTB mock sequencing walkthrough — October 9, 2026

Owner authorized UI-only mock completion of sequencing and upload of mock FASTQ files, and requested an issue log. All application writes in this walkthrough use the connected local POMS UI. No direct API/SQL data mutation, authentication/production-configuration change, deployment, automated suite or external vendor communication was performed. The owner explicitly approved the local Development fixture-scanner setting; the blocking v3 reader defect was corrected in source.

## Scope and current status

Job **M82N5JTB**, specimens **MOCK-ONC-SPEC-001** and **MOCK-ONC-SPEC-002**. Preparation was already complete; both libraries passed QC and were unassigned. Created batch **PH-BAT-20261009-675TD2WH** / **MOCK-ONC-SEQUENCING-20261009** (`989b57c8-5dbe-43b4-9e9c-2ce8be23c49b`). Final saved status: **Results received**, batch completed, **Results v1**, both libraries Success. Four FASTQs are verified in two immutable Run 1 paired-end file sets. The v3 reader mismatch was fixed, compiled and loaded after the owner restarted the API; retrying the saved UI draft succeeded without recreating files or changing the frozen manifest. Chrome automation remained unavailable after permission/reload/reset; the connected in-app browser restored the draft and completed uploads.

## Saved mock records

| Specimen | Library | Sequencing tube | Simulated transfer |
| --- | --- | --- | --- |
| MOCK-ONC-SPEC-001 | PH-L-MFX8LQV48J-C | MOCK-ONC-SEQ-001 | 5 µL; library balance 20 → 15 µL |
| MOCK-ONC-SPEC-002 | PH-L-9BFEYJZNW2-S | MOCK-ONC-SEQ-002 | 5 µL; library balance 20 → 15 µL |

Catalog minimum 2 µL per pair was displayed and retained. Manufacturer **Mock - Shipping supplies**, locations **MOCK-ONC-SEQ-FREEZER-001 / A1** and **A2**. Both mock tube pairs, frozen manifest and simulated custody events saved through the UI.

The initial vendor list was empty. Added supplier **Mock - NGS sequencing vendor** (`9066d784-26ff-49ab-ba81-b82a060a1b2d`), active **MOCK paired-end sequencing** service (`df7cc7e6-7773-4585-b6c4-280675112387`), and fictional **MOCK receiving laboratory — do not ship** address. The address and service description explicitly prohibit treating the records as physical/scientific work. Saved carrier **MOCK carrier — no physical shipment**, tracking **MOCK-ONC-TRACK-20261009**, vendor reference **MOCK-ONC-NGS-20261009**.

Saved mock timestamps are October 9 in America/Los_Angeles: preparation began 08:04:30, shipment occurred 08:10:31, vendor receipt occurred 08:10:49, vendor ETA 09:00. Result draft uses fictional run 08:11:00–08:11:20 and receipt 08:11:40. Outcomes are Success for both libraries; no failure exception. Notes explicitly describe simulated mock work, no physical/vendor execution and no scientific validity.

## FASTQ fixtures

Four deterministic gzip files in `C:/@dev/phothera-appeal-system/artifacts/mock-fastq-M82N5JTB/`, named by exact library plus `_MOCK_S1_L001_R1_001.fastq.gz` or `_R2_001.fastq.gz`. Each contains four synthetic 80-base records with matching mock read IDs and 80 quality characters. No patient reads. Both library upload form mappings select **Paired-end**, **Run 1**, **New for this run**, group/part 1, and **MOCK-FLOWCELL-001 / L001**. Upload completeness was checked only after all four files were verified against the selected libraries and Run 1.

## Issues and improvements observed

| Priority | Finding | Evidence and suggested improvement |
| --- | --- | --- |
| P1 — workflow blocker, tooling | Chrome extension upload requires Allow access to file URLs. | First file chooser accepted multiple selection, but `setFiles` failed with the extension permission instruction after a long wait. No files were admitted. Ask for the permission before upload and fail quickly. This is a browser-tool prerequisite, not a demonstrated POMS upload bug. Owner enabled the setting. Chrome then reconnected under a new browser identity, but page opens still fail with a request-header-policy error. Extension reload/browser restart requested. |
| P2 — setup UX | No ready vendor requires leaving the sendout dialog for Purchasing. | UI accurately explains supplier + active address + service requirements, but offers no direct setup link or return-to-batch flow. Provide a permitted setup shortcut and preserve the return destination. |
| P2 — setup UX | Address prerequisite is revealed after selecting Sequencing service. | New supplier opens Products by default. Product form allows name/description entry, then reveals the active-address prerequisite. Completing the address required discarding/re-entering the product draft. Guide first-time sequencing suppliers through address then service, or preserve the draft through an Add address shortcut. |
| P2 — terminology | Physical tube barcode and library-key distinction deserves clearer guidance. | Both mock libraries currently use identical library key/tube barcode values, so no failure occurred. Keep physical tube barcode explicit for manufacturer-barcoded libraries whose key differs. |
| P2 — upload form clarity | Read for single-file selection is marked required during paired-file selection. | With paired-end selected, the single-read choice still displays a required marker, while the file control accepts an R1/R2 pair. Mark it conditionally required and explain that pair selection supplies the mate mapping. Final behavior remains pending upload. |
| P3 — dialog consistency | Tube preparation footer changes from Close workspace to Close after the second pair. | Both labels close the same workspace. Keep the footer label stable and offer a clear next action to prepare the sendout. |
| P3 — status clarity | Fresh batch displays Prepare shipment although its membership remains a draft. | It shows 0 libraries and Add passing libraries, then the same Prepare shipment stage after Begin shipment preparation. A visible Draft substate would make the start boundary clearer. |

The first-time setup, tube allocation, transfer, manifest freeze, dispatch and receipt commands completed without an observed application error. Performer confirmations are synthetic mock fixture records, not evidence of physical bench work. Separate scientific approval and Customer release were not authorized or performed. Findings are logged for review; no product behavior fixes are bundled into this walkthrough.

Local fixture integrity check: all four gzip files decompress, each has four correctly formed 80-base FASTQ records with matching quality lengths; R1/R2 read IDs match within each specimen. This validates only synthetic file structure, not scientific sequencing. Save draft was clicked before the connection reset; reloaded draft persistence awaits browser recovery.


Mock-upload admission follow-up: the in-app browser restored the saved results draft and both mapping forms after the Chrome tool connection failure. Specimen 001 R1 reached 100% upload and passed structural FASTQ validation, then final verification returned `fastq_scan_required`. The local default DevelopmentFixture scanner reads OrderManagement:UseTrustedDevelopmentScanner, which was false. Owner explicitly approved setting it true in appsettings.Development.json for this local mock walkthrough; a local API restart is required. Production scanning/configuration is unchanged. This is simulated file admission, not real malware-scanner qualification.

P1 application feedback issue: finalization collapses scanner unavailable, rejected and other non-clean states into “could not pass scanning.” The UI does not preflight scanner readiness, so this blocker appears only after upload reaches 100%. Surface scanner-not-configured/temporarily-unavailable separately from an unsafe-file verdict, with an Operations recovery action.


P1 reproduced application bug: final Record results rejected the newly generated v3 sendout with result_lineage_invalid / unsupported manifest version after all four files verified. Current writer emits schemaVersion 3, but LabResultLineageService allowed only 1/2 and treated only v2 as physical sequencing-tube submissions. Corrected the reader to accept v3 with unchanged physical source/transfer/quantity validation. Frozen sendout data is preserved; no API/SQL data workaround. Focused regression sources cover v2/v3 exact physical lineage and unsupported versions; execution is deferred.

Upload recovery: after the owner approved the Development fixture scanner and restarted the API, selecting the same R1/R2 pair resumed specimen 001 without creating another file set. Both sets show v1 / Run 1 / Paired-end, each R1/R2 file shows Verified with four reads, and final completeness confirmation was checked. Final Save correctly rolled back on the manifest reader error. The narrow acceptance fix and expanded regression sources build with zero warnings/errors; suites were not executed. A second API restart was requested to load this source fix.

Additional results-workspace UX observations from the verified-upload screenshot:

- P2: With both library file sets verified, the individual-upload form remains expanded with Group/Part/Read fields, Start a new file set, and an empty native file chooser showing No file chosen. Label these as add/resume controls, collapse them after verification, and put a clear complete file-set summary first. The native chooser is empty because selection is cleared after upload; the saved verified-file rows remain present.
- P2: Two libraries produce a 2,828px-high results page at a 1,264px viewport, with Save at the bottom. Provide compact completed upload cards and a persistent final completeness/save summary while keeping detailed mapping review available.
- P2: Upload cards identify the library and long accession ID, but omit the customer-facing specimen identifier (MOCK-ONC-SPEC-001/002 in this fixture). Add the friendly specimen identity for safer cross-checking without guessing from filenames.
- P2: The Library exceptions · Fail heading with unchecked rows labeled library · Success is functional but can be mistaken for row selection/completeness. Describe the checkbox action explicitly, such as Mark this library failed, and retain the effective outcome.

These are observed usability findings, not additional code changes in this walkthrough.
## Final connected verification

Results v1 saved October 9, 2026 at 08:50:33 America/Los_Angeles; the fictional occurrence times remain separate from entry time. Batch shows 4/4 vendor steps complete and completion at the mock receipt time 08:11:40. Reloaded read-only Results v1 retains two paired-end file sets and all four original names, stored identities, read counts, byte counts and checksums. SHA-256 values match the generated local fixtures exactly. File-set identities are 08954097-b880-4e81-a935-6bbecab5fb6e (specimen 001) and 76621beb-e965-43e1-8830-224aada00e22 (specimen 002).

Specimen 001 and 002 Sequencing & analysis each show one assigned library, zero unassigned libraries, Success, Results v1, and exactly their own two vendor-fastq outputs. Switching through the Job specimen picker preserves the selected tab and scope. Analysis runs remain zero; Assembly setup required is an intentional unconfigured-provider boundary, and no assembly/scientific approval/customer release was performed.

P2 reproduced batch-display bug: after successful save, the current batch still labels the section External result storage and claims Data handoff outstanding: 2 successful libraries without a batch or library storage reference. This is contradicted by the read-only Results v1 verified sets and the four registered specimen outputs. Reconcile handoff readiness with saved verified FASTQ sets rather than only the legacy declared-location collection. Do not prompt users to fabricate duplicate storage references. This display issue remains open and does not undo the successful saved results.

P3 accessibility/copy issue: the specimen-scoped sequencing table still uses the caption This Job's libraries although it correctly shows only the selected specimen. Its visible specimen column uses the accession identifier rather than the friendly specimen name.

The blocking manifest bug is fixed and verified through the actual UI save. Regression sources compile in the full solution with zero warnings/errors; automated suites were not run. No model/migration change. The approved local OrderManagement:UseTrustedDevelopmentScanner=true remains enabled in appsettings.Development.json, so this mock acceptance is not real malware scanning. Production settings were not changed.

Evidence: C:/@dev/phothera-appeal-system/artifacts/mock-sequencing-fastq-verified.png (pre-fix rejection and verified files), mock-sequencing-complete.png (completed batch), mock-sequencing-results-v1.png (saved read-only version). Synthetic originals remain in artifacts/mock-fastq-M82N5JTB. All product findings other than the blocking reader mismatch are logged for follow-up, not silently bundled into this walkthrough.