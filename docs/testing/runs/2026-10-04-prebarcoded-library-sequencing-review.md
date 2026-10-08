# Pre-barcoded library through sequencing and workflow review — October 4, 2026

## Outcome and evidence boundary

**Pass (simulated), connected local Chrome UI.** The owner requested another
library through sequencing using pre-barcoded tubes, then requested a workflow,
UX and UI review during the same run. One unused source from the existing fake
PSeq job **6WTMNUFE** was processed. Preparation, the new sequencing sendout and
the new sequencing batch are Complete. A browser reload retained the completed
batch/sendout states. All scans, quantities, QC and provider/custody statuses are
fictional demonstration entries. No physical work, real provider acceptance,
scientific sequencing files, analysis, scientific approval or Customer release
is established.

The existing six-library batch **PH-BAT-20261004-TAHDCRV5** remained Draft with
six members. The three other unused sources and second shipment phase were not
processed. No application code, configuration, migration, direct database write,
automated test suite, Git publishing or deployment was performed. The local
frontend was restored for the walkthrough; its running development process is
retained for continued use. The existing API connection recovered without
replacing its running process.

## Saved records and lineage

| Record | Saved identity and result |
| --- | --- |
| Fake job / sample | `6WTMNUFE` / Customer sample `827162`, specimen `644cebc0-619c-4e29-a373-d82ef90f1d81` |
| Source tube | `9595-01-07`; fictional transfer `0.010 mL`, balance `1.5 → 1.49 mL`; exhaustion override not selected |
| Preparation batch | `e24e94cf-756c-40c2-a5ff-756c3afe80a1`; automatic identifier `item-d3a88695ccdb4d26aa1703ed51595c30-20261005-045051`; Complete |
| Physical tray | `DEMO-PREBARCODE-TRAY-20261004`; existing DEMO PSeq 2 × 3 format; only A1 occupied |
| Library tube | `DEMO-LIB-PB-20261004-07`; manufacturer **Tubes and more**; container `929f32db-8868-479a-820f-d6386ca6f608` |
| Library output | Fictional `20 µL`, `5 ng/µL`, simulated Pass QC; location `DEMO-LIB-FB-20261004`; identity confirmed with supplied barcode |
| Sequencing batch | **DEMO pre-barcoded library 07**, `PH-BAT-20261005-JJFW5SJD`, UUID `63aab01e-e550-4eee-8df7-63e25d08e14c`; one member; Complete |
| Sequencing tube | `DEMO-SEQ-PB-20261004-07`; manufacturer **Tubes and more**; container `7902ed64-acff-49c4-ad16-f0b15579b8c3`; location `DEMO-SEQ-RACK-20261004` |
| Sequencing transfer | One saved pair; fictional `5 µL` transferred; library balance `20 → 15 µL`; Catalog minimum `5 µL`, PSeq RNA Sequencing version 5; exhaustion override not selected |
| Sendout | Provider **SIMULATED DEMO NGS provider**, reference `SIM-SEQ-20261004-07`; Preparing → Shipped → Received By Provider → Sequencing → Complete |
| Custody | `SIMULATED_HANDOFF`, simulated provider/location and reference; note explicitly states no physical handoff or provider receipt |

Existing approved **DEMO PSeq library workflow** v1 and its three-step protocol
were reused. The new library used its assigned manufacturer tube throughout;
no library or sequencing label was printed. Both identities were separately
entered for each saved transfer. The sequencing destination allocation left
the library at 20 µL; recording its transfer changed it to 15 µL. The source
was not charged again for prepared yield. Preparation QC was reused for library
eligibility.

The fresh master mix `52137d74-7d78-401f-a0ab-162102aa2944`, barcode
`PH-MX-52137D747D78401FA0AB162102AA2944`, reused **DEMO Master Mix — 100 µL**
revision 1. Fictional uses were 80 µL `DEMO-BUF-20261003` and 20 µL
`DEMO-ENZ-20261003`. Both procedure steps carry explicit simulated notes; the
second records fictional 30-second mixing and Pass QC. The completed mix made
100 µL; the new tray used 10 µL. Its calculated 90 µL remainder was explicitly
discarded with a simulated reason, leaving the measured-discard field blank.

## Recommended improvements

These are findings and proposed changes, **not implemented behavior**. Preserve
separate allocation, physical transfer, yield, QC, scientific review and release
facts; preserve explicit saves, exact-command recovery, concurrency and audit.

| Priority | Observed friction | Recommendation |
| --- | --- | --- |
| 1 | The preparation form still said no Ready mix existed after the mix was completed in another tab. Closing/reopening the step did not update it; a full preparation-page reload did. | Refresh eligible mixes when the step opens or the operator returns, and expose a bounded Refresh action that preserves entered values. Verify both cross-tab creation and disappearance after discard/expiry. |
| 1 | A manufacturer-barcoded output showed “Open the output tube to print and scan back its label.” No printing was needed or performed. | Tailor the instruction to barcode source. For manufacturer tubes, direct the operator to scan the existing supplied label; keep the print/attach/verify prerequisite for generated labels. |
| 1 | Shipped, Received By Provider, Sequencing and Complete saved immediately from the Actions menu, without an event-time/evidence form. Batch start/completion had explicit time forms. | Add a compact confirmation naming batch, provider and proposed status, with actual occurrence time and relevant provider/custody evidence. Keep one Actions dropdown and separate recorded time from occurred time. |
| 2 | When no Ready mix existed, the step offered explanatory text but no action to prepare one and return to the waiting step. | Provide a contextual Prepare mix path that carries the required recipe/revision and returns to the preserved preparation draft. Show this prerequisite before the operator reaches the blocked step. |
| 2 | New preparation identifiers expose the internal `item-<UUID>` service key. The operator cannot recognize the service from the main identifier. | Display the service name and readable batch identity prominently while retaining the immutable saved identifier and separate tray barcode. Avoid rewriting history. |
| 2 | Required single-sample inputs started collapsed. The transfer form also displayed an empty Batch entries heading; the yield form offered redundant common defaults for one tube. | Open the sole required sample by default, omit empty sections, and keep shared defaults behind disclosure when they do not help. This changes the earlier explicitly approved collapsed-card policy and should be settled as a product refinement before implementation. |
| 2 | Creating a batch required leaving the completed preparation workspace, creating it in Sequencing batches, then scanning membership. The draft selector showed only the generated batch number. Sequencing records have no primary detail link in this list. | Offer contextual create-and-return handoff, identify drafts by name plus number, and make the batch identifier open a stable view-first workspace with members, pairs, manifest, custody and next action. Keep creation and membership as reviewable saves. |
| 3 | The fresh mix initially warned that a different supervisor must approve a recipe deviation before any ingredient had been entered. | Distinguish incomplete ingredient capture from a completed deviation and show the required remaining ingredients first. Retain genuine deviation approval. |
| 3 | The page showed “1 tubes,” “1 libraries,” long twelve-place decimals for whole µL amounts, and title-cased status labels such as Received By Provider. The password-manager extension repeatedly announced menus on operational fields. | Use count-aware labels, readable amounts without changing stored precision, sentence-case presentation, and review barcode/quantity field autofill hints. The extension's contribution needs a focused reproduction before attributing every interruption to the application. |

Supporting implementation locations:

- [Preparation mix query and step composition](../../../frontend/src/features/lab-operations/PreparationBatchPage.tsx)
- [Ready-mix empty state and resource fields](../../../frontend/src/features/lab-operations/PreparationResourceField.tsx)
- [Required sample disclosure and section composition](../../../frontend/src/features/lab-operations/PreparationStepDialog.tsx)
- [Sequencing list, direct status commands and batch Actions](../../../frontend/src/features/lab-operations/LabOperationsPage.tsx)
- [Recipe completeness/deviation presentation](../../../frontend/src/features/lab-operations/MasterMixDetailV2.tsx)
- [Preparation identifier allocation](../../../backend/app/Features/LabOperations/Controllers/LabOperationsController.Preparation.cs)

## What worked and review limits

The partial-tray path worked, the same supplied library barcode survived output
creation, and no label-print workflow was required. The one-pair sequencing form
made its source, destination, fixed Catalog minimum and before/after balances
clear. Saved evidence retained one transfer, with 5 µL in the sequencing tube
and 15 µL in the library. The sendout could progress only through its offered
status sequence. Preparation completion and sequencing completion persisted
through reload.

Review covered connected rendered text, controls, normal keyboard-capable
actions and persisted workflow state. Chrome screenshot capture repeatedly
timed out, so no screenshot, pixel-level layout, contrast or narrow-viewport
acceptance is claimed. No artificial evidence files or sequencing datasets were
created to imply real provider work. Remaining output capture, assembly,
scientific review and Customer release remain separate workflows.
