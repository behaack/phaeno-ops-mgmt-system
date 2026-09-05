# Portal documentation search operations

Implemented locally on 2026-09-05. Production deployment and signed-in hosted
acceptance have not been performed for this feature.

## Sources and release preparation

Guide MDX and `frontend/src/features/documentation/documentation-catalog.json`
are the authoritative sources. Metadata is maintained with guide files; there is
no in-Portal metadata editor. Run `pnpm docs:generate` in `frontend/` after edits
and include both generated artifacts in the change:

- `backend/app/Documentation/corpus.json`: metadata and section text for the API.
- `frontend/src/features/documentation/documentation-version.json`: the matching
  corpus fingerprint for browser requests.

`pnpm docs:check` validates source, metadata, relationships, anchors and artifact
freshness. The API deployment workflow performs this check before creating its
backend-only archive. The API project copies the manifest into build and publish
output. Runtime indexing does not read the frontend filesystem or fetch URLs.
The content hash provides reproducible corpus identity; the enclosing release
retains Git revision provenance without making unrelated commits change the hash.

API and UI releases must contain the same corpus fingerprint. During a staged
release, mismatched clients receive `documentation_corpus_changed` and offer a
refresh; browsing remains available. Finish the matching UI/API release before
expecting refresh to restore search. A rollback must restore matching artifacts.

## Configuration and storage

| Setting | Default or deployed value |
| --- | --- |
| `DocumentationSearch:Enabled` | `true`; set false and restart to disable documentation search |
| `DocumentationSearch:IndexPath` | `__DOCUMENTATION_INDEX`, relative to API content root locally |
| Production index path | `/app/__DOCUMENTATION_INDEX` |
| Production volume | `portal_green_documentation_index` |
| `DocumentationSearch:ManifestPath` | `Documentation/corpus.json`, relative to API content root |

Keep this volume separate from `portal_green_website_index` and
`portal_green_website_preview_index`. Never bind the same underlying volume to
multiple index paths. Canonical paths are checked for equality, nesting and
resolvable links before writing. The documentation feature never invokes a
Website crawler/search service or cleans either Website index.

Startup opens a matching index or builds a new generation in the documentation
volume. Three bounded startup attempts allow transient failures to recover.
Publication switches readers only after the new index commits. Reader leases,
a rebuild semaphore and an on-disk writer lock protect concurrent work. Cleanup
retains one prior generation and skips linked paths or files still in use.
API health is separate from documentation readiness; a failed documentation
index does not intentionally stop the API or trigger a Website fallback.

## Status and recovery

Existing platform administrators can use:

- `GET /api/platform/documentation-search/status`
- `POST /api/platform/documentation-search/rebuild`

Use normal authenticated Portal access. The rebuild accepts no source, URL or
index path and has a 30-second cooldown plus a single active build. Operator ID
and request ID are recorded in structured logs. Responses report readiness,
rebuild state, corpus fingerprint, generation, guide/section counts and a
sanitized failure code. Query text and document bodies are not written to search
logs or metrics.

If search is unavailable, check the packaged manifest, volume permissions,
available disk space, path separation and status. Correct configuration or
restore the matching release artifact, then rebuild. A compatible active index
continues serving during a rebuild. A failed replacement does not publish an
empty index. An incompatible corpus is never served as a fallback for the new
browser version. Do not recover documentation search by resetting Website data.

The normal user endpoint is `GET /api/documentation/search`. It requires active
internal-user and selected-organization membership, supports only the current
published US-English corpus and checks `corpusVersion`. Search inputs are literal
text, with 2–200 characters, at most 20 terms and up to 20 guides per page. A
topic/workflow/type filter also supports browsing with empty search text.
The existing API rate limiter applies. Search data contains `items` and
`metadata` (counts, facets, paging and corpus); the outer API envelope retains
its standard request metadata.

The `PhaenoPortal.DocumentationSearch` meter records query latency and zero-result
counts, plus index build duration and failure counts. Status preserves the
original build timestamp on restart and reports duration when this process builds
a generation. Readiness, failures and corpus changes remain separate
from Website operations. Local performance measurements exclude real identity
provider, database/network and production load unless explicitly stated.

## Release acceptance

After authorized deployment, verify both artifacts agree, cold startup becomes
ready, and authenticated Customer, Partner, Prospect and Phaeno searches find
their own guides. Check inactive membership and wrong-organization denial,
keyboard/mobile section links, no-result/outage/version states, and independent
public and preview Website results before and after a documentation rebuild.
Do not equate local fixtures with hosted Clerk or production-volume evidence.

No database migration is required for this feature.


## Local verification evidence — 2026-09-05

The focused 51 backend cases, 168 frontend tests, five publication checks and 14
relevant desktop/mobile browser journeys passed. Builds, lint, typecheck and API
Release publish passed. Published corpus bytes match the source artifact.
A 55-guide index measured 19.54 ms p95 across 100 sequential warm service queries;
a recorded initial build took 183.09 ms. These are local measurements, with
synthetic identity in HTTP tests and response fixtures in browser tests.
