# Connected library batch send-out walkthrough — October 5, 2026

Result: **Pass (simulated local workflow)** for the resumed six-library batch.
The Owner requested a batch send-out and a UI/UX/workflow review. All new fixture
records and provider/custody evidence explicitly identify simulation. No physical
pipetting, carrier booking, shipment, vendor communication, sequencing, scientific
approval, Customer release, production write or deployment occurred.

## Preserved and created records

- Local batch **PH-BAT-20261004-TAHDCRV5**, id
  `8e80e870-684c-4abd-9502-1e380da4783b`, resumed from existing InProgress
  preparation begun October 5 at 10:52:18 AM Pacific. No second batch was created.
- Shared Lab Job `328613c6-982b-4d72-b627-7f3816743f1f` already had a preceding
  completed demo batch. That record and its transfers were preserved.
- Created Purchasing supplier **DEMO sequencing vendor 20261005**, id
  `437e7132-2e6b-4900-9eaf-abdc0a71b8a6`, with two labeled synthetic destinations,
  **DEMO receiving laboratory A** and **B**. Both addresses explicitly say not to ship.
- Created active **DEMO external sequencing**, id
  `828434d6-cdc0-4bf8-ba86-897672b4ad84`, with Product type **Sequencing service**.
- Used existing manufacturer **Tubes and more** and pre-barcoded demo tubes.
  Allocation and simulated transfer were each saved once through the UI. Each
  library began with 20 µL, transferred 5 µL, retained 15 µL and met its captured
  5 µL Catalog minimum (PSeq RNA Sequencing, version 5). No exhaustion override.

| Position | Library/source barcode | Sequencing barcode | Simulated transferred amount | Remaining source |
| --- | --- | --- | --- | --- |
| A1 | PH-L-Q6EDBVRZJE-3 | DEMO-SEQ-SENDOUT-20261005-01 | 5 µL | 15 µL |
| A2 | PH-L-XMB5AJ3D8U-B | DEMO-SEQ-SENDOUT-20261005-02 | 5 µL | 15 µL |
| A3 | PH-L-YQ9PB2X3H5-F | DEMO-SEQ-SENDOUT-20261005-03 | 5 µL | 15 µL |
| B1 | PH-L-24CCNF8NPB-Q | DEMO-SEQ-SENDOUT-20261005-04 | 5 µL | 15 µL |
| B2 | PH-L-TNNZSBY2X9-T | DEMO-SEQ-SENDOUT-20261005-05 | 5 µL | 15 µL |
| B3 | PH-L-GQLWQVTLCZ-X | DEMO-SEQ-SENDOUT-20261005-06 | 5 µL | 15 µL |

## Saved shipment and outcome

Prepared the shipment to destination A at 12:32:27 PM, then explicitly selected
destination B before dispatch with a recorded reason at 12:33:05 PM. Vendor and
service remained fixed. Shipment metadata:

- Destination: **DEMO receiving laboratory B**, 200 DEMO Avenue, Alternate Test
  City, US, with the explicit simulated/do-not-ship instruction.
- Carrier: `DEMO carrier - simulated`.
- Tracking: `DEMO-SHIPMENT-20261005-TAHDCRV5`.
- Vendor reference: `SIMULATED-UAT-20261005`, retained separately from tracking.
- Expected completion: October 6 at 5:00 PM Pacific; prefilled and reviewed at receipt.

| Event | Actual occurrence, October 5 Pacific | Recorded entry, October 5 Pacific |
| --- | --- | --- |
| Shipped | 12:44:07 PM | 12:44:17 PM |
| Vendor received | 12:44:39 PM | 12:44:46 PM |
| Sequencing | 12:44:47 PM | 12:44:57 PM |
| Results received | 12:44:58 PM | 12:45:04 PM |
| Final vendor outcome | 12:45:15 PM | 12:45:50 PM |

All events retained the operator and explicit simulated evidence. The saved record
has seven custody/status events: preparation, update, four stages and final outcome.
The failed initial dispatch did not add a duplicate event.

Saved final batch **Success**, applying to five libraries, with a **Failure**
exception for **PH-L-GQLWQVTLCZ-X**. The reason describes simulated low read yield
and explicitly disclaims a real scientific quality decision. Attempting completion
with that exception's reason empty was blocked before any write. Finalization
retained the six source balances and transfers.

Added one Whole batch **DEMO vendor result manifest** storage reference at
12:45:14 PM:
`s3://demo-sequencing-uat/20261005/PH-BAT-20261004-TAHDCRV5/manifest.csv`.
It is a placeholder only: no remote location was fetched, no file was uploaded,
and no bytes or access were verified. The UI displays **Unverified reference**.

## Gaps corrected

| Gap observed or confirmed in source | Correction |
| --- | --- |
| Dispatch failed with HTTP 500 because another batch had advanced the shared Job to DataProcessing. | Batch progress preserves advanced Job stages and holds; each stage emits a new versioned projection. Early milestone guards and repeat-run authorization remain enforced. |
| Prepare shipment was offered before tube readiness, and the form asked for a manifest review without displaying it. | Detail actions disable incomplete preparation with guidance; the preparation form shows readiness and an expandable tube manifest, and blocks saving incomplete pairs or volumes. Exact volume comparison reuses the existing decimal helper. |
| Vendor/status form closure discarded entered evidence. | Shared discard confirmation retains entries on Keep reviewing and protects navigation/unload. Closing the stacked dialogs restores focus to Actions. |
| Dispatch confirmation lacked destination, carrier and tracking. | Confirmation shows the reviewed saved shipment and sequencing service. Missing dispatch prerequisites disable confirmation with the corrective action. |
| Vendor receipt started with an empty ETA despite the saved ETA. | Receipt prefills the saved ETA and asks the operator to review it. |
| Provider or carrier reference actually updated the vendor reference. | The field is labeled Vendor reference, retains its saved value and displays carrier tracking separately. |
| Long current/frozen tube lists buried shipment and results metadata. | Shipment, outcome and storage precede physical balances; the frozen manifest is expandable. |
| Generic next-step and Save wording obscured the required action. | Next step names the exact stage and prerequisite; form actions name preparation, shipment updates, status recording or storage addition. |
| Exception and storage choices repeated identical library keys and barcodes; singular counts were awkward. | Identical labels are shown once, distinct identities are retained and counts use singular/plural wording. |
| Status form facts could remain old while a background refresh changed the submitted version. | Shipment facts and concurrency version are pinned together when the confirmation opens. |

## Browser acceptance evidence

- Vendor setup with two destinations and Sequencing service product; vendor-first
  service/address selection and complete address preview.
- Saved preparation and explicit pre-dispatch retargeting. After Shipped, Update
  shipment and ETA showed the saved destination and had no address selector.
- Successful retry of the blocked dispatch, then all four ordered vendor stages.
- Receipt retained `2026-10-06T17:00`; vendor reference was not overwritten by tracking.
- Final outcome preserved five Success rows and one reasoned Failure row after reopening.
  The Actions menu then offered tube review, custody, storage reference and manifest
  download, with no repeat status/final outcome or shipment-edit action.
- Dirty status evidence survived Cancel → Keep reviewing. Dirty storage location
  survived the same choice; Discard changes closed only the draft, wrote no reference
  and returned focus to Actions. Confirmation had a header, body and footer and
  initially focused its non-destructive choice.
- Actions opened with Enter; Escape returned focus to its trigger. Navigation from
  the list to the batch and back passed after a clean page load.
- At **320 CSS pixels**, receipt and outcome forms fit without horizontal overflow;
  receipt dialog width was about 285 px with a scrollable body and visible footer.
  Batch card Actions remained on the first row, description used the full row,
  and the status pill appeared below it. Page scroll width equaled 320 px.
- After reopening on the rebuilt API, the default wide viewport was 2,400 CSS
  pixels. Status and Actions shared the title row, description wrapped below, and
  document scroll width did not exceed the viewport. No dialog remained open.
- Downloaded CSV **PH-BAT-20261004-TAHDCRV5-tube-manifest.csv**, 2,818 bytes,
  six data rows. Each row retained its unique source/destination, 5 µL transfer,
  5 µL minimum, vendor and selected destination B. The browser download observer
  timed out after the download; the actual saved CSV was read and checked without
  repeating the export.
- The final saved record was read after reopening. Earlier mobile review images
  were saved in this task's visualization directory. Later final-page screenshot
  attempts timed out in browser capture; no synthetic screenshot was substituted.
  Temporary viewport overrides were reset.

## Verification and boundaries

- Final backend solution build and new test sources pass with zero warnings and
  zero errors; regenerated help corpus is embedded. The local API was restored
  using the rebuilt output.
- Frontend TypeScript and scoped ESLint pass.
- Documentation generation passes: 56 guides, corpus `e4ada2a54c74`.
- Generated documentation consistency and `git diff --check` pass.
- Authored domain, PostgreSQL and frontend regressions cover independent stages,
  preserved holds, early milestone guards, precise readiness, retained drafts/ETA,
  dispatch context and reviewed concurrency versions. **Automated tests were not
  run**, following the repository's request-only rule.
- Dark theme, added role/tenant boundaries, simultaneous/stale HTTP writes,
  uncertain-network retries, real bench work, carrier/vendor acceptance, scientific
  outputs and production activation were not proven by this walkthrough.
- No persisted schema or migration changed. No staging, commit, push or deployment.
  Existing staged and unrelated work was preserved; the local API and frontend
  remain available for continued review.
