# Portal laboratory progress and QR insert release - September 10, 2026

## Authorized scope

The owner authorized committing, pushing and deploying the API and Portal UI,
with an EF migration if required. The release includes the pending Lab Job
shipping workspace, quote sample scope, receipt/accession propagation, six
customer laboratory stages, updated test plans and audience help. Subsequent
instructions simplify the insert to one receiving sheet, move its main code
into the body, convert all Portal-generated graphics to QR and adjust spacing.
Website deployment and repeat operational data entry are outside this release.

## Preflight evidence

- Previous production API/UI source: `11699745825e17f6f16d67be1a678e78ea3b3578`.
  API workflow `34431957400`; Portal UI rollback target
  `dpl_DzwKyZ5yiw3Zb69B3nBzeF8ZXWGP`.
- No migration files or persisted model changes relative to production.
  EF pending-model check passed. Latest migration remains
  `20260909153238_AddTransportationKitLocationReservations`, already deployed.
  Release input `apply_migrations=false`; preserve storage/scanning settings
  and existing Clerk identity.
- Backend: 87 focused cases pass in a fresh isolated PostgreSQL database.
  The first populated-local run passed 85 and failed two fixture assumptions
  about globally empty notification/kit data; the identical clean-database run
  passes all 87. No production data was changed by verification.
- Frontend: 30 affected suites, 315 cases pass. Focused print browser checks:
  four pass; two mobile physical-label variants are intentionally skipped.
  TypeScript, scoped ESLint, production build and documentation freshness pass.
- Rendered Letter and A4 receiving PDFs each contain one page. The laboratory
  label remains 50 x 25 mm. PDF images were visually reviewed; ZXing independently
  decoded the exact PH-P, physical kit and lab identifiers, plus `Tube_001`
  from the rendered tube QR. No clipping, distorted squares or manifest pages.
- QR renderer: pinned qrcode.react 4.2.0, one shared SVG component with four-module
  quiet zones and M error correction. No saved identifier, checksum, supplier
  label, revision, receipt, accession or print-acknowledgement semantics change.
- Lab label print styling also fixes a blank-output visibility rule and prevents
  the application's minimum body width from shrinking label output.
- Local artifacts: `artifacts/customer-stage-release-20260910/` and the focused
  browser artifacts under `frontend/test-results/`. Runtime search index bytes,
  generated test result logs and private local records are excluded from Git.

## Acceptance boundaries

Local receipt/accession data correction remains the previously recorded single
repair of 69SJN4PA and HS5Y7DB7; this release does not repeat it or claim a
production repair. Both were visually verified locally as Received. No owner
samples were advanced through artificial later stages. Hardware scanner/printer,
physical packing, provider, Partner-session and populated production acceptance
remain separate gates. QR requires a compatible 2D scanner. Long configured
safety notes may continue rather than being clipped to force one page.

## Deployment

Completed and pushed application revision:
`19176c09019e51b3909d59425038bd2a9f5952d4` on
`codex/portal-documentation-search-release`.

- API [workflow 34541476014](https://github.com/behaack/phaeno-ops-mgmt-system/actions/runs/34541476014)
  completed successfully. Runtime release output confirms the exact source
  revision above and `migrations_requested=false`. Existing file scanning
  health/clean/EICAR/encrypted/oversize smoke checks passed.
- UI `dpl_GMFiuez68WwArJF8Kk1KeWe7fctV` reached READY with the same Git SHA.
  It was held until API completion, then promoted successfully.
  `portal.phaenobiotech.com` resolves to that deployment. Rollback target remains
  `dpl_DzwKyZ5yiw3Zb69B3nBzeF8ZXWGP` (UI only).
- Production verification: Portal `/` HTTP 200; all seven referenced entry
  assets HTTP 200; API `/api/health` HTTP 200; database ping HTTP 204.
  Fresh browser sign-in page rendered without page exceptions or observed 5xx.
  The connected browser required sign-in, so populated authenticated production
  journeys were not executed. Direct candidate URL protection led to Vercel
  login and was not counted as application verification.
- The agent-browser daemon failed to attach during final production inspection;
  an isolated Playwright browser completed the read-only sign-in smoke check.
- Local verification scratch database cleanup was independently confirmed: no
  database matching this release's temporary prefix remains.

Final release evidence is recorded in a documentation-only follow-up commit;
production application source remains the exact revision above. No Website,
authentication cutover, EF migration or repeat data repair was performed.
