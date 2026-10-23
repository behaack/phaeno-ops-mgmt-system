# UI workflow coverage and required quality gates — October 22, 2026

The Owner authorized the six follow-up priorities from the read-only review.
Phaeno, Customer, Partner and Prospect users should encounter the same panel,
loading, recovery and task patterns while their existing permissions, retained
drafts, scientific meaning, business rules and destinations stay unchanged.

## Acceptance and implementation

1. Adopt a shared semantic titled panel for remaining equivalent custom bordered
   sections across feature folders. Preserve heading levels, identifiers, refs,
   context actions and scientific/print exceptions. Detect recognizable bypasses
   in the source guard, with reviewed exact exceptions rather than broad ignores.
2. Prepare an always-running UI quality workflow and exact-source release gate.
   Require the source/build, visual and cross-browser UI quality jobs on main through GitHub's repository
   rules, after local verification. Preserve deployment holds; do not deploy,
   migrate, stage/commit/push source or change unrelated repository policies.
   Record the remote configuration and read it back. If access is unavailable,
   retain the concrete reviewed request and report the exact missing permission.
3. Complete shared loading/empty/permission/recovery adoption at recognizable
   remaining call sites, retaining labels, local retry handlers and API behavior.
   Keep record identity/return navigation available during loading and recovery.
4. Add actual Finance, Trial, shipping and Assembly QC components to the isolated
   gallery, including meaningful permission, empty, pending, failure and retained
   save/conflict scenarios. Use fictional in-memory transports only. Keep source,
   fixtures and provenance outside production. Derive coverage/count summaries
   from a shared inventory instead of repeating stale numbers in prose.
5. Add 320-pixel/tablet/zoom-equivalent reflow and cross-browser behavior checks,
   including real dialog keyboard/focus/recovery. Keep reviewed Windows Chromium
   image references and strict existing comparison tolerances; add Firefox and
   WebKit behavior smoke using the installed Playwright dependency.
6. Expand actual-component guide captures for order scope/readiness/submission,
   kit/destination setup, protocol preview/approval, Customer results/shipping,
   Partner work and Prospect Trials. Preserve audience and Customer locale
   boundaries. Use deterministic fictional data, useful crops, alt text,
   captions and written callouts. Make capture checks registry-driven rather
   than limited to exactly 32 Phaeno images. Refresh affected existing images,
   review all changed frames, and regenerate matching frontend/backend help.

The authoritative UI and documentation rules, owning feature plans and current
code settle existing behavior. No new business or scientific workflow, persisted
model, dependency, authentication policy or public Website change is intended.
Required quality checks may constrain merging; no new human-review requirement,
automatic deployment, bypass grant, force push or destructive Git rule is added.

## Verification

The Owner requested automated checks. Batch source/capture/release-gate regression
tests, targeted feature/shared tests, browser/state/reflow/keyboard/cross-browser
checks, reviewed visuals, lint, TypeScript, guide generation and both independent
builds at logical checkpoints. Update frontend/E2E/backend living test plans as
applicable. Retain compact evidence and encrypted/operational material from prior
releases; clean only temporary artifacts created by this task.

Local fictional evidence does not establish live provider, physical/scientific,
commercial or full assistive-technology acceptance. This phase does not include
Git publication or deployment.

## Status

Subsequent authorized publication and hosted-test deployment are complete for
`531d13fa58c22f01bc40824ce5d61be8acf19dbf`; see the
[release receipt](../operations/portal-ui-workflow-test-release-20261022.md).
The paragraphs below retain the original implementation-phase boundaries.

Baseline source: `62a9cd1e`. All six priorities are implemented locally; final verification is recorded in [the review record](../operations/ui-workflow-coverage-20261022.md).

The adoption adds 49 shared titled sections, 204 shared loading call sites, 78 empty/setup/no-results call sites and 10 shared error call sites in the previously captured application source inventory. Original identity, handler, form and navigation attributes were compared against the pre-change snapshot; explicitly replaced retry handlers remain in shared ErrorState props, and selected-attempt highlighting is now an owned data state. Scientific/print layouts and preparation execution remain scoped. Two existing scanner-return source allowances remain unchanged; no new baseline allowance was added.

Main branch protection was read back after application: strict required checks `ui-quality`, `visual-baselines`, `workflow-behavior`, each bound to GitHub Actions app 15368, including administrators. No human approval requirement or bypass grant was introduced. Earlier protection was absent (404) and repository rulesets were empty. Evidence snapshots are under `.artifacts/ui-workflow-six-20261022/protection-{before,request,write,after}.json`. The first request was rejected with 422 because it supplied both API check-list forms; the corrected checks-only request succeeded. This repository is public, so the direct-host gate can use read-only unauthenticated access and fails closed on unavailable API evidence; workflow execution uses its scoped Actions read token.

The original implementation phase left the workflow job and exact-source guard unpublished, with no Git publication or deployment in that phase. The subsequent separately authorized release used codex branches, all required checks and protected merges before activation; its receipt records deployment, preservation and unchanged holds.

The gallery and guide counts come from the generated [coverage inventory](../../frontend/ui-gallery/COVERAGE.md). All guide JPEG dimensions are checked against actual encoded dimensions. Review found and corrected an approval acknowledgment below the scroll boundary and two viewport-clipped images; the capture runner now rejects those geometry mismatches. Canonical captures remain light/en-US with audience-specific paths; external locale illustration expansion beyond en-US is separate work.

### Release-check infrastructure follow-up

The exact-source main run's first browser job timed out during Ubuntu package downloads before executing tests; its targeted retry also spends an extended period in installation. Use the official Playwright 1.59.1 Noble image, pinned by registry digest, for the Firefox/WebKit job. It contains the browser binaries and OS libraries matching the existing lockfile. Verify the package version before tests so a future dependency update requires the matching image update. Align only the ephemeral CI home directory's ownership with the container user: the first image run passed WebKit but Firefox refused the Actions-mounted directory's mismatched owner. Do not change host or Portal home/environment settings. This changes only that CI job's preparation; the required check names, test cases, time limits, visual renderer/tolerances and protected release gate stay unchanged. Validate through the same protected PR checks before merging. No application dependency or hosted runtime changes are included.
