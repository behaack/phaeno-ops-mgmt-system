# Sequencing results to Customer delivery

## Batch data summary correction — October 10, 2026

The Owner's UI journey saved Results v1 for two synthetic samples, each with ten
verified FASTQs, but the batch still reported missing data based only on the
superseded external-reference model. Batch detail now reads its exact current
results snapshot through the existing API/query key, displays library/run/set
version/count/layout and a link to file identities, and counts saved verified
sets as data handoff. External reference strings remain optional and unverified.
Loading or failed snapshot reads do not declare files missing. This changes UI
presentation only; no receipts, bindings, outcomes, model or API contract change.
Connected UI confirms both ten-file counts and removal of the false warning.
Static checks are recorded in the October 10 UI workflow review; automated
suites remain request-only.

Status: local implementation complete; bounded verification recorded, October 6, 2026.
The Owner requested replacing declared FASTQ locations with local uploads,
assembly initiation, QC capture, and Customer download publication. This plan
records that direction and the accepted discovery decisions. Implementation and local verification are recorded below. Real provider activation, scientific/hosted acceptance and deployment remain separate.

## Product outcome and users

An authorized Lab operator receives a vendor report, associates verified FASTQ
files with the exact library sequencing result and purchased sample/run, starts
assembly, and follows the attempt. The producing team records QC evidence; the
Scientific Reviewer independently approves the exact eligible output package.
The Result Release Manager explicitly makes that package available to its
Customer. The Customer downloads released deliverables from Files and results
in the owning Job.

The scientific chain is:

`Source tube → library → vendor submission/member → vendor result version → purchased sample/run → verified FASTQ file set → assembly attempt → analysis/output package → QC/scientific approval → Customer release`.

Assembly success, QC Pass, scientific approval, and Customer availability remain
separate facts. Delivery follows existing per-sample/purchased-run rules; it does
not require download acknowledgement or payment.

## Current foundations and gaps

| Area | Current foundation | Required extension |
| --- | --- | --- |
| Vendor results | Numbered immutable `LabVendorResultsVersion` snapshots, per-member outcomes, frozen manifest. | Replace declared locations with complete verified FASTQ uploads for every successful library before saving the vendor result version. |
| Uploads | Private resumable chunks, SHA-256/size, scan admission, read-back verification, specimen-scoped immutable scientific receipts. | FASTQ layout/completeness mapping and batch upload workspace. Replace the fixed 1 GiB FASTQ ceiling with validated file/set limits in configuration; initial values are explicitly tentative. |
| Assembly | Start dialog, attempts, actual start/stop/final disposition, durable messaging/recovery and transient progress. | Ready-to-start sample/run queue and a real local-input adapter. Runtime uses `UnavailableLabAssemblyProvider`; current verified-input representation assumes S3 bucket/key/version. |
| QC | Sequencing summary plus measurements or checksummed report; exact-package scientific approval and contributor/reviewer rules. | Discoverable assembly-output QC capture tied to the exact analysis/package. Scientific thresholds must not be inferred. |
| Release | Governed packages, explicit publication, scoped downloads/retention and sample/run delivery accounting. | Connect assembly output and QC to the existing release path without a duplicate publication bridge. |

Source inspected October 6: `ScientificUploads`, `ScientificFiles`,
`LabScientificFiles`, `ScientificWorkspace`, `ScientificCaptureForm`,
`AssemblyStartDialog`, `AssemblyJobs`, `LabAssemblyService`,
`LabAssemblyProvider`, `PSeqResultPackagesController`, `ResultReleasePage`, and
the Lab/scientific evidence and Phaeno help contracts. No build, test, provider
execution, upload or data write was performed during this discovery.

For this new scope, the Owner's local-upload direction supersedes the older
raw-files-outside-POMS assumption in the
[Order-to-Cash plan](PSEQ-ORDER-TO-CASH-GAP-CLOSURE-PLAN.md) and S3-first input
assumption in [sequencing assembly](SEQUENCING-DATA-ASSEMBLY-PLAN.md).
Local means API-managed private storage, not a browser-selected path. Existing
approval, preservation, release, commercial and messaging rules remain.

## Accepted workflow direction and planned UI

1. **Prepare the result and upload files.** The Owner requires FASTQ uploads
   before successful vendor results can be saved. Record results / Edit results
   opens a dedicated resumable workspace containing job reference, actual
   run/receipt times, outcomes, notes and per-library uploads. Show library,
   sequencing tube, Customer sample and purchased run. Remove declared-location
   inputs from this new capture. Draft/upload progress does not mark Results
   received or publish a saved result version. Failure and Run not performed
   retain their current exemptions from mandatory FASTQ files.
2. **Review and save results.** Support multi-file selection, proposed mapping,
   explicit confirmation, unmatched files, progress/retry and a persistent
   completeness assessment. Every successful library must have a complete
   admitted file set in its explicitly selected layout. Filename matching cannot
   replace member/sample/run validation. The final Save results command rechecks
   scope, current versions, outcomes, required mates/groups/parts and verified
   receipts, then atomically saves metadata, member decisions and exact file-set
   bindings as one numbered result version. Partial/failed/unmapped uploads block
   save without losing the draft or already verified uploads.
3. **Start assembly.** Use Lab operations → Data assembly → Sequencing inputs
   for PSeq Service work awaiting inputs or ready to start, and Sequencing assembly
   for requested attempts. Partner Assembly cases remain a separate workflow
   reached from Order ops → Partner services → Data assembly → Open Lab work.
   Sample/run detail shows confirmed files and recipe/version. Start assembly
   reviews and freezes the complete set. Explain missing prerequisites and
   unavailable processing. A batch convenience action creates separate attempts
   for eligible allocations, never one combined result across purchased runs.
4. **Record QC and obtain approval.** A view-first QC workspace for the exact
   successful assembly output shows files, lineage, software/settings/reference
   versions and actual times. Accepted first version: Pass / Fail / Hold,
   required decision note, an uploaded QC report and optional named measurements.
   Retain the criteria/profile version where defined. Do not add automatic
   scientific threshold decisions until laboratory criteria are agreed.
   Preserve the current minimum of named measurements or a checksummed QC
   document where applicable. Fail/Hold blocks approval/publication and leads
   to rework. Scientific approval remains an explicit independent action.
5. **Release results.** The approved package and existing Result release queue
   lead to a review of Customer, Job, sample/run, exact version, deliverables,
   QC/approval and retention, followed by Release to Customer. Publish access
   to frozen verified bytes; do not move/delete internal evidence. Show the
   owning Customer download destination. Retain notifications, cutoff,
   withdrawal/replacement and completion-aware downloads.

Queues are form-free and records open stable view-first pages. Use shared Actions
for multiple actions in one context and a named button for a sole action.
Bounded capture uses shared dialogs; combined result capture/uploads and detailed
QC warrant dedicated pages for context and resumability. This records the
complexity-based exception to the prior bounded results modal: multiple member
files, long transfers, mappings and final review must remain resumable. Preserve keyboard/focus, dirty
navigation, phone containment, themes, required markers and existing permissions.
No auth expansion is proposed.

## Proposed FASTQ identity and names

POMS generates canonical names/private keys; staff do not manually rename files
to make them acceptable. Retain the original vendor filename. Database binding
and immutable manifest are authoritative; names are a readable cross-check and
cannot establish biological provenance alone.

Proposed canonical name:

`<LibraryKey>__<LibrarySequencingResultId:N>__F<setVersion:000>__G<group:000>__R<read>__P<part:000>.fastq.gz`

Example with illustrative IDs:

`PH-L-Q6EDBVRZJE-3__a24f22df965d456898316afe6ec85a90__F001__G001__R1__P001.fastq.gz`

- The immutable library sequencing result ID binds exact vendor result version,
  submission member/tube/library and purchased sample/run. Retain all UUIDs and
  readable identities in its manifest.
- File-set version distinguishes replacements without overwriting predecessors.
- Group identifies a paired/single-end unit with actual flowcell/lane or merged
  lane metadata. Do not invent a lane when unknown or merged.
- R1/R2 denote read roles; parts distinguish explicitly split files. Positive
  set/group/part numbers have at least three digits, not a 999 maximum.
- Permitted layouts, compression and file/set sizes are configurable with
  explicitly tentative defaults. The operator selects the actual layout; do not
  infer single-end merely because R2 is absent. Use `.fastq` only for verified
  supported uncompressed input; never change suffix without verifying bytes.

Read/lane concepts follow
[Illumina FASTQ documentation](https://help.connected.illumina.com/basespace/files-used-by-basespace/fastq-files)
and [DRAGEN output documentation](https://support-docs.illumina.com/SW/dragen_v42/Content/SW/DRAGEN/OutputFiles.htm).
This is a POMS convention, not a promise every tool accepts it. Preserve original
metadata and use an explicit staging manifest for a provider's required names.

Private storage uses server-owned immutable IDs under a short configured local
root. Never accept client storage keys, expose paths, or use dates/personal
sample names/vendor filenames as sole identity. Verify path containment and
Windows filename/path limits.

Finalization requires full stored-byte checksum/size verification, accepted
compression/FASTQ structure, nonempty content, explicit mapping and complete
required-file coverage. Paired layouts require mates, group/part coverage, read
counts and compatible read identifiers. Retain validation result/version;
integrity is separate from scientific QC. Do not guess sample/index mapping from
headers. Stream bounded validation/scanning with explicit failures: increasing a
configured byte limit alone is insufficient.

Exact retries reuse receipts. Conflicting bytes/mapping require a new version
and note. Each assembly freezes exact files/checksums and result/file-set
versions. Later vendor corrections cannot reassign, rename or overwrite used
inputs. Surface conflicting current outcomes for further assembly/review/release;
already released packages follow controlled correction/withdrawal.

Staged files bind to a reserved result-draft identity and exact member scope;
that reserved identity is not a saved results version. Final save links them to
the new immutable result version only after all guards pass. Editing may retain
existing verified file sets when applicable; metadata edits must not require
reuploading unchanged valid bytes. A newly successful library needs a complete
file set. Changing layout/mapping or bytes creates a new set with an explanatory
note. A stale save preserves the draft/files and requires reconciliation; it
cannot silently rebase attribution onto the newest vendor result. Abandoned
draft cleanup follows approved staged-upload rules and never deletes preserved
scientific evidence.

## Tentative FASTQ configuration

The Owner does not yet know typical/largest files or vendor read layouts and
directed that these assumptions be parameterized in configuration and documented
as tentative. Implement a feature-owned `LabFastq` configuration section;
configuration and effective limits must be visible to the uploader before file
selection. The following are starting engineering values, not vendor-validated
scientific requirements or capacity commitments:

| Setting | Tentative initial value | Behavior |
| --- | --- | --- |
| `MaximumFileBytes` | 1,073,741,824 (1 GiB) | Configurable FASTQ ceiling rather than an embedded constant. Larger values require verified storage/scanner/validation support. |
| `MaximumFileSetBytes` | 17,179,869,184 (16 GiB) | Sum of admitted input files for one library/sample/run file set; enforce before and during receipt. |
| `MaximumFilesPerSet` | 256 | Bounded explicit file/group/part mapping; align with the existing assembly input limit. |
| `AllowedReadLayouts` | `PairedEnd`, `SingleEnd` | Both supported provisionally; actual layout selection is required for each file set. |
| `AllowedCompression` | `Gzip`, `None` | Verify actual representation and appropriate extension before admission. |
| `AllowMultipleGroups` | `true` | Explicit flowcell/lane or declared merged-group mapping. |
| `AllowSplitParts` | `true` | Explicit complete group/part declarations and mate coverage. |
| `DraftLifetimeHours` | 24 | Resumable staging lifetime, aligned with current upload sessions; expired drafts retain clear recovery guidance. |

Keep the established 4 MiB chunk transport initially. Validate configuration at
startup, bound decompression/record length/total validation work, enforce disk
capacity admission and retain scan/integrity gates. A byte setting cannot admit
a file beyond the actual scanner/storage capability: display and enforce the
effective limit, and report configuration incompatibility explicitly. Do not
increase limits for general scientific attachments as a side effect or bypass
scanning for larger FASTQ files. Record the effective validation/layout policy
with the completed file set so later configuration changes do not rewrite it.

Document tentative values beside the example configuration and in operator help;
keep secrets/storage credentials external. Replace assumptions with reviewed
vendor values when representative files are available. No automated QC pass/fail
cutoffs are configured as though they were approved scientific criteria.

## Provider and output custody

Reuse server-owned attempts/commands/receipts and the adopted POMS–DPS MQTT
direction. A real method for DPS to read exact local inputs and return verified
outputs remains necessary: a Windows path cannot establish access from another
machine. Resolve access/staging from the real DPS contract, without asking the
Owner to choose software mechanics. Do not invent wire contracts, simulate
scientific success or enable dispatch to demonstrate UI.

Before QC, register immutable managed output files and a complete attributed
manifest from the successful attempt through completed-analysis and governed
package services. Performed software/settings/reference versions and times come
from processing, not receipt time/defaults. Missing/changed files block review.
Deliverable formats follow accepted service scope; FASTQ/FASTA/BAM are not
silently made mandatory for every service.

## Owner decisions — October 6, 2026

- Unknown FASTQ sizes/layouts: parameterize the assumptions in configuration and
  document the initial values as tentative.
- QC first version: Pass / Fail / Hold, required note, optional measurements and
  an uploaded report; automatic threshold checks wait for agreed criteria.
- Uploads precede final results save. The separate-save-then-upload recommendation
  was declined and is superseded by the combined resumable capture above.

The three discovery questions are resolved. Representative-file validation,
real DPS access/wire details and future scientific cutoffs remain evidence and
integration prerequisites, not reasons to ask the Owner to choose software
mechanics. Resolve service deliverable/profile gaps from accepted scope.

## Delivery, data and acceptance boundaries

Use four reviewable slices: FASTQ custody/mapping; assembly readiness and real
local-input integration; assembly QC/exact approval; Customer release handoff.
Update owning contracts, audience guides and living test plans with implemented
slices; keep proposed and available behavior distinct.

Persisted identity/file-set/QC changes require EF migrations and a complete ERD
update. Before new capture requirements change, inventory affected local records
and explain remedies: preserve frozen reference-only history and capture new
explicit uploads (recommended), one-time authorized import/mapping of verified
original files, or reset/reseed specifically selected disposable data. Do not
claim strings are managed bytes, add runtime legacy repair, guess links, reset
the Owner's current test result or delete internal evidence. Destructive remedies
need authorization. Additive local migrations follow repository verification;
shared migration, auth/dependency/provider activation, Git and deployment remain
separately scoped.

Success: results cannot save while any successful library's required files are
missing or unverified; every assembly input has exact result/library/sample/run
and verified bytes; incomplete/mixed-run inputs cannot start; resumed uploads do not duplicate
receipts; Fail/Hold never publishes; released files trace to exact approval; Job
delivery counts valid Customer-accessible sample/run coverage. Staff do not type
hashes, storage paths/manifests or repeat known vendor metadata.

Prepare focused coverage for mapping/pair/part gaps, corrupt compression/read
mismatch, duplicate/interrupted upload, failures/no-run, stale edits/replacement,
unavailable processing, duplicate provider receipts, QC gates, reviewer
separation, tenant/release scope and exact downloads. Builds/static checks occur
at logical checkpoints; automated tests remain request-only. Distinguish local
verification from scientific/provider/hosted acceptance.

## Implementation checkpoint — October 6, 2026

The Owner subsequently selected both batch ZIP and individual FASTQ uploads.
Record/Edit results now opens the dedicated workspace. Draft metadata and exact
member/run/preparation/layout/group/read/part mappings use RHF/Zod and server
validation. Final save requires complete admitted sets for every successful
library and explicit file/mapping confirmation. Failure/no-run exemptions remain.
New captures have no declared-location bridge. Unchanged verified sets can be
retained; result edits keep required notes and sequential immutable snapshots.

Private four-MiB transfers use a bounded browser chunk fingerprint, server full-file
hashing, scan admission, stored-byte verification and streamed bounded FASTQ checks.
Mate counts/ordered identifiers must match. ZIP uploads have bounded sizes/entry
counts, safe relative paths, no encryption/symlinks/nested archives, inspected
manifests, proposed library/barcode matches, explicit mapping review and reasoned
exclusions. FASTQ entries are individually imported/scanned/verified with retained
archive/entry provenance; ordinary reports/manifests are listed but not implicitly
assigned as scientific evidence. ZIP bytes are staging and expire with the draft;
admitted scientific FASTQ files and origin metadata remain preserved.

Assembly input choices now use current result-version inputs, exclude superseded
files, enforce complete file sets and reverify managed bytes before requesting
processing. Normalized provider verification supports exact ManagedLocal file
identities as well as immutable object storage. The application still registers
UnavailableLabAssemblyProvider; no wire contract or simulated scientific processing
was introduced. The real DPS connection/access/output integration is still needed.

Successful linked assembly packages have view-first QC history and a dedicated
capture page. Decisions are immutable package-specific numbered records with note,
report, optional measurements and explicit sequencing-input report coverage.
Passing QC can satisfy the declared input-QC coverage; software/settings/reference,
times, source lineage and independent approval remain required. Package admission
and scan completion can precede this QC capture; approval and publication cannot.
Release detail includes exact QC and one shared Actions menu for record navigation
and publication, with an affected-scope confirmation body and Cancel focus.

Local migrations 20261006231728_FastqIntakeAndAssemblyQc and
20261007000144_BatchFastqArchives are additive. They create five Lab tables and add
nullable archive-origin fields to the new FASTQ upload table. Both were applied
only to localhost:5432/phaeno_ops_clean_20260919. Complete ERD: 240 tables,
3547 fields, 582 FKs. Two existing vendor results versions and one declared location
were preserved; their before/after record snapshot hash is
B389EFA4E49557330D5A4FF463D382DF9ACB04A275504E90265EACF4B16C8651.
No current result repair, reset, production migration, Git mutation or deployment.

Tentative archive defaults: MaximumBatchArchiveBytes 16 GiB,
MaximumArchiveExpandedBytes 64 GiB, MaximumArchiveEntries 512. Per-file/set,
expanded FASTQ length and read-layout/compression policy remain configurable.
Effective transfer limits are the lower of configured upload and scanner capacity;
the current local scanner configuration admits 100 MiB. Layout arrays replace
configuration defaults, so restricting to one layout does not append another.

Verification evidence is maintained in
[the local run record](../testing/runs/2026-10-06-sequencing-results-delivery.md).
Automated suites remain request-only. Local builds/UI/file-staging evidence must
not be reported as real sequencing, successful DPS execution, scientific approval
or Customer production release.

Final static checkpoint: full .NET solution build 0 warnings/errors, TypeScript, scoped ESLint, 56-guide documentation generation/check and diff checks passed. No automated suites were run. Browser controls/320px/focus checks passed; file chooser and screenshot automation failed before an upload began. Two saved result versions remain unchanged. Live DPS/provider, byte-upload/import and scientific/Customer release acceptance remain explicitly unverified.

## Review gap closure — October 6, 2026

The Owner authorized all six review fixes and their focused regression coverage.
Final result validation holds each selected file-set admission lock through commit,
serializing it with new upload rows and ZIP imports. Informational edits retain
the original output IDs for unchanged sets when vendor reference and actual times
are unchanged; scientific changes create correction outputs only where affected.
Corrections that invalidate approved/published packages require their explicit
withdrawal by the existing release authority. Previously released withdrawn
packages remain valid replacement targets. Active dispatch/running inputs cannot
be changed until cancellation/reconciliation or final disposition. Queued work
rechecks current vendor results before dispatch; analysis and QC admission also
recheck current inputs. Approval/publication checks hold the sendout lock through
their own transaction so a result correction cannot race them.

Restart draft explicitly reserves a new identity against the current submission,
preserves the reviewed entries and admits only complete actor-owned file sets
from the same sendout as recovered read-only evidence. Recovery scope is
server-owned draft metadata; ordinary saves cannot manufacture it. Incomplete
staging is preserved without being silently rebound. ZIP reselection retains
reviewed rows and command identities; server receipts restore completed imports
when switching archives. New attribution receives new command identities.
No persisted model change, migration, legacy data repair, provider activation,
Git mutation or deployment is required for this slice.


## Current sendout manifest v3 acceptance — October 9, 2026

The UI mock sequencing walkthrough created a current schemaVersion=3 vendor sendout. Saving verified FASTQs failed because LabResultLineageService accepted only versions 1/2. Align the reader with the current v3 writer and existing custody reader: allow v3 and apply the complete sequencing-tube/transfer/quantity/source-chain validation used for v2. Unknown versions remain rejected; no membership inference, data repair, schema or migration change. Existing physical-lineage regression source now runs the same rejection/accepted-chain journey for v2 and v3 and includes unsupported-version rejection. Build the solution/test sources; do not execute suites under the standing rule. Rebuild/restart the API, then retry the saved UI result draft without recreating files or changing the frozen manifest.

Verification: full solution and regression sources build with zero warnings/errors. After the owner rebuilt/restarted the API, the same UI result draft saved Results v1 successfully with four verified FASTQs and both specimen outcomes Success. Reloaded stored checksums match all four original files; each specimen has only its own two outputs. No automated suites, schema changes or direct data workaround. See docs/testing/runs/2026-10-09-m82n5jtb-mock-sequencing.md for mock qualification and remaining UI findings.


## Scientific review queue correction — October 9, 2026

Owner confirmed this queue must contain assembled work ready for scientific
review, not every received Job. This supersedes the earlier broad results list.
A dedicated read-only scientific-review-queue endpoint uses the existing Lab-role
boundary, selecting exact ReadyForReview output packages linked to reconciled
Succeeded assembly with matching organization/Job/specimen/analysis and latest
package QC Pass. On-hold/cancelled Jobs and already-approved packages are excluded.
Qualifying Jobs are selected before the 250-row limit; each row reports its
pending package count and opens Job Review with return context preserved. No
schema, records, provider settings, approval rules or release behavior change.

The existing PostgreSQL FASTQ/QC scenario now covers sequencing-only exclusion,
completed-package-without-QC exclusion, Fail/Hold/Pass, a later Hold overriding
Pass, restored Pass and approved/released removal. Frontend sources cover pending
counts, empty and failed reads. Suites remain unexecuted unless requested.
API restart and connected verification follow the static build checkpoint.

Verification completed locally: full API solution and expanded regression sources
compile with zero warnings/errors; TypeScript, scoped ESLint, generated help
consistency (56 guides, af945a2e207d) and diff whitespace checks pass. After the
Owner rebuilt/restarted the API, connected read-only UI acceptance confirmed the
new query returns an empty scientific-review queue, M82N5JTB is absent after
Refresh, and its two specimen/run input sets remain in Data assembly. The empty
state was inspected at desktop and 375 px in light theme with no horizontal
overflow; temporary viewport override reset. Final screenshot is retained as
scientific-review-queue-corrected.png. No records or scientific/provider state
were mutated. Positive completed-package scenarios are covered in compiled
regression sources but were not executed, and no qualifying live assembly fixture
exists locally. Dark-theme and automated-suite acceptance remain unperformed.
