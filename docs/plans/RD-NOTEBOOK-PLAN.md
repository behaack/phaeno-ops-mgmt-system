# R&D electronic notebook

Status: implemented locally, October 16, 2026. Automated test execution and authenticated browser acceptance remain deferred. No deployment authorized.

## October 17 review corrections

Authorized scope: fix all six review findings. No new dependencies, authorization change, schema change, migration, Git mutation or deployment is required.

- Recover completion during entry editing with an in-editor reopen confirmation. Keep the draft mounted; use the current single-entry query for conflict review, including reopening by another researcher. Require explicit review before rebasing and saving.
- Add entry opens a bounded title/date modal. Cancel writes nothing; the explicit Create entry action records a permanent entry and opens its editor. This is the deliberate creation boundary, consistent with other bounded record creation.
- Register section labels, text, headings and cells with React Hook Form; associate field errors/invalid states and focus the first invalid control. Retain stable block IDs and revalidate corrected fields.
- Change the research-owned API/UI contract together: experiment detail is metadata plus entry count; GET entries returns 25 metadata summaries per page; GET one entry returns only that entry, experiment metadata and its authors. Entry create/update returns one entry. A dedicated view-first entry route owns its notebook and history. URL-backed entry pagination and return scroll remain available. Existing search indexing still rebuilds saved experiment search text on writes; very large server-side copy/indexing optimization is separate from bounded client reads.
- Initial/copy creation receives the browser's local initial-entry date explicitly. A supplied experiment date takes precedence. Missing both dates is a validation error, with no server-UTC fallback.
- Save primary records with centralized audit stamping, then materialize deferred revision snapshots and save them within the same transaction. Use a savepoint inside an existing transaction so failed revision persistence also rolls back the primary write. Existing immutable history is preserved; no historical snapshot rewrite is included.

Regression sources cover Active/Completed conflicts and external reopening, canceled creation, invalid-label focus/recovery, paged/on-demand content, Pacific-evening dates, final persisted author/time/version values and failure of the second save. Automated execution remains deferred; compilation and static checks are recorded below at the checkpoint.

October 17 checkpoint: Release solution build passed with zero warnings/errors, including the new backend regression sources. Frontend client/SSR production build, TypeScript, scoped research/routes/fixture ESLint, documentation generation/check (61 guides, digest `f15c37ffd01f`) and `git diff --check` passed. The generated entry view and edit routes both attach directly to the R&D shell. Automated tests and authenticated/manual browser acceptance were not run. No schema migration, data repair, dependency change, Git mutation or deployment occurred. Earlier immutable snapshots retain their original stored metadata; the fix applies to new saves.

## Confirmed product decisions

- Phaeno-only R&D workspace beside Lab ops; sidebar: Projects and Experiments.
- Projects contain experiments and dated notebook entries. All authorized researchers share and edit the workspace.
- Optional Purpose, Method, Observations, Results and Conclusions sections; custom/reordered sections, text, tables, images and files. No approved protocol or execution prerequisites.
- Active experiments can be completed and reopened without approval. Completed notebooks are read-only until reopened.
- Copy setup retains section layout, Purpose/Method text and empty table structures, clearing all other content, attachments and history.
- Standalone initially: no Lab record bindings/consumption, named templates, real-time editing, scientific approval, attachment-content indexing or purge.

## Implementation contract

- Add Researcher to existing Phaeno business-role administration/invitations. Access uses that explicit role or platform administration plus an active selected Phaeno membership, independently of commercial rollout flags.
- Research-owned domain types live in the Laboratory assembly's Research namespace. Five new tables in the research schema: projects, experiments, entries, revisions and attachments. No existing application data is converted, deleted or reseeded.
- Research HTTP endpoints use /api/research, the existing API envelope, backend scope checks, central auditing and optimistic concurrency. Every record-content/status write retains an immutable snapshot in the same transaction. Entry writes also advance the parent experiment version, serializing edits against completion.
- Notebook blocks have stable IDs, a kind (text/table/file), a semantic section (purpose/method/observations/results/conclusions/custom), a label and typed content. Dates of experiments/entries are distinct from server authorship timestamps.
- Private attachments reuse storage/scanning with research receipts, automatic size/hash metadata, integrity-checked retrieval and validated static image previews. Maximum is min(100 MiB, configured scanner limit). Saved attachments and revision references are retained indefinitely; failed unaccepted uploads can be cleaned up.
- Lists use server search/count/paging, desktop tables, narrow-screen rows and independent URL-backed filters. Return links retain project/list context and scoped scroll positions; details are view-first. Metadata creation/editing uses modals. Notebook entry editing uses a dedicated page because ordered sections, editable tables, uploads and resumability meet the documented complexity criteria. Explicit saves and existing draft guards preserve input on failure/conflict.
- R&D work is scoped to the selected Phaeno organization, independent of Department. Query caches include organization scope. Scope changes respect existing dirty-page guards.

## Acceptance and verification

- Create project and experiment with only their names/titles; record an unexpected method, custom table and image without setup/approval.
- Team members can discover/contribute; prior saved snapshots identify authors and times. Search includes notebook/table text, not attachment bytes.
- Complete/reopen safely; stale writes cannot overwrite or edit completed work. Copy carries no prior outcomes or attachment references.
- Cover unauthorized/disabled/external actors, organization scope, role administration, conflicting writes, incomplete/rejected/unavailable uploads, private downloads and retained historical attachments.
- Verify keyboard/focus, Actions menus, required legends, narrow layouts, themes and draft navigation. Update Phaeno help, generated documentation corpus, ERD and all three living test plans.
- Build, typecheck, scoped lint and documentation checks at the checkpoint. Automated test execution is deferred unless requested. Commit/push, hosted migrations and deployment are outside this authorization.

## Database and release

Create and inspect an additive EF migration, then apply only to the verified configured localhost development database. No reset or repair is needed for the new model. Preserve existing Website intake and all other application data. Record the applied identity and verification outcomes below when complete.

## Implementation receipt

- Implemented the two-item workspace, Researcher role/invitation/session scope, all notebook APIs and screens, structured text/table/file sections, completion/reopening, setup copying, immutable paged history with on-demand snapshots, and protected attachment upload/preview/download.
- Created and inspected additive migration `20261016204013_AddResearchNotebook`: only five new research tables, their scope keys/indexes and the research schema. Applied it to the verified configured Development target `localhost:5432/phaeno_ops_clean_20260919`; it was the only pending migration. The subsequent migration list shows it applied, and EF reports no pending model changes. No existing table/data reset, conversion, deletion or reseeding occurred.
- Updated the complete generated ERD, architecture/business/UI/access plans, task map, Phaeno notebook/access/overview guides and generated documentation corpus (61 guides). Updated all three living test plans.
- Passed Release solution build (including backend test-source compilation), frontend client/SSR production build, TypeScript (including frontend tests/browser fixture), scoped ESLint, documentation generation/check and whitespace/path checks.
- Added backend domain/access/model tests and a rollback-only PostgreSQL journey, frontend conflict-preservation/navigation/documentation regressions, and deterministic desktop/mobile browser scenarios. None of the automated tests have been executed. Authenticated UI, live concurrent writers, upload/scanner failure handling and historical attachment acceptance remain unverified; fixture sources are simulated evidence only.
- No dependency changes, Git staging/commit/push, hosted migration or deployment. Existing Portal release holds remain in force.

## Illustrated help and preserving release — October 17, 2026

Owner requested updated user help, an annotated R&D how-to, GitHub commit/push and deployment. The new Phaeno child how-to covers the full recording workflow using 14 actual component captures with fictional in-memory records. No hosted experimental data is created for screenshots. Recovery inventory includes every retained research attachment, including unattached uploads; isolated restore checks include all five research tables. See [the preserving release plan](RD-NOTEBOOK-HOSTED-TEST-RELEASE-20261017-PLAN.md) for source identity, backups, additive migration and release gates.
