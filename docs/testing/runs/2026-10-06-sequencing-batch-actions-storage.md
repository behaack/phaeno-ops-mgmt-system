# Sequencing batch actions and storage entry — October 6, 2026

Scope: the Owner approved the batch action labels, removal of the manual custody
action and Whole batch / Per library storage entry with a fixed read-only data
description. This is local software verification, not physical or scientific
acceptance.

## Browser evidence

The existing local POMS page was inspected through the connected browser. The
`agent-browser` CLI is unavailable; the supported CUA browser path was used.
No fixture or saved storage reference was created during these checks.

- The completed batches show **View libraries** with one decorative eye icon,
  plus **Add external storage reference**, and no manual custody menu item.
  The shared Actions control retains one dropdown indicator.
- The one-library view shows library identity, both tube barcodes, actual
  transferred volume, source balance and recorded transfer times. It is
  read-only. Closing restores focus to the batch's Actions control.
- The six-library storage form shows read-only **Sequencing results** under
  **Data description**. Whole batch shows one location; Per library shows all
  six library/tube identities and a location for each.
- Empty whole-batch and empty per-library submissions are blocked. Expiring
  query-string locations are rejected, including when another row is valid.
  The per-library error summary names the affected library and supports focus
  movement to its field. Entering the first location clears the minimum-entry
  error.
- Radio arrow keys switch scope. Both the whole-batch draft and two entered
  library drafts survive switching. The remaining four rows stay empty and the
  form shows **2 of 6 library locations entered**. No valid save was submitted.
- Dirty dismissal initially focuses **Keep reviewing**. Keeping entries retains
  the draft; explicit discard returns focus to Actions. All preview entries
  were discarded afterward.
- Light and dark modes were inspected, with the original System theme restored.
  Desktop, tablet (767 CSS pixels) and 320 CSS-pixel phone layouts remain usable.
  At 320 pixels the modal stays within x=16 to x=304; its body client/scroll widths
  are both 267 pixels, with no horizontal overflow. Keyboard movement reaches the
  last library and notes while the action footer stays visible. Temporary viewport
  overrides were reset.

Browser logs contained a root-body hydration warning about an injected
`cz-shortcut-listen` attribute; the changed menus/forms did not report a runtime
failure. No root layout or browser extension was changed.

## Static verification and deferred checks

The complete .NET solution, including the updated controller regression source,
compiled into isolated task output with zero warnings/errors. Frontend typecheck,
scoped ESLint, documentation generation/check and whitespace checks passed.
The updated help corpus contains 56 guides with hash `5713b78787da`.

The subsequent build into the existing development output could not replace
assemblies held by Visual Studio and IIS Express (`MSB3027`/`MSB3021`). The
successful isolated solution build remains the compile evidence. The active
debugger/server was preserved; stop and restart that Visual Studio debug session
to rebuild and activate the new storage command. The live UI uses the updated
frontend, but the running API's storage-save contract has not been activated.

The API accepts the selected scope and all entered locations in one versioned
command, validates before tracking references, saves once, preserves audit
actor/time and accepts unchanged per-row retries without duplicates. No persisted
model, EF migration, data conversion or deletion is involved. The manual custody
UI/client helper is removed; saved history and automatic stage evidence remain.

Automated frontend/backend/database/E2E suites were not executed under the
repository's request-only policy. Actual multi-row database saving, rollback,
concurrent writes and network-response replay remain unverified. The browser
checks establish form behavior and physical-record visibility only.

Unrelated existing runtime/configuration edits were preserved. No Git staging,
commit, push or production deployment was performed. Temporary isolated build
output is removed after verification; output used by the running local session
is preserved.

## Follow-up: shared scope toggle

The Owner requested the established toggle instead of the rectangular tab-like
scope control. `VendorBatchDialog` now uses the shared `PillToggle`, retaining
the same WholeBatch/PerLibrary values and save contract. The controller retains
dirty tracking and directs validation focus to the selected toggle option.

Connected browser checks confirm one toggle group, exactly one checked option,
no tablist, pointer activation, arrow-key focus movement and Space selection.
The empty per-library validation focuses Per library. Whole-batch and library
drafts survive mode changes. At 320 CSS pixels the toggle is 228 pixels wide and
ends at x=261, within the modal body. Preview entries were discarded, the viewport
reset and focus returned to Actions. No valid save or database write occurred.

Frontend typecheck, scoped ESLint, documentation generation/check and whitespace
checks pass. The updated documentation hash is `1f94e3f4c17f`. Existing automated
radio-selector regressions still target the shared toggle; no new test or suite
execution is needed for this bounded replacement. The earlier API activation
and database acceptance limitations remain unchanged.

## Follow-up: compact storage form

The Owner removed Data description, requested approximately 15% more width and
approved omitting repeated visible location labels from identified per-library
rows. The API still assigns Sequencing results automatically. The description
control and text are absent from the rendered dialog. The desktop maximum is
36.8rem, measured as 588.8 pixels, versus the original 512 pixels (+15%).

All six per-library inputs show Sequencing data location as their placeholder.
Each retains a unique hidden label naming the library; rendered hidden labels
measure 1 by 1 pixel and remain exposed in the accessibility tree. The accessible
name remains after typing. A simulated temporary URL is rejected in the form;
its input retains aria-invalid and descriptions referencing both library context
and the field error. The Whole batch field retains its visible label. The scoped
visible-label exception is recorded in the owning plan.

At an actual 320-pixel CSS viewport, the modal spans x=16 to x=304. Its body
client/scroll widths are both 271 pixels, so the compact rows do not overflow
horizontally. At 767 pixels, the modal retains the 588.8-pixel width. Preview text
was cleared without a valid save, the dialog closed and the viewport reset.

Frontend typecheck, scoped ESLint, documentation generation/check and whitespace
checks pass. The documentation hash is `225ed383efd0`. Obsolete read-only
description assertions were removed and existing location selectors now use
the unique hidden labels. Automated suites remain unexecuted. No backend model,
save contract, migration or runtime activation changed in these refinements.
