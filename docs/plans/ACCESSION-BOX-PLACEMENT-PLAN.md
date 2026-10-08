# Accession by freezer box — October 2, 2026

Status: implemented locally after Product Owner authorization and pressure testing.

## Product scope

Phaeno operators and supervisors place inspected tubes into their final freezer box during accession. Open one box per uninterrupted placement session, inspect each tube, scan it once for identity and pending placement, wait for the successful check, then place it and continue. Review the exact identities/count, confirm inspection and physical placement, and save that box group atomically. Scan the next box for the remaining tubes. The Product Owner's single-handling correction supersedes the separate initial identification pass and later placement rescan. No implicit assignment of manifest tubes to a box.

## Safety and implementation

- One prominently identified open box. A pending group cannot change destinations. Previously saved groups remain recorded per tube.
- Each scan must match this shipment's expected, undecided tubes. Reject duplicate, unexpected, already decided, held, rejected, unavailable and conflicting-location tubes. Display pending locations separately from saved intake/location records.
- Exceptions remain available directly from expected rows, including broken tubes without a readable barcode. Opening an exception pauses placement; a saved exception removes only its tube from the pending group, advances the version and preserves the other pending mappings. Require physical reconciliation and actual retained storage for a pending tube's exception. Rescan the original box before continuing. Never edit a group after an uncertain acceptance save.
- Explicit pause, window focus loss, hidden tab or offline session closes the active scan context. Preserve pending identities/box for reconciliation; require a fresh matching box scan before continuing. Delayed scan results from an earlier context cannot assign a tube.
- Review stops placement scans. Confirmation names the box and confirms both acceptable inspection and actual physical placement.
- Use the existing atomic accept-remaining endpoint for the exact box group. Freeze request ID, payload and work version after submission; failed/uncertain saves only retry the identical request. Refresh conflicts cannot silently change the group or move a tube.
- Successful groups update the version and remove only their saved tubes; remaining tubes require a new box scan. Closing/discarding explains that physically placed tubes need reconciliation and preserves saved decisions.
- Keep undecided tubes and placements awaiting confirmation in the main table. Saved accepted tubes are available in a collapsed Accessioned tubes disclosure with their actual locations; saved holds/rejections use a separate Recorded exceptions disclosure. The recorded total includes all intake decisions. These display groups do not alter eligibility, duplicate guards or saved records.
- Reuse shared Field, Dialog and Actions patterns. Preserve keyboard scanning, focus return, modal body/footer and required legends. No dependencies, auth, persisted-model, migration or freezer inventory expansion.

## Acceptance and verification

Review a five-tube single box, a three/two split, duplicate/wrong/ineligible scans, pause/resume and delayed responses, retained location conflicts, stale records, uncertain retry and dismissal. Verify individual box records, exact group payloads and version advancement, keyboard focus, narrow/dark layout and no operational writes in synthetic previews. Update the Phaeno receipt/accession guide and living test plans. Automated tests remain request-only; physical scanner/placement validation is separate from simulated UI evidence.

Single-scan acceptance: open the container directly into box entry, show remaining decisions with saved accepted/exception records available in disclosures, and require the box before tube scanning. Exactly one lookup per acceptable tube establishes its identity and pending box assignment. Confirm no initial Identify/Accept-selection stage or second tube scan remains. Exercise an exception before placement and one after a pending scan, with exact exclusion, version advancement, retained other mappings and matching-box resume. No extra dependency, backend contract or persisted-model change is needed.

## Existing model limitation

Freezer-box barcodes remain per-tube location strings. The deferred registered-box inventory, capacity, temperature compatibility, grid positions and box-movement model are not part of this implementation.

## Earlier two-pass verification checkpoint

The actual container and storage dialogs were reviewed in an isolated Chrome preview with synthetic API responses. Verified five tubes in one box, a three/two split with separate request IDs and advancing versions, exact per-tube locations, duplicate exclusion, matching-box resume, ignored late scans after pause, shared dismissal and locked identical-request retry after a lost successful response. Review starts unchecked without a premature submission and focuses Back to placement; completion returns focus to Done. Desktop/light and 390 × 844 dark layouts were reviewed. Evidence and its limits are recorded in [the preview evidence](../../output/box-placement-evidence/README.md).

Frontend TypeScript, scoped ESLint, documentation generation/check (56 guides, corpus `2e51b61a9afc`) and `git diff --check` pass. Regression sources were updated; automated suites were not requested or run. Existing backend transaction, work-version, request-replay and per-tube validation were inspected without changing the API or persisted model. No operational writes, physical scanner qualification or physical placement acceptance are claimed. Temporary preview server, files, cache and tab were removed; viewport override was restored. No commit, push or deployment was performed for this implementation.

Alignment follow-up: box/resume and tube-placement inputs share a control row with their submit buttons. Helper text and validation stay outside that row, so wrapped messages cannot displace the button. A styled preview of the actual component confirmed equal 32 px control heights and matching vertical centers, including a required-field error; at 390 px the controls stack and remain within the dialog. TypeScript, scoped ESLint and diff checks pass. Workflow and guide content are unchanged; no automated tests were added or run for this layout correction. Preview files, server, cache and tab were removed and viewport restored.

## Single-scan implementation checkpoint

The container loader now opens one accession workspace directly. It requires a box first, validates each inspected tube with one lookup, displays the matched sample/tube and pending destination, then saves only the reviewed box group. Expected rows retain direct exception access; recorded acceptance/hold/rejection and saved storage remain visible. The separate identified selection, Accept-selection action and second tube scan were removed.

Manual synthetic Chrome review of the actual components verified a three/two split using five total tube lookups, exact per-tube boxes, distinct request IDs and versions 1/2. A pending tube's saved exception preserved the other pending mapping and required matching-box resume; an unreadable broken tube was rejected directly from its expected row without a lookup. The remaining three acceptable tubes saved against version 3 with both rejected identities excluded. Returning from an exception focuses the box-rescan field; completing intake focuses Done without a stale-state warning or next-box instruction.

A five-tube group with a simulated lost successful response remained immutable. Retry submitted identical JSON/request ID, retained five total tube lookups and produced five unique synthetic records. Focus loss paused placement and matching-box resume preserved prior assignments without rescanning those tubes. At 390 × 844 in dark theme, fields/buttons stayed within the dialog at their shared 32 px height; only the expected-tube table scrolled horizontally. Desktop input/button vertical centers matched. Current screenshots are identified in [the evidence record](../../output/box-placement-evidence/README.md); earlier two-pass images are historical.

TypeScript, scoped ESLint, documentation freshness (56 guides, corpus `0573195885b9`) and whitespace checks pass. Regression sources and the Phaeno guide were updated; automated suites were not requested or run. No backend/model change, real intake/storage write, physical scanner qualification or deployment occurred. Temporary preview server, source/cache files and tab were removed and the viewport override restored.

## Recorded-tube disclosure and footer checkpoint

The main table now contains only undecided tubes and pending placements. Saved accepted tubes start collapsed under Accessioned tubes; saved holds/rejections start collapsed separately under Recorded exceptions. Both disclosures retain sample identities, tube barcodes and actual storage. The recorded total still includes every intake decision. Local footer wrappers center the required legend, progress count and both actions without changing shared controls.

Synthetic Chrome inspection verified the three-recorded/two-remaining screen, Enter-key disclosure opening/closing, saved-tube scan exclusion and pending placement in the main list. A mixed accepted/held/rejected fixture showed the correct separate counts and recorded total. Desktop legend/count/button centers matched; at 390 × 844 in dark theme the body stayed within 341 px and the page within 390 px, with table-only horizontal scrolling. Screenshots are recorded in the evidence README. TypeScript and scoped ESLint passed; documentation was regenerated to corpus `b1521fc994ba`. Regression source was updated; automated tests remain unrequested and unrun. No operational records were written.

## Requested release verification — October 2, 2026

The subsequent [release request](PORTAL-WORKFLOW-RELEASE-20261002-PLAN.md)
authorizes complete tests and controlled publication. The full frontend unit and
synthetic browser suites now pass, including the updated accession fixtures.
The earlier checkpoints remain historical; the current corpus is `a5744885cb96`.
No production intake record was created merely to verify deployment, and physical
scanner and scientific acceptance remain separate.
