# Shipping settings availability release — September 21, 2026

The owner authorized deployment of the pending shipping availability and supplier
catalog refinements, and requested **Samples & shipping settings** in the
administration menu, sidebar and page heading. Long sidebar headings now wrap.

## Production identity

- API source: `7d19b326ec4f6194a7a1973bed220caa936d36bc`.
- API image: `phaeno-portal-green-api:sha-7d19b326ec4f-shipping-availability`.
- API activation: **2026-09-21 21:32:13 UTC**. Current symlink, image revision label
  and deployment manifest agree. The established release script completed.
- Portal source: `98f4bdc1134e484548f9b1d0a66480155d27eecc`.
- Vercel production deployment: `dpl_3DeufDNgntbN7KBdGcuxnaZaMpXM`, **READY**;
  active project target and `portal.phaenobiotech.com` alias verified.
- The Portal commit adds only sidebar title wrapping and its plan note to the API
  source. `git diff 7d19b326 98f4bdc1 -- backend` is empty. There is no backend
  revision mismatch in application code or generated documentation.
- No migration or identity cutover requested. Existing migration remains
  `20260921171011_AddSharedShippingProceduresAndContainerPacking`. Local storage,
  ClamAV, PostgreSQL 18.6, blank bootstrap email and Website counts are preserved.

## Behavior and verification

Sample types, exact destination revisions and shipping assignments now expose
Activate/Deactivate separately from Create revision. Status changes retain IDs,
content and revision numbers, use existing audit/version handling and leave issued
packet snapshots intact. New UI-created content revisions start inactive.
Assignment activation checks its exact destination, current sample and procedure,
with named prerequisite guidance before submitting. Container supplier and product
numbers are catalog dropdowns; choosing a supplier filters its container products.

- Full API solution build, including regression sources: zero warnings/errors.
- Frontend TypeScript and scoped ESLint passed. Documentation generation/check
  passed for 56 guides; whitespace checks passed.
- Automated regression suites were not requested or run for this follow-up.
- Production deployment ran the existing scanner and file-service smoke checks:
  clean, EICAR, encrypted, oversize, health, storage/checksum/readback and cleanup
  checks passed. No business records were created by those probes.
- At 21:34 UTC, API health returned **200**, database ping **204**, Portal root
  **200**. API/database/scanner containers are healthy. The recent ten-minute API
  log scan found zero matching fail/fatal/unhandled-exception lines.
- Fresh signed-in production inspection verified all three requested labels,
  fully visible wrapped sidebar title, sample/destination Deactivate actions and
  the independent assignment Activate action. Cancelling the assignment status
  dialog returned keyboard focus to Actions.
- The reported assignment still references inactive, ended Santa Barbara Lab
  destination revision 1; the active destination is revision 2. Its activation
  dialog correctly names the ended revision, links to setup, and disables Activate.
  The administrator must create an assignment for the current destination revision;
  the deployment does not silently change that recorded reference.
- The container revision editor shows supplier/product dropdowns. Selecting the
  existing Containers R US supplier in an unsaved verification draft showed its
  5-, 10- and 20-tube products. No Save was submitted. Browser control stalled at
  the discard confirmation, so closing that temporary draft and browser-console
  inspection were not confirmed. A subsequent read-only database check confirms
  TRANS-20 remains revision 2 and the assignment remains inactive revision 1.
- Successful live status writes, physical packing and scientific approval were
  not performed as deployment probes. Existing business records are preserved.

Raw release metadata, API logs, public probes and unchanged-record checks are in
ignored `artifacts/shipping-availability-release-20260921`. The unrelated local
`docs/operations/database-rebase-20260919.md` change was excluded from release.
