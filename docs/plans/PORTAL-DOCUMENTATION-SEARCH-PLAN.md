# Portal Documentation Search and Metadata Plan

Status: implemented and verified locally; production deployment/hosted acceptance
pending. The Product Owner authorized execution, then commit, push and deployment
on 2026-09-05. Release preparation is recorded below.

Updated: 2026-09-05.

## Product intent and decisions

The Product Owner requested a new search system exclusively for Portal
documentation, completely separate from Website search, including a different
API endpoint and a different index. The continuation adds a metadata system that
the indexer can use to organize information for users.

Users are active Prospect, Customer, Partner and Phaeno members seeking help with
the workflows available in their current organization. They need to find a guide
or a relevant section by task, topic, workflow or familiar terminology without
knowing the exact guide title. Search and browsing must retain the existing
organization-specific documentation experience.

Requested requirements:

- Portal documentation search is completely separate from Website search, with
  its own endpoint and index.
- Help metadata can be consumed by the indexer to organize information for users.

Proposed design: separate configuration and indexing lifecycles; full-text search
of published guides; and one metadata catalog supporting navigation, ranking,
grouping, filters and related-guide links.

Existing product rules retained:

- The active authenticated organization determines the only allowed audience.
  Phaeno context searches Phaeno help; external contexts search their own guide
  set. There is no new audience selector or organization impersonation control.
- External documentation is localization-enabled; `en-US` is the only currently
  published locale. Phaeno help may remain US English.
- Documentation describes permissions but does not grant them. All currently
  bundled guides must remain safe to distribute.
- Documentation metadata stays outside portable MDX prose.

## Current repository evidence

| Area | Current implementation |
| --- | --- |
| Public Website search | Anonymous `GET /api/v1/web-ops/search-pages?search=...`, implemented by `Features/Website/WebsiteController.cs` and `WebsiteSearchService`. |
| Website preview search | Separate `/api/v1/web-ops/team-preview/search-pages` route, service instance and configured index. Its preview proxy credential is unrelated to Portal sign-in. |
| Website indexes | Green deployment mounts `/app/__GREEN_INDEX` and `/app/__PREVIEW_INDEX` on separate Website volumes. Public Website content is gathered by its crawler. |
| Portal guides | Published MDX under `frontend/src/content/docs/{locale}/{audience}` and `frontend/src/content/docs/phaeno`; guide routes are `/docs/{audience}/{slug}`. |
| Existing metadata | The documentation registry contains audience, locale, slug, title, summary, section, order, review date and optional navigation parent. It is currently coupled to imported MDX components. |
| Existing search identity | `{audience}/{locale}/{slug}` for external guides; `{audience}/{slug}` for Phaeno guides. |
| Portal search | Not implemented. The documentation standard already calls for backend indexing of metadata, headings and plain text. |
| Release packaging | The API Docker build and deployment archive currently include backend sources but exclude `frontend/`. Guide extraction and explicit artifact packaging are required. |
| Section navigation | Current MDX components do not establish a shared heading-anchor contract for indexing. Search section links need deterministic rendered anchors. |

Sources: [documentation standard](../user-documentation.md),
[UI/UX principles](../ui-ux-principles.md),
[Website API plan](WEBSITE-API-CONSOLIDATION-PLAN.md), current feature code,
root `Dockerfile`, `.dockerignore`, and the Portal Green deployment files.

The operations-readiness summary still contains historical Website cutover
wording. Current code and the Website API plan govern this design; this search
project does not repeat or change that completed Website cutover.

## Separation contract

Use the existing API host and installed Lucene packages, with a distinct
`Features/Documentation/Search` feature. Sharing the package dependency and API
host does not mean sharing a search service, corpus or index. No new search
service subscription or application database is needed for the recommended scope.

| Boundary | Website search | Proposed Portal documentation search |
| --- | --- | --- |
| User endpoint | Existing public and preview Website routes | Authenticated `GET /api/documentation/search` |
| Source | Website crawl, sitemap and approved publication content | Allowlisted published guide metadata and MDX text |
| Service | Existing Website search services | Dedicated `DocumentationSearchService` and interface |
| Storage | Existing public and preview Website volumes | New `portal_green_documentation_index` volume at `/app/__DOCUMENTATION_INDEX` |
| Configuration | `WebSearchSettings`, `WebsitePreviewSearch`, Website crawl jobs | Dedicated `DocumentationSearch` options |
| Rebuild | Existing Website crawlers and schedules | Documentation artifact version changes and explicit documentation rebuild |
| Identity | Website URLs and anchors | Existing guide identity plus stable heading identity |
| User access | Existing Website public/preview policy | Current active Portal user, membership, organization audience and published locale |
| Client cache | Existing Website consumers | Documentation-only query keys with current organization, audience, locale and corpus version |
| Operational state | Website index health and logs | Dedicated documentation readiness, rebuild state and metrics |

Hard safeguards:

1. No documentation query, rebuild or fallback calls `IWebsiteSearchService`,
   `WebsiteSearchService`, `WebsiteCrawler`, or either Website endpoint.
2. No Website crawler or rebuild receives the documentation source artifact.
3. Validate canonical index locations as distinct and non-overlapping, including
   parent/child paths, for public Website, preview Website and documentation.
   Account for OS path comparison and resolved links where supported. Deployment
   must not mount the same underlying volume at apparently different paths.
4. Give documentation its own index writer, readers, generation directories,
   rebuild lock, retention of old generations and failure reporting.
5. Rebuild, corruption, unavailability or disabling of one search leaves the other
   corpus/index untouched. No fallback combines or redirects search results.
6. Recovery and cleanup operations are confined to the validated documentation
   index root. They never delete or reset a Website index.

A separate API process is not required for the requested endpoint/index
separation. Separate hosting could be evaluated later if independent scaling or
availability becomes a product requirement.

## Metadata model

Extend the existing registry into a canonical, validated metadata catalog, kept
separate from MDX component imports and rendering code. The guide navigation,
search artifact generator and user-facing result metadata consume this catalog;
do not maintain a second list of guide titles, audiences or paths in the backend.

Implemented authoring approach: maintain metadata alongside guide files in the
repository, with metadata changes reviewed and released with related content.
Execution adopted the recommended initial scope. In-Portal metadata editing
remains an optional future extension.

### Guide fields

| Field | Purpose and behavior |
| --- | --- |
| `audience`, `locale`, `slug` | Required canonical identity and publication scope; retain current identity/route rules. Phaeno locale remains null in source metadata. |
| `title`, `summary` | Required readable labels and high-value search text; keep current titles intact during migration. |
| `navigationGroup`, `parentSlug`, `order` | Preserve the existing guide organization and one expandable navigation level. Separate display labels from stable group IDs. |
| `contentType` | Controlled values such as overview, guide, reference and troubleshooting; supports clear result labels and filtering. |
| `topicIds` | One or more controlled topics, such as access, sample shipping, scientific review or result downloads. Used for browsing and search facets. |
| `workflowIds` | Relevant product work areas, such as Trial Projects, Lab Operations, Order Operations or Data Library. A guide may support more than one workflow. |
| `taskKeywords` | A small authored list of task-oriented phrases and familiar terminology; assists matching without replacing body text. |
| `aliases` | Curated alternate names or abbreviations, including domain terminology. Bounded matching assistance, never generated claims. |
| `applicableRoles` | Optional descriptive role labels that explain who a procedure concerns. They do not authorize access or hide otherwise available guides by default. |
| `relatedGuideIds` | Explicit links to complementary guides, validated against the same audience and supported locale. |
| `reviewedAt` | Required existing review date, displayed to users and available to maintenance reporting. A newer date alone does not outrank a more relevant guide. |
| `publicationStatus` | Published or draft. Only published, registry-exposed guides enter navigation and the search artifact. Existing exposed guides migrate as published. |
| `sourcePath` | Controlled build-time guide source reference; never returned as a filesystem path in the search response. |

The artifact adds derived fields: schema version, corpus content hash, guide
content hash, heading IDs, normalized plain text and indexed section boundaries.
Git revision provenance remains with the enclosing release. These values are generated rather than maintained by authors.

### Taxonomy and validation

- Maintain a small controlled vocabulary of stable topic, workflow, role,
  navigation-group and content-type IDs with localized display labels. Avoid
  free-form tags that create near-duplicate groups such as `sample`, `samples`
  and `sample-management`.
- Seed metadata for every currently published guide. Preserve its audience,
  locale, title, summary, review date, order and existing navigation relationship.
  Add topic/workflow assignments based on the actual guide content.
- Enforce unique guide identities, valid published locales, bounded field sizes,
  valid review dates, known taxonomy IDs, valid source paths, existing related
  guides, and no cyclic navigation or related-guide self-links.
- Related guides and taxonomy labels are audience/locale-aware. Do not expose
  another audience's title, summary or counts through metadata relationships.
- Section records inherit guide scope and topics. Their heading text/anchor is
  derived from MDX; optional authored section metadata can later refine a guide
  without making it necessary for the initial release.
- A role label, publication label or metadata flag cannot turn browser-bundled
  text into confidential content. Restricted procedures require a separate,
  authorized content-delivery design under the existing documentation standard.

### User organization of information

Use the same metadata in three places:

1. Documentation landing/navigation: preserve the current groups and add useful
   topic/workflow entry points without adding deeper sidebar nesting.
2. Search: show guide title, matching section, short highlighted excerpt and
   content type. Offer topic, workflow and content-type filters in a compact
   disclosure. Audience and locale are already supplied by the current context.
3. Guide detail: show relevant topic/workflow labels and an appropriately scoped
   related-guides area. Keep permissions explained in the guide itself.

Initial taxonomy and keyword examples must be reviewed against the actual
Prospect, Customer, Partner and Phaeno corpora. Do not copy the Website's marketing
categories or Website keyword rules into this catalog.

## Source artifact and indexing lifecycle

1. Separate pure metadata from the TypeScript registry's MDX component map. Use a
   typed/schema-validated JSON catalog or equivalent data-only source that both
   the existing registry and the extraction command can read directly.
2. Add a deterministic extraction command using the existing MDX build toolchain.
   Parse the allowed Markdown structure, extracting human-readable headings,
   paragraphs, lists, tables, link labels and useful authored examples. Do not
   evaluate guide imports/JSX, scrape signed-in pages or fetch external links.
3. Generate heading anchors through the same rule used by the rendered MDX.
   Test duplicate headings, punctuation, Unicode and stable links. An excerpt
   must link to an actual rendered section or fall back to the guide root.
4. Emit a versioned documentation manifest with metadata, plain-text sections and
   the corpus hash. Exclude `docs/plans`, repository notes, incident material,
   Website pages/publications, application records and unregistered/draft guides.
5. Generate the manifest from the same checkout in local development, frontend
   verification and API release preparation. Package it explicitly with the API
   publish output; the server must not need the repository or frontend filesystem.
   The current Docker/deployment archive exclusion of `frontend/` must be handled
   by generating/copying the artifact before the archive and image are built.
6. Build a new Lucene generation in the documentation volume, verify its manifest
   version and scope counts, then atomically switch documentation readers. Keep
   the last good compatible generation while a same-corpus rebuild is running.
   A failed build must not replace a usable index with an empty one.
7. On startup compare the packaged corpus hash and index schema/analyzer version.
   Rebuild only when required. Serialize rebuilds and never expose a partial
   generation to requests. Coordinate generation leases before old-index cleanup.
8. Include the corpus hash in the UI artifact and API response. Reject incompatible
   UI/API versions with an actionable refresh state instead of returning stale
   anchors or removed guides. An old incompatible index is not an eligible
   fallback for a new corpus. Guide browsing stays available during search outage.

Use the Lucene dependency already installed in the API. Keep documentation
analyzers/ranking code owned by this feature. No new hosted search product is
proposed. Reuse the existing MDX parser pipeline; if implementation needs a direct
build-time dependency declaration instead of a transitive import, identify it in
the implementation scope before adding it.

## API and authorization

Proposed user endpoint:

`GET /api/documentation/search?q=...&locale=en-US&page=1&pageSize=10`

Optional bounded filters: `topic`, `workflow` and `contentType`. Pass the UI corpus
version as a dedicated request field/header. Do not accept an audience override,
source URL, filesystem path, index name or arbitrary Lucene query syntax.

- Resolve the active internal user and current membership from the existing
  authenticated Portal context. Validate `X-Organization-Id` against that user;
  never trust an organization/audience supplied without that membership check.
- Derive Prospect/Customer/Partner/Phaeno audience from the active organization.
  Keep the current help-access behavior; a Department admin does not acquire
  another audience's documentation.
- Guide content is common to the allowed audience, not per-department operational
  data. Department changes still invalidate outstanding client requests/context.
- Apply audience, supported locale and published-status restrictions inside the
  index query before ranking, facets, totals, snippets or related links are built.
- Initially accept only published `en-US` external content. Map Phaeno requests to
  its US-English corpus. Do not silently search unpublished translations or
  cross audience boundaries to fill empty results.
- Preserve the standard `success`, `data`, `error`, `meta` API envelope.
- Return stable guide identity, canonical Portal route, matching heading/anchor,
  title, short plain-text excerpt, safe match segments, content type, visible
  topic/workflow labels, and review date. Return filtered facet counts and a
  distinct-guide total in metadata; do not expose raw full documents or paths.
- Use authenticated Portal CORS/cache behavior, not Website CORS or preview keys.
  Prevent shared response caching across authenticated organization contexts.
- Rate-limit queries and cap input size, term count, page size and query work.
  Proposed bounds: 2-200 characters, at most 20 terms, default 10 guides/page,
  maximum 20. Two-character domain terms such as `QC` must remain searchable.
- Distinguish invalid input, missing membership, unavailable search, incompatible
  corpus and a successful search with no matches. An unavailable index is not
  reported as an empty successful result set.

Operational API, separate from Website operations:

- `GET /api/platform/documentation-search/status`
- `POST /api/platform/documentation-search/rebuild`

Use existing platform-admin authorization, one rebuild at a time, bounded retry,
operator audit and no user-provided input paths or corpus. Surface current corpus,
last successful build, guide/section counts and sanitized failure state without
printing source contents or credentials. A new administration console is not
required; a documented operations action is enough initially.

## Matching and ranking

- Match actual guide content as well as title, summary, headings and metadata.
- Rank exact title/task phrases and strong heading matches above incidental body
  matches. Keywords/aliases help discovery but cannot dominate unrelated content.
- Support case-insensitive, normalized multi-term matching, English word forms,
  and a bounded final-token prefix. Treat raw query syntax as text. Keep short
  scientific abbreviations intact.
- Return one result per guide with its most useful matching section; avoid a page
  of duplicate results from the same long operational guide.
- Use deterministic tie-breaking. Compute facet counts from authorized matching
  guides, not from the first page or from unauthorized corpus-wide totals.
- Begin with authored aliases. Broad fuzzy matching, embeddings, generated
  answers and automatic synonym learning are outside the initial scope.

## Portal experience

- Add a clearly labeled **Search documentation** control to the shared Docs
  shell, accessible from the landing page and guide pages. Keep the public
  Website search UI and all its requests unchanged.
- Use `/docs/search` for shareable results. Store query, filters and pagination in
  its URL; use the current organization context rather than embedding an audience
  selector. Direct links still require normal authorization.
- Update results after a short pause (about 300 ms); Enter may search immediately.
  Preserve input focus across result navigation. Cancel superseded requests and
  discard responses when organization, department, audience or locale changes.
- Use TanStack Query keys that include those context values and the corpus hash.
  Clear obsolete search results on context changes rather than displaying them
  while a new request runs.
- Provide initial guidance, loading, no-match, retry and refresh states. Retain
  current entries during a recoverable failure. Do not silently search the
  Website when documentation search is unavailable.
- Render highlights as escaped text/semantic mark segments, never raw indexed
  HTML. Open the relevant guide section and preserve back-to-results state.
- Keep desktop/mobile navigation singular and respect sidebar pin behavior,
  keyboard focus, zoom/reflow, light/dark themes and reduced motion.
- Announce result counts/loading without moving focus; support normal keyboard
  navigation and accessible filter controls. Localize all external-facing copy.

## Verification and acceptance criteria

The following acceptance criteria govern implementation. The execution checkpoint
below records actual evidence and the remaining hosted/human acceptance boundary.

### Isolation and backend

- Sentinel Website-only text never appears in documentation search, and unique
  documentation text never appears in public or preview Website results.
- Rebuilding either system leaves the other system's index contents, generation
  and query behavior unchanged. Test concurrent rebuilds independently.
- Reject equal, nested or aliasing configured roots; prove deployment uses distinct
  volumes. Simulate missing, corrupt and failed documentation indexes while
  Website search remains usable, and the converse at the service level.
- Anonymous, inactive-user, inactive-membership and tampered-organization requests
  return no documentation content. Cross-audience terms cannot leak titles,
  snippets, facets, counts or related links.
- Locale, publication, input limits, literal-query handling, paging/deduplication,
  metadata filters, rebuild recovery, corpus mismatch and highlight escaping are
  covered by focused backend tests.

### Metadata and corpus

- Every existing published guide has one valid metadata record and one canonical
  component/source mapping. Preserve existing documentation access and routes.
- Unknown taxonomy values, duplicate identities, broken related links, cyclic
  navigation, unregistered sources and malformed dates fail validation.
- Extracted text excludes rendering code and unpublished content. Heading anchors
  match actual rendering, including duplicates and non-ASCII titles.
- Guide text/metadata changes update the corpus hash; removing a guide removes it
  from the active index. API-only release packaging contains the right artifact.
- Check representative tasks per audience: Trial acceptance, sample shipping,
  Department administrator, download grace, laboratory scientific review and
  Partner assembly. Each expected guide should appear in the top three results.

### Frontend, browser and release

- Test debounce/cancellation, changed organization/department context, permitted
  facets, query URL/back navigation, no-match versus outage, and corpus refresh.
- Verify guide-section links, related-guide scope and metadata topic browsing on
  desktop/mobile, keyboard navigation, focus restoration, light/dark, zoom and
  automated accessibility. Manual assistive-technology checks remain necessary
  for critical navigation; automated scans alone are not a conformance claim.
- Proposed initial performance target: warmed documentation API p95 at or below
  300 ms for the full shipped corpus under a documented representative load.
  Record actual measurements and rebuild duration rather than assuming a result.
- Run focused Website regression checks to prove isolation, followed by appropriate
  backend and frontend suites and builds when implementation/testing is authorized.
- Verify the API release artifact without the frontend repository present,
  cold-index startup, replacement-index publication, restart and corpus rollback.

## Delivery slices and document updates

1. **Metadata foundation:** canonical catalog, controlled taxonomy, validation,
   migration of current registry metadata and complete guide classification.
2. **Corpus artifact:** deterministic MDX extraction, rendered anchors, versioning,
   local generation and API publish/deployment packaging.
3. **Independent backend search:** authorization, separate index/configuration,
   ranking/facets, atomic rebuild, recovery and operational endpoints.
4. **Portal discovery:** shared documentation search, results route, scoped filters,
   topic/workflow browsing, related guides and localized accessible states.
5. **Verification and rollout:** isolation/negative tests, relevance checks,
   performance evidence, guide updates, deployment documentation and acceptance.

Update `docs/user-documentation.md`, the owning architecture/readiness guidance,
`BACKEND-TEST-PLAN.md`, `FRONTEND-TEST-PLAN.md`, and `E2E-TEST-PLAN.md` as behavior
ships. Add search/browse guidance to each audience's existing guide set and update
its review dates. Keep proposed behavior in this plan until implemented.

The recommended scope requires no application schema or EF migration. If in-Portal
metadata authoring is chosen, persisted metadata revisions and authority rules
need their own implementation design, migration, ERD update and release review.

## Authoring workflow decision

Adopted for this implementation: repository-managed metadata, changed with the guide and verified by
its publication pipeline. This keeps text and classification in one reviewed
release and uses the established documentation maintenance workflow.

Optional future product extension: authorized Phaeno staff edit topics,
keywords and related guides inside the Portal. If requested, expand the plan to
cover author/editor permissions, draft/publish behavior, revision history,
validation, runtime overrides versus source ownership, localized labels and
reindexing after publication. Do not introduce an unreviewed second source of
truth or silently overwrite staff edits on the next deployment.

The implementation uses repository-managed authoring. The
separation, audience security, metadata schema, source corpus and discovery
requirements apply with either authoring approach.

## Out of scope and execution boundary

- Searching operational records, uploads, results or commercial/clinical data.
- Website content, PDF publications, or changes to Website search ranking/UI.
- Cross-audience browsing, confidential static content or new sign-in providers.
- AI answers, semantic/vector search, paid search infrastructure or raw-query
  analytics storage. Operational metrics may record latency, errors, zero-result
  counts and corpus readiness without retaining users' query text.
- New locales or machine-translated guides without the established review process.

The Product Owner authorized implementation and plan verification with “Execute”,
then authorized “Commit, push, deploy.” No new dependency or schema migration was
needed for documentation search. The release includes the earlier Trial integration
commit, whose separate production migration approval remains pending under
`AGENTS.md` and [the Trial closeout](TRIAL-INTEGRATION-CLOSEOUT.md).


## Execution checkpoint — 2026-09-05

- [x] Slice 1: 55 guide records moved into a validated data-only catalog with
  controlled taxonomy, authored terminology and scoped related guides. Component
  mapping is separately validated against the registered MDX sources.
- [x] Slice 2: portable MDX extraction and rendering share Unicode/duplicate-safe
  anchors; versioned artifacts are generated and packaged with the API.
- [x] Slice 3: dedicated authenticated endpoint, Lucene directory/volume,
  organization-audience filtering, facets, section ranking, reader publication,
  recovery, platform operations, cooldown, logging and metrics are implemented.
- [x] Slice 4: shared search control, results route, filters, topic/workflow
  browsing, related links, request cancellation and localized accessible states.
- [x] User guides for all four audiences, authoring guidance, architecture,
  operations runbook and living test plans updated.
- [x] Local verification: 51 backend cases, all 168 frontend tests, 5 publication
  tests and 14 desktop/mobile documentation journeys passed. Lint, typecheck,
  frontend production build and API Release publish passed. The published API
  contains the exact corpus artifact without frontend sources.
- [x] Local performance: 55 guides, 100 sequential warm searches, p95 19.54 ms;
  a recorded initial build took 183.09 ms. These exclude hosted auth/DB/network
  load and do not claim the production API latency target is verified.
- [x] Git/release actions authorized by the Product Owner.
- [ ] Production deployment, actual production volume/startup checks,
  signed-in Clerk acceptance and human assistive-technology acceptance.

Implementation details settled during execution:

- Existing `@mdx-js/rollup` and TypeScript provide extraction and source-map
  validation; no new dependencies were added and MDX code is never executed.
- Generated artifacts are reviewed with their source. API release preparation
  verifies them before its existing backend-only archive; frontend builds
  generate the corresponding browser fingerprint. This avoids a Node/frontend
  dependency in the running API.
- Query paging, corpus and facet metadata live in `data.metadata`; the shared
  outer API `meta` remains request ID and timestamp. A topic/workflow/type filter
  allows empty query text for browse entry points; typed search needs 2 characters.
- The existing API rate limiter applies; explicit documentation rebuilds use
  a 30-second cooldown, independent on-disk lock and single active worker.
- Guide access does not depend on Department permissions, but changing either
  organization or Department cancels requests and clears prior-context data.
- Early hydration/context initialization disables the search input briefly so
  the first typed query is not lost while the active context settles.
- The API host is shared; infrastructure/process availability is consequently
  shared. Corpus, query services, paths, volumes and rebuild failures are isolated.
  No Website ranking, crawler or consumer contract was changed.

See [the operations runbook](../documentation-search-operations.md) for deployment
and recovery. The in-Portal metadata editor remains outside this release scope.

## Release preparation — 2026-09-05

- Remote `main` is `a70eccf4f857aba1402bfc46c987963c70aeb754`, including
  Trial integration. The latest successful API deployment is
  [run 33975386749](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/33975386749),
  which deployed `ab2df0aa6b88a515dce0e13a01c415e5b3154c47` and applied migrations
  through `20260905140916_FreezeReleasedDeliverableReceiptLineage`.
- The pending `20260905172646_AddTrialProjectIntegration` was not in that
  release. Its reviewed SQL hash still matches the Trial closeout. Direct
  production database inspection was unavailable through the configured local
  SSH identity; workflow evidence does not assert a later out-of-band update.
- GitHub reports completed connected Vercel deployments for the current remote
  `main`. Prepare and push `codex/portal-documentation-search-release` so this
  release does not automatically publish a new production UI before the API.
- After explicit approval for the pending Trial production migration, deploy
  this release with the encrypted pre-migration backup gate enabled, then publish
  the matching Portal UI. Keep Clerk identity cutover disabled. Record exact
  release revisions, workflow/deployment IDs and live verification results.
