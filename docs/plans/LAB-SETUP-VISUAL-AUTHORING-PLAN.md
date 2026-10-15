# Protocol-first Lab setup and visual procedures

Owner authorized implementation on October 14, 2026 after reviewing the proposed
plan. Users are laboratory authors, independent reviewers and bench operators.
The goal is to author complete procedures without navigating through a separate
Lab-step catalog, while retaining scientific recording, reproducibility and review.

## Confirmed product decisions

- Approve the complete protocol/procedure; ordinary instructions have no separate
  approval cycle. Keep independent review and explicit administrator overrides.
- Cover library preparation, reagent manufacturing, master mixes and transportation
  kits, preserving each context's supported fields and scientific rules.
- Provide overview diagrams, detailed bench instructions and capture preview.
  Support optional author-supplied illustrations and caption/alternative text.
- Protocols is the default setup destination. Reuse copies compatible approved
  content into the receiving draft, with provenance and independent occurrence
  identity; subsequent source changes never propagate automatically.

## Engineering scope

Use one compact selectable sequence with a selected instruction editor, sortable
cards and equivalent click/keyboard controls. Use @dnd-kit/react as the scoped
frontend dependency. Keep explicit draft saves, errors and a single Actions menu.
Provide view-first protocol/workflow details and exact revision views. Generate
overview, bench and Letter/A4 print/PDF presentations from the same definitions.
Keep existing fictional capture preview isolated from operational mutations.

Master-mix and kit authoring accept owned definitions instead of step-version
selections. Kit occurrence keys replace catalog IDs as execution identities;
retain original catalog references as provenance. Protocol catalog references
become source attribution rather than immutable editing locks in new drafts.
Preserve approved snapshots, active run pins, independent recorded occurrences,
capture scope, ingredient totals, lot/stock rules and approval history. Traverse
owning approved definitions for dependency and retirement checks.

Illustrations use protected, scanned managed storage with an audited configuration
asset record. Accept static PNG/JPEG/WebP; require descriptive alternative text.
Freeze exact managed file references at approval. Images used by a retained
definition cannot be replaced or deleted through authoring. Draft/preview print
is visibly unapproved; no preview values become scientific evidence.

## Data transition and release boundary

Inventory the configured local target before migration. Apply a preserving
conversion that retains old step IDs as origin metadata and gives kit occurrences
their own stable identities. Abort on unmappable records. No data deletion/reset,
silent approval, dual write or legacy fallback. Keep former catalog records as
readable historical provenance and reject their authoring operations.

Compatibility impact: kit instruction JSON and step-record identity change, and
configuration illustration storage is additive. The Owner's implementation
approval includes the planned preserving conversion. Local application follows
verified recovery/inventory; hosted migration needs a separate authorized release.
The original implementation excluded Git publication/deployment. The Owner later
authorized review, commit/push and the existing hosted-test deployment under the
[separate preserving release plan](LAB-AUTHORING-HOSTED-TEST-RELEASE-20261014-PLAN.md).
Preserve unrelated working edits.

## Verification and success criteria

- Author and approve complete procedures across all four contexts without a
  standalone Lab-step authoring or approval operation.
- Reordering preserves identity and values; duplicate/copy creates a distinct
  occurrence; copies never change when their source is revised.
- Verify source/role/concurrency boundaries, full approval, image admission and
  historical readability; failed saves keep the entered draft.
- Verify master-mix totals and resource/retirement guards, kit pinned execution,
  active batch snapshots and historical evidence after conversion.
- Check keyboard, touch/non-drag movement, light/dark, narrow/zoom, illustration
  caption/alt text and multipage Letter/A4 output including Draft watermarks.
- Build/type/lint/docs/model checks and manual previews are the implementation
  checkpoint. Add focused regression sources; run suites only when requested.

Update the ERD, API contract, Phaeno guide and living test plans in the same change.
This plan supersedes the mandatory catalog authoring portions of
[Lab steps and configuration preview](LAB-STEPS-AND-CONFIGURATION-PREVIEW-PLAN.md).
Physical/scientific qualification, a new branching engine and commercial release
are separate. Browser PDF export is included; native slide-deck export is not.

## Current API and persistence contract

All routes below have the existing /api/platform/lab-operations prefix and envelope.
Master-mix save accepts owned Steps (LabProtocolStepDefinition[]); kit workflow save
accepts owned Steps ({stepKey, name, instructions, sourceLabStepVersionId?, illustrations?,
copiedFrom?}[]). Kit run/record reads expose stepKey, scoped to the pinned run.
Reagent/protocol definitions retain their own supported fields and accept the same
optional illustration/source metadata. These are current contracts; no dual write
or old selection fallback is provided.

GET configuration-library?context=library|masterMix|reagent|kit lists compatible
approved sources. copiedFrom identifies kind, recordId, revision and stepKey and
is checked against a retained approved occurrence in the same context. A copied
instruction is edited independently; original catalog references are historical
attribution. Master-mix retirement traverses current approved protocols and exact
production workflow pins, including a prior protocol revision still in production.

POST configuration-assets?fileName takes bounded octet-stream image content; GET
configuration-assets/{id} verifies protected exact bytes. Illustration entries carry
assetId, altText and optional caption. Asset receipt IDs refer to immutable storage
keys/SHA-256/size/media/actor/time, validated on draft save and byte-verified at approval.
The two new tables and kit occurrence column are included in the complete ERD.

## Progress

Local implementation and preserving migration are complete. Backend build,
frontend build/typecheck/lint, documentation and EF model checks passed. Focused
regression sources are added/updated; suites were not run. The authenticated local
browser saved/reopened an explicitly fictional unapproved kit Draft and verified
copy ownership, ordering, contexts, revision navigation, confirmation/focus and
narrow/theme behavior. See the [implementation checkpoint](../operations/lab-setup-authoring-local-checkpoint-20261014.md)
for exact preservation evidence and remaining acceptance.

Authenticated illustration upload/read is pending because the browser extension's
file-access permission is disabled. Browser-native PDF pagination/export, touch,
200% zoom and complete assistive-technology acceptance remain unqualified. No Git
publication or hosted deployment/migration was performed. These acceptance limits
do not authorize changing browser permissions or existing release holds.

## Review and authorized release follow-up

The October 14 review fixes incomplete pinned workflow documents, loaded-version
concurrency, upload/selection races, copy capacity, stable source selection and identities assigned before movement,
latest-editor independent approval, retirement races and case-sensitive reference
searches, null metadata and excessive/malformed raster headers. Focused backend
checks pass (54 cases); seven focused frontend files pass (44 cases) when run
serially. The initial parallel frontend run hit a timing timeout under concurrent
build load; no global timeout was relaxed. Full suites/E2E were not run.

The [hosted-test release plan](LAB-AUTHORING-HOSTED-TEST-RELEASE-20261014-PLAN.md)
now owns publication, preserving migration, API pause/recovery and matching-source
frontend promotion. The earlier local checkpoint remains dated implementation
evidence. Manual file/PDF and physical/scientific acceptance limits remain open.
