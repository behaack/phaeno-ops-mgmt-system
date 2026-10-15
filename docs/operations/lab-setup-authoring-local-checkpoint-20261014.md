# Protocol-first Lab setup: local implementation checkpoint

Scope: the Owner-approved [visual authoring plan](../plans/LAB-SETUP-VISUAL-AUTHORING-PLAN.md).
This records the initial local implementation checkpoint, before publication was
authorized. The later Owner-requested review and hosted-test release follows the
[preserving release plan](../plans/LAB-AUTHORING-HOSTED-TEST-RELEASE-20261014-PLAN.md).
Unrelated user-card working edits were preserved.

## Implemented behavior

- Protocols is the default destination. Dedicated view-first revision pages provide
  process overview, detailed bench instructions and exact revision links. Workflow
  overviews show protocol stages; bench views resolve their pinned definitions.
- Library instructions, recording fields, workflow stages, master-mix instructions,
  reagent instructions and kit instructions share selectable sortable outlines.
  Keyboard dragging and Actions movement preserve occurrence identity and selection.
- Authors write complete procedures, approve whole revisions and explicitly copy
  compatible approved content. Copies have new occurrence identities and retained,
  server-validated source revision/occurrence references; source changes do not flow
  automatically into the receiver. Independent review/override rules remain in force.
- The former Lab-step catalog is read-only. Its authoring endpoints reject mutations
  with lab_step_catalog_archived. Material-choice read endpoints remain available.
- Illustrations have immutable managed-file receipts, protected reads, clean scanning,
  content/size admission, alt text and captions. Approval verifies exact retained bytes.
  PNG/JPEG/WebP only; animated PNG/WebP are rejected. Bench execution renders the
  pinned images for library, master-mix, reagent and kit instructions.
- Letter/A4 overview and bench print/PDF controls share those definitions. Print
  metadata includes revision/status on every page, page counts and unapproved marking.
- Kit readiness accepts complete multi-instruction procedures. Physical completion
  attests the remaining pinned instructions together, while preserving existing exact
  component, lot, barcode, label and tube-verification gates.
- Discovery tab/filter state survives details and return. Saved content that cannot
  be parsed is blocked from master-mix editing instead of being replaced with a blank.

## Preserving local conversion

Target verified before application: localhost:5432 / phaeno_ops_clean_20260919.
Migration: 20261014234438_ProtocolFirstLabProcedures.

The private owner-only recovery folder under backend/artifacts/lab-setup-20261014
contains the pre-change custom-format dump, SHA-256 receipt, readable archive index,
and before/after whole-record fingerprints. This verifies archive readability and
record preservation; it is not a complete restore rehearsal.

The first attempt rolled back on a JSON-column assignment mismatch. All original
application table fingerprints matched after rollback. The corrected transaction:

- archived seven original instruction definitions (one revision and six runs);
- renamed the recorded occurrence column, retained original IDs as source attribution
  and validated every recorded occurrence against its pinned ordered definition;
- preserved all six runs, all five recorded instructions and their actors/times,
  approval metadata, instruction text/order and original catalog definitions;
- matched all 240 unaffected table/metadata fingerprints, including both Website
  intake tables and their full contents. No reset or data deletion was used.

A final read-only comparison after browser authoring rechecked original definition
content/order/source identity and all five recorded occurrence mappings. One new
local fictional kit Draft was created by the browser check; it is not approved and
was not selected for any physical assembly. Name: Assemble — local authoring check
(not approved). ID: eb7d2ea8-7719-4e62-82af-24d1f8eb8da1. Its edited copy retains the
original approved source reference; the source definition remains unchanged.

Automatic downgrade intentionally refuses to remove retained history. Use a reviewed
forward repair or verified recovery procedure. Hosted migration/release needs its
own preserving release plan and explicit authorization. Existing S3 recovery/release
holds were not changed. Recovery file enumeration now includes illustration receipts.

## Verification

- Backend solution build: passed, zero warnings/errors; regression sources compile.
- Frontend production build, typecheck, lint and documentation corpus check: passed.
- EF model check: no pending model differences after the new migration.
- Authenticated local browser: approved protocol overview/bench, complete saved kit
  Draft, compatible copying and independently edited content, keyboard drag, click
  movement, retained selected instruction, filters/return state, required fields,
  exact revisions, whole-procedure review surfaces and context-specific editors.
- Existing master-mix revision: two instructions and exact 80/20 µL recipe retained;
  corrected nullable API-field mapping has a focused regression source.
- Dirty editor: affected procedure named, meaningful confirmation body, initial focus
  on Keep editing, retained input on cancellation, one discard confirmation, saved
  revision unchanged. A duplicate navigation prompt found during review was corrected.
- Responsive check: 390 CSS-pixel layout, no horizontal page overflow. Light/dark
  presentations visually reviewed; original light theme and viewport restored.
- Anonymous illustration read/upload: both return 401; no asset records created.
- Automated backend/frontend/E2E suites were not run, per repository scope policy.

## Remaining manual acceptance

Browser illustration upload could not be exercised: the ChatGPT Edge extension
requires Allow access to file URLs, which is disabled. The permission was not changed.
A non-personal fixture remains in the private task artifacts for a later human upload.
Authenticated image upload/read and browser-native PDF pagination/export remain
unqualified. Native print previews were not exported or represented as tested PDFs.
Touch, 200% zoom, reduced-motion and full assistive-technology acceptance remain
separate from the performed keyboard/narrow/theme checks. No scientific, physical,
production or business sign-off is inferred from the fictional authoring check.
