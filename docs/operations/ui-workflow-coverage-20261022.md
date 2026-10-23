# UI workflow consistency review — October 22, 2026

All six approved follow-up priorities are implemented locally against baseline `62a9cd1e`. The live release was not changed. See the [owning plan](../plans/UI-WORKFLOW-COVERAGE-AND-GATES-PLAN.md) and generated [coverage inventory](../../frontend/ui-gallery/COVERAGE.md).

## Delivered

- Shared `SectionPanel` adoption at 49 remaining equivalent titled sections, preserving native heading levels/identity and contextual controls; shared heading/table bands remain token-based in both themes. Scientific instruction/print and preparation-execution layouts stay scoped.
- Shared feedback adoption adds 204 loading, 78 empty/setup/no-results and 10 error call sites. Original local retry handlers and data behavior remain; important record loading/recovery pages retain their title and return link.
- Gallery: 16 sections, ten actual feature pages, five additional state references, and 84 Windows Chromium image references. Finance, Trial, Customer shipping and Assembly QC use actual components and fictional isolated transports.
- Workflow behavior checks cover read recovery, permissions, empty setup, retained rejected/conflicting choices, pending safety, focus return, 320 px/tablet reflow and enlarged text. WebKit pointer activation exposed a sole-action dialog focus issue; the shared action control now establishes the return-focus target before opening the dialog.
- Documentation: 43 deliberately reviewed captures and 169 callouts across nine illustrated guides and all four audiences, including eleven new task illustrations. New and affected MDX remains audience-specific, with alt text, captions and numbered explanations. Encoded JPEG dimensions, target clipping, source freshness and registry/reference equality are enforced. Two viewport-clipped captures and the protocol acknowledgment crop were corrected during review.
- Main now requires strict `ui-quality`, `visual-baselines` and `workflow-behavior` checks from GitHub Actions (app 15368), including administrators. The new always-running workflow and exact-source deployment guard are prepared locally. The guard rejects missing, skipped, failed or superseded evidence before runtime activation. A read-only check against the old live source correctly refused it because it lacks the new browser job.

## Verification

Evidence is retained in `.artifacts/ui-workflow-six-20261022/`:

| Check | Result |
| --- | --- |
| Full frontend suite | 258 files; 1,578 passed, three existing skipped cases |
| Firefox desktop/light and WebKit phone/dark workflow behavior | 42 passed |
| Reviewed Windows Chromium comparisons, updates disabled | 84 passed; original 0.15/80-pixel tolerances retained |
| Final gallery Chromium matrix | 244 passed across desktop/phone and both themes |
| Source/capture guard regressions | 35 passed; no new baseline allowance |
| Release-gate regressions | Three passed, plus expected refusal of the older source |
| Lint, types, coverage, corpus and capture freshness | Passed |
| Independent Portal/gallery builds and isolation | Passed; 856 production / 79 gallery artifacts |
| Isolated backend solution compilation | Passed; zero warnings/errors |

The broad frontend pass preceded final spacing-only refinements and generated-capture updates; the final 28-case component set, 23-case focused feature/action set and browser matrix cover those refinements. The backend suite was not rerun because no API/domain behavior or model changed. Three existing frontend skips remain explicit: Customer specimen-hold request cases are disabled by the existing feature flag; the enabled case verifies those controls stay hidden. The first Chromium matrix was interrupted by capture metadata hot reload; the final matrix runs after capture/generation finishes. An earlier Firefox multi-navigation reflow case hit its aggregate 30-second limit while several suites ran concurrently; its bounded case timeout is now 60 seconds and the final cross-browser matrix passes without retries.

The shared prop audit retained original handlers, refs, form/native/ARIA and router attributes; replaced retry controls are supplied through shared ErrorState props. Original label whitespace was restored after focused tests identified extra spacing around dynamic text. Selected scientific attempt highlighting is asserted through the shared semantic data state.

## Publication and operational boundary

Branch protection is active and read back; the new workflow job and deployment guard are still unpublished local source. A subsequent authorized publication must use a codex branch and satisfy the protected merge path, including the newly published browser check. No files were staged, committed or pushed in this phase. No Portal deployment, workflow enable/disable, Vercel hold, production data, migration, provider or commercial activation occurred.

Local fictional browser evidence is representative; it does not certify every route, native browser zoom, every assistive technology, live providers, scientific results or physical laboratory work. New external guide illustrations cover en-US; other Customer locales retain their existing prose and need separately reviewed illustrations if expanded.
