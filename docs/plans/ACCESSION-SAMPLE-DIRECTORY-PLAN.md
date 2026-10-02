# Accession sample directory — October 2, 2026

Status: implementation authorized by the Product Owner.

## Sample use follow-up — October 2, 2026

The Product Owner requested visibility of which samples have and have not been used. Laboratory staff need to identify untouched samples and distinguish previously used sources from unused reserves without confusing intake acceptance with processing or exhaustion. Add a separate **Sample use** column and **All sample use / Used / Not used** filter. A sample is Used when a submitted tube has a started processing attempt or recorded biological transfer, or when historical specimen processing has started without a selected-source link. Planning, source selection, tray reservation and cancelled unstarted attempts do not establish use. Failed or held attempts that started still establish use.

Each expanded submitted tube shows Used or Not used from its own source evidence. For historical processing with no source link, unproven tubes show **Use unknown**, and the sample explains **Historical source not recorded**. This preserves historical uncertainty without guessing a tube. Used does not imply exhaustion or suitability for another run; retain individual intake/location and show recorded Material exhausted, Failed or Disposed status separately. A mixed sample shows its used-tube count while preserving unused reserves.

The existing role-authorized read endpoint adds `useStatus` (`Used` or `NotUsed`) and per-sample/per-tube `useStatus` responses. Server filtering precedes count/paging; URL `accessionUse` survives detail return, resets page on change and clears with other filters. No schema, operational write, new dependency, auth change, Git mutation or deployment is included. Success is that staff can identify used/untouched samples directly and inspect reserve use without opening each specimen. Update guide and regression sources; automated suites remain request-only. Build/static checks and synthetic desktop/narrow/dark browser inspection are the local verification scope.

## Original directory scope

Sample-use verification checkpoint: the full solution and normal API builds passed with zero warnings/errors; frontend TypeScript, scoped ESLint, documentation generation/freshness and whitespace checks passed (56 guides; corpus `34a83b0a6603`). Synthetic browser review covered used/reserve/exhaustion/historical states, use/intake combinations, clearing filters, keyboard use selection/disclosure, and 390 px dark contained scrolling with aligned 32 px controls. Connected signed-in reads after the local API refresh showed all five existing samples as Not used, an empty Used filter, all five under NotUsed, and retained combined search/intake/use/page context through specimen-detail return. No operational records were mutated. Used/transfer/historical PostgreSQL fixtures and automated suites remain unrun; physical acceptance and production activation remain separate. See [sample-use evidence](../../output/sample-use-evidence/README.md). Task-created preview/cache/isolated build output is removed; normal API output stays in use.

Phaeno staff need to switch between accessioning received packages and finding samples already accessioned. Reuse the compact PillToggle above the existing received-container card. The received-packages view retains read-only insert lookup and the current guarded accession dialog.

The directory defaults to one row per customer sample, with its accession identity, Customer/Job, specimen intake status and expandable physical tube decisions/locations. Status filtering is intake-focused: it does not imply laboratory processing has begun. A sample may be Accepted while an individual reserve tube is held or rejected. Recorded rejected material remains traceable even when not stored. These are the defaults presented for optional Product Owner clarification.

Use a role-authorized read endpoint over current Lab specimen/container records. Require an accession number and a linked submitted-specimen tube; do not include planned samples merely because a Job exists. Search sample/accession/Customer/Job plus physical tube barcode and location before counting/paging in PostgreSQL. Return 20 rows per page, a bounded page size, stable newest-receipt ordering, total count and clamped page. Preserve filters and page in the URL and through sample-detail return navigation. Pending, failed, disconnected, empty and filtered-empty states remain distinct. Successful intake invalidates the directory through the existing Lab work query prefix.

No persisted model, migration, dependency, authentication rule or operational write is required. Existing Phaeno membership and Lab roles guard the endpoint; Customer/Partner access remains excluded. Update the Phaeno guide, API/frontend regression sources and living test plans. Run static/build/documentation checks and synthetic desktop/narrow/dark UI inspection. Automated suites and connected/physical acceptance remain request-only and separate from local preview evidence. No Git mutation or deployment is included.

## Implementation checkpoint — October 2, 2026

Implemented **Received packages | Accessioned samples** using the shared compact PillToggle. The directory uses server-side search, sample intake filtering and pagination (20 rows per page), preserves URL filters/page through specimen detail navigation, and shows per-tube decisions and saved locations in a disclosure. The existing received-package lookup and guarded accession dialog remain available in the first view. Successful tube intake refreshes the directory through its query prefix.

The API solution build completed with zero warnings/errors. Frontend TypeScript, scoped ESLint, documentation generation/freshness and diff checks passed. The guide corpus contains 56 guides with short version `b010eadc8a15`. Backend/frontend regression sources and living test plans were updated; automated tests were not requested or executed. Connected PostgreSQL query execution, live role checks and physical accession acceptance remain unverified by this checkpoint.

The actual receipt/accession panel and directory were inspected in Chrome with isolated synthetic responses. Verified 42 samples over three pages, disabled page boundaries, combined status/search reset to page one, filtered-empty/error/disconnected states, retained package lookup draft across toggling, keyboard toggle/disclosure operation, and detail links carrying filter/page context. The dark view at 390 × 844 had a 42 px tall single-row pill, equal 32 px filter controls, no page overflow, and table overflow contained within its own viewport. Evidence and precise boundaries are recorded in [the directory evidence README](../../output/accession-directory-evidence/README.md).

The temporary preview server/tab, harness, dedicated Vite cache and isolated build output were removed after verification; the browser viewport override was restored. Cleanup was limited to task-created directories, with resolved workspace containment and reparse-point checks. The retained screenshots/README are the output evidence.

## Local API refresh checkpoint — October 2, 2026

The running local IIS Express instance was still serving the October 1 API build. Its health endpoint returned 200, while the newly added `/api/platform/lab-operations/samples/accessioned` endpoint returned 404. At the owner's request, the verified Portal IIS Express instance was stopped, the normal API project output rebuilt (zero warnings/errors), and the same local site/configuration restarted with the current API executable. No migration, deployment, data repair or Git operation was performed.

After restart, health returned 200 and the unauthenticated directory request returned 401, establishing that the route was loaded and protected. Retrying the owner's signed-in local Portal page loaded five accessioned samples for H7QS6TY8, with their accepted statuses and single-page count. This adds a connected default-query and signed-in read smoke check to the prior synthetic evidence. Live filter/paging/authorization matrix and physical accession acceptance remain separate. The normal build output is retained because the restarted API uses it.

## Requested release verification — October 2, 2026

The owner's subsequent request authorizes documentation, complete tests and
controlled publication. The [release plan](PORTAL-WORKFLOW-RELEASE-20261002-PLAN.md)
supersedes this task's earlier no-test/no-publication scope. Full frontend unit
and synthetic desktop/mobile browser suites pass. The final corpus is
`a5744885cb96`; physical intake, scientific use and hosted operator acceptance
remain distinct from the release's automated evidence.
