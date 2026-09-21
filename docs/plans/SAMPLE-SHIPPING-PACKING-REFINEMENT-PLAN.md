# Samples and shipping refinement

Status: release verification passed September 21, 2026; deployment authorized by the owner after screen/process review.

## Approved product outcome

Phaeno administrators maintain scientific sample requirements, reusable common
shipping procedures, destination receiving details, and approved packing
details for each sample/container combination. Temperature control is flexible:
dry ice, regular ice, cold packs, another approved method or no cooling, with
any required amount and preparation. Amounts can differ by container size and
are never calculated from tube capacity. Customers receive
one complete set of instructions for their shipment and container.

## Engineering decisions

- Named shared procedures have immutable, audited revisions. Assignments select
  an exact approved revision; staff revise an assignment to adopt a replacement.
  This avoids silently changing the handling approved for existing containers.
- Existing destination/sample rules become assignments, with optional
  destination-specific additions. Legacy standalone rules remain available;
  scientific prose is never automatically merged or discarded.
- Extend existing container/sample/rule compatibility records with flexible
  temperature-control instructions and combination-specific packing steps. These
  belong to the container revision. New procedure-based combinations require
  them; legacy definitions keep their previous behavior.
- Freeze the actual container combination in issued instructions. Mixed samples
  must agree on container temperature control; never sum coolant amounts per sample.
  Historical packets remain independent of current configuration.
- Samples & shipping groups configuration. Sample details show Shipping &
  packing, linked procedures and approved containers. Preserve existing links
  and historical text while removing duplicate required entry for new samples.
- Reuse existing authorization, concurrency, modals, Actions menus and tokens.
  Add an additive migration and apply only to verified local development; update
  the ERD and affected guides. No dependency or authentication changes. The owner's
  subsequent "Fully deploy" request authorizes publishing, production migration and deployment.

## Implemented scope

- [x] Reuse one procedure across sample assignments.
- [x] Save and review different packing/temperature-control details per container combination.
- [x] Show the current setup from sample details, with exact revision links.
- [x] Freeze exact packing in packets; reject missing or conflicting new details.
- [x] Present assembled customer instructions and preserve historical rendering.
- [x] Add regression sources, update living plans, build/typecheck/lint and check generated help.

## Verification and rollout

- Backend solution builds, including regression sources, with zero warnings/errors.
  The local IIS debugger locks the usual output, so validation used the ignored
  `artifacts/sample-shipping-build` output. Restart/rebuild the local API to load
  the implementation; the running debug session was not interrupted.
- Frontend type checking, ESLint on changed TypeScript files, generated help
  consistency (56 guides), and `git diff --check` pass.
- Reviewed the additive migration and applied
  `20260921171011_AddSharedShippingProceduresAndContainerPacking` only to verified
  `localhost:5432/phaeno_ops_clean_20260919`. A pre-change dump is retained in
  ignored `artifacts/sample-shipping-refinement-20260921/before-refinement.dump`.
  Verified migration history and the new empty procedure table. The ERD now
  documents 201 model tables. No scientific instructions were seeded or approved.
- Regression sources cover flexible methods including regular ice and no
  cooling, distinct container amounts, missing/conflicting combinations,
  procedure authority, legacy behavior, shared-procedure selection, container
  form validation and frozen packet rendering. Release verification is now authorized;
  results below supersede the initial review's unrun-test status.
- Signed-in local browser review covered the desktop setup guide and navigation,
  empty-state prerequisite links, retained container detail/revision views and
  editor, and 390 x 844 responsive navigation, sample/procedure forms and order
  guidance. Procedure validation focused the first invalid field; Escape returned
  focus to Add procedure. No configuration records were created or changed.
- The local dataset has no sample types, destinations, procedures, assignments
  or shipping guidance, and three retained active container definitions without
  combinations. Populated release verification uses isolated synthetic configuration;
  production receives no synthetic shipping records. Real scientific content and
  physical pack-out remain separate approvals.
- Existing destination and
  assignment management patterns are retained; new sample/procedure record
  links are view-first and container actions use one Actions menu.

## September 21 screen and process review

| Confusion found | Refinement |
| --- | --- |
| Setup entry points did not explain their order or ownership. | Start with samples, then destinations, shared procedures, assignments and container packing; provide a collapsible linked setup guide. |
| Users could start an assignment or container without its prerequisites. | Explain what is missing and link to it; disable unavailable creation actions. |
| Sample tubes and transportation containers sounded like the same field. | Name the sample field “Sample tube or vessel requirements” and keep coolant method/amount with each container combination. |
| General order instructions looked like another packing record. | Rename to “Order submission guidance” and explain its introductory role. |
| General container notes encouraged a second copy of packing steps. | New containers use combination instructions only; retain earlier notes explicitly for reviewed cleanup. |
| Assignment previews sounded complete but omitted actual container packing. | Rename to “Preview shared steps” and link to container packing; preserve the selected sample when managing its assignments. |
| Combined previews repeated the same procedure. | Show each shared procedure once, identify applicable samples and keep sample-specific requirements separate. Include transit limits. |
| Customers could print without a visible path to full instructions. | Add “Review packing instructions” to shipment Actions and “Review packing and print” as the Send next step. Read the frozen actual-container instructions in place before printing. Preserve revision checks and explicit printed-and-packed confirmation. |

No scientific text is automatically deleted or merged. Existing standalone rules,
legacy notes and issued packets retain their history. Temperature control remains
free-form and explicitly supports regular ice, dry ice, other methods or no cooling.

## Authorized release verification

- Frontend: all 1,110 tests across 177 files pass, including the actual packing
  dialog, print cancellation, focus restoration, exact-revision acknowledgment
  and retained shipment permissions. Full lint, TypeScript, production build,
  documentation consistency (56 guides) and whitespace checks pass.
- Browser: the focused shipping run passes eight desktop/mobile cases, with two
  mobile duplicates of desktop physical-label print tests intentionally skipped.
  Populated regular-ice/no-cooling instructions render common steps once, preserve
  sample-specific packing, pass automated WCAG checks in both themes and fit mobile
  width. Letter/A4 receiving-sheet output remains one page in both themes.
  The wider full browser run also passes: 184 cases, zero failures, two intentional skips.
- Added `SharedProcedureAndContainerAmountsSaveIssueAndRemainFrozenAfterRevision`
  to exercise real PostgreSQL controller saves, unauthorized access, exact approved
  procedure assignment, distinct small/large container amounts, tube assignment,
  packet issuance, revision conflicts and immutable issued snapshots.
- Backend: all 977 applicable tests pass, including the populated save/assign/issue/
  revise journey; one Unix-only symlink test is skipped on Windows. No synthetic
  notifications remain and disposable database removal is verified. Production
  identities and recovery evidence are recorded in the
  [release receipt](../operations/sample-shipping-refinement-release-20260921.md).
