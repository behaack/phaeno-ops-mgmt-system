# HS5Y7DB7 local shipping walkthrough — September 8, 2026

Active, partial run of [transportation kits and sample shipping](../11-transportation-kits.md).
The [run-record template](../RUN-RECORD.md) remains unchanged. User reports,
read-only database evidence and unexecuted variants are recorded separately;
no full manual case is marked Pass from these partial steps.

## Current implementation checkpoint — September 9

The adjusted location-inventory workflow is implemented and active locally.
Migration `20260909153238_AddTransportationKitLocationReservations` was applied
only to verified `localhost/phaeno_ops`; the replacement API reports health 200.
The isolated backend checkpoint passed 76/76; Customer and staff component,
browser, type and documentation checks are recorded in the owning plans.

Read-only preservation evidence (`artifacts/location-inventory-tests/local-preservation.json`)
confirms all six before/after hashes match: Job, samples, request, original kit
facts, registered tube roster and original shipment facts are preserved.
There was no data repair, repeat receipt, container assignment or tube scan.

Connected browser observations after local activation:

- **Portal location:** Main laboratory shows Available 1, On the way 0,
  Assigned 0 and In use 0. The kit retains originating Job HS5Y7DB7.
- **Portal preparation:** current pool SHP-20260909-661C60414B7 has 18 tubes,
  recommends the existing TRANS-20 with two spare slots, and enables
  **Adjust containers** with departure location Main laboratory.
- **POMS kit:** Available, Main laboratory, Assigned Job **Not assigned**;
  Request D20018AA, original FedEx dispatch, Customer receipt and all 20
  registered synthetic tube barcodes remain visible.

**Resume at SHP-09:** open **Adjust containers**, scan
`KIT-58073414ED6C47109A3E073EE5F9311F`, review 18 tubes in the 20-tube kit, and
confirm. Confirmation reserves this physical container. Complete any desired
reset/release check before scanning a tube. First successful tube matching locks
ordinary reset. Use the registered `TEST-HS5Y7DB7-001` through `-020` identities
when continuing the synthetic walkthrough; do not repeat order, dispatch or receipt.

The main walkthrough remains at nine samples / 18 unmatched tubes, kit version 5,
unreserved and unbound. Alternate sizes, split shipments and full manual variants
remain separate fixtures. This is local technical and read-only browser evidence,
not physical fulfillment/scanner qualification or a production deployment.
Automatic cancellation of unshipped requests remains an outstanding product decision.

Final connected checks also verified the location return link opens the shipment
without starting another kit order. The live **Adjust containers** dialog showed
one TRANS-20, 18 allocated tubes, two spare slots and an empty required
**Container 1 barcode** field. No value was entered or confirmation submitted.
Browser automation timed out while closing that unsubmitted draft and its
discard prompt; the prompt may remain open in Chrome. Close/discard the draft
before resuming. Edge is on the physical kit detail with its barcode visible.

## Earlier planning pause — revise location inventory before preparation

The Product Owner has superseded the mandatory same-Job kit rule. Containers
are to be supplied to Customer locations and assigned to Jobs during preparation
by scanning their permanent container barcodes. The
[location-inventory plan](../../plans/TRANSPORTATION-KIT-LOCATION-INVENTORY-PLAN.md)
records the agreed direction and remaining cancellation decision. At this earlier
checkpoint the correction was not implemented; the fixture was paused before
container assignment or a successful tube scan. The implementation checkpoint
above supersedes that pause without repeating order, dispatch or receipt.

The misleading receipt footer was removed locally. A connected Chrome read on
the same historical shipment independently found **Kits received** and no
**Confirm which kits have arrived before configuring containers or scanning
tubes.** The existing 29 transportation-panel tests passed. Chrome was returned
to the current **Tubes awaiting containers** pool, SHP-20260909-661C60414B7.

The owner's cancellation question is explained by the audit: predecessor
SHP-20260909-28314D28480 (`e9eccecd-8076-4e08-b67f-be0d01c5576e`) changed from
Preparing to Cancelled on **September 8 at 20:54:04.850151 PDT**, when the
replacement pool was created in the same request. This was the earlier
container reset, not today's kit receipt or a Lab Job cancellation. The Job
page then offered cancelled physical-container links as normal actions; the
implemented correction now separates those records into retired history.

## Current checkpoint — September 9 Customer kit receipt

The owner reported completing the one-kit **simulated local receipt** for Job HS5Y7DB7 /
Request D20018AA. The Customer screenshot shows **Kits received** and the kit's
**Received** state. Independent post-receipt verification confirms Request v3,
one requested/sent/received kit and kit v5, received at **07:47:28 PDT**. The
stock kit remains unbound: one available, zero in transit and zero bound. The
active pool retains nine samples / 18 slots with zero matches or packets.
These are the existing explicitly synthetic TRANS-20 kit and
barcodes, not a physical FedEx-delivery or production-acceptance assertion.

| SHP-08 check | Observation and evidence type | Scope of result |
| --- | --- | --- |
| Submit without selecting an arrived kit | **SCREENSHOT:** the receipt dialog displays **Select the kits that have arrived.** | Required-selection feedback observed. No separate persistence assertion from this screenshot. |
| Select the kit, cancel, then reopen | **USER-REPORTED:** owner replied **Success** for cancellation and a cleared selection on reopening. | Cancellation/reset behavior reported successful; not independent database proof. |
| Confirm the one arrived test kit | **USER-REPORTED + SCREENSHOT + READ-ONLY BACKEND:** successful simulated receipt; Customer view displays **Kits received** and the kit **Received**; persisted request/kit receipt corroborated above. | Core one-kit receipt observed; other SHP-08 variants remain incomplete. |
| Refresh POMS | **USER-REPORTED, THEN CONNECTED BROWSER:** a later staff read initially retained Dispatched; explicit reload showed **Received, 1 requested · 1 sent · 1 received**, with the Customer receipt timestamp. | Refreshed POMS and Customer receipt agree. Automatic cross-browser synchronization was not established. |

**Feedback defect corrected locally:** despite the received state, the Customer
screenshot still displays **Confirm which kits have arrived before configuring
containers or scanning tubes.** This is contradictory post-receipt guidance.
The generic fallback was removed and verified as recorded above. Specific
server-provided preparation restrictions remain. No second receipt was recorded.

**Next at that receipt checkpoint (now implemented):** verify the revised location-inventory model, then resume
container barcode assignment for the 18-tube roster using the unused TRANS-20.
Use separate fixtures for cross-Job reuse after cancellation, split shipments
and alternate sizes. Complete reset/release checks before the first tube scan.
Full **SHP-08 is not Pass**: partial receipt, repeated/idempotent confirmation,
other-kit/Job/location, role and remaining recovery variants are untested in
this connected run. No tests or application writes were performed by this
documentation update.

## End-of-day handoff — resume September 9, 2026

Historical handoff, superseded by the current receipt checkpoint above. The
identities and earlier evidence below remain preserved as recorded.

**Resume with Customer kit receipt. Do not place another kit order, register
another kit, repeat dispatch or repeat the completed request-link correction.**
This was the local connected walkthrough handoff, using explicitly synthetic kit products
and barcodes. It is not a production fixture, a real delivery assertion or proof
that a release has been deployed. Production release evidence is maintained
separately from this acceptance run.

The [end-of-day release record](../../plans/PORTAL-SHIPPING-RELEASE-2026-09-08.md)
records the completed September 9 production API/UI switch at `f06f4530`, with
four migrations applied and public health checks passing. The local walkthrough
records remain local; deployment did not acknowledge receipt or import test data.

| Record | Latest verified stopping point |
| --- | --- |
| Customer Job | **HS5Y7DB7**, `88967799-264c-490d-abe2-17e7833c6065`; finalized **9 samples / 18 tubes**. Preserve this roster and the accepted quote. |
| Kit request | **Request D20018AA**, `d20018aa-d5e7-4041-a6dd-5b0264fff6a0`, version 2; **Dispatched — 1 requested, 1 sent, 0 received**. |
| Supplied kit | **KIT-58073414ED6C47109A3E073EE5F9311F**, `bccda557-d88f-4e8c-a345-9bbe7ca7f38c`, version 4; TRANS-20, **20 of 20 barcodes registered**, Sent to customer / On the way. |
| Preserved dispatch | Original **FedEx** carrier/tracking and **September 8, 2026, 21:23 PDT** dispatch remain unchanged. The request-link correction did not create a second dispatch. |
| Tube identities | `TEST-HS5Y7DB7-001` through `TEST-HS5Y7DB7-020`; all 20 permanent tube IDs and barcodes were preserved. These are synthetic walkthrough values. |
| Remaining gates | Customer receipt and sample-shipment binding are unset. Successful tube scanning, packet printing, split-shipment variants and physical scanner/material qualification remain pending. |

Tomorrow's steps, in order:

1. Reopen the **local** Portal as a Customer organization or Department
   administrator. Open **Lab services → HS5Y7DB7 → Shipping containers** and
   the Job's current kit-delivery area. Verify Request D20018AA is still
   **Dispatched, 1 sent, 0 received**, with the kit above.
2. Select **Confirm kits received**, select this one test kit, and confirm its
   receipt for the local test. Record that this is simulated receipt; the test
   products/barcodes do not establish an actual FedEx delivery. No receipt has
   been performed as part of this handoff update.
3. Verify the request becomes **Received**, with **1 sent, 1 received**, and
   that one received TRANS-20 is available to this Job. Refresh both Customer
   and Phaeno views. The receipt must not be counted twice on retry.
4. Verify **Choose shipping containers** appears directly and configuration
   uses only the received same-Job supply: this fixture has one 20-tube kit for
   18 tubes, with two spare slots. It must not offer assumed/general stock,
   another Job's kits, or unavailable 10/5-tube sizes. Complete any remaining
   pre-scan reset check before saving the first successful scan.
5. Continue **SHP-09–11**: confirm/review the container, scan the allocated
   synthetic tube barcodes, verify exact saved identity/progress and refresh
   recovery, then review and print the packet. The first saved scan locks
   container reset, including after a later scan correction.
6. Run alternate sizes, partial receipt, split samples/shipments and long
   manifests on separate prepared fixtures. Do not alter this finalized
   nine-sample Job to manufacture a 30-tube scenario. Sample-return dispatch
   and Lab intake remain later **SHP-12/13** handoffs.

**Current acceptance status:** core kit ordering, registration and the saved
dispatch/request reconciliation are observed locally; SHP-03-001 and SHP-07-001
are resolved locally. Full manual cases and their negative/role/device variants
are not promoted to Pass. SHP-08 receipt is the immediate next step; successful
SHP-10 scanning remains blocked until that receipt is acknowledged.

The chronology below preserves earlier failures and snapshots. Its dated
"next step" notes describe that earlier moment; the current receipt checkpoint
at the top is the resume point.

## Resume checkpoint — September 9, 2026

The read-only backend check at **07:40:12 PDT** confirmed Request D20018AA
remains **Dispatched, 1 sent, 0 received**. The kit's original dispatch and
20 registered barcodes are unchanged; Customer receipt and shipment binding
remain unset. The finalized Job still has nine samples and 18 tubes with no
successful scans. Its current preparation pool is
`549e467c-d8a2-4190-a458-e043e10204e5` / **SHP-20260909-661C60414B7**,
Preparing version 1, with no selected container.

The connected Phaeno request page independently displays **1 requested ·
1 sent · 0 received** and **On the way**. The owner has POMS in Edge and the
local Customer Portal in Chrome side by side; the supplied screenshot confirms
the Customer dashboard is scoped to Johns Hopkins University / General.

Next, open **Confirm kits received** from the Customer Job's shipping area.
Check the SHP-08 empty-selection and cancel behavior before acknowledging the
one synthetic TRANS-20 kit. No receipt or scan was performed during this
resume checkpoint, and no full manual case is marked Pass.

## Initial run identity and scope

- Environment: local Portal and `phaeno_ops`; API at `https://localhost:44399`,
  process 55228 (`container-reset-runtime`), health 200 at the reported checkpoint.
- Database checkpoint: **2026-09-08 20:49:23 PDT**, read-only backend-agent report.
- Tester: Product Owner using the connected Customer workflow. Exact current
  role, browser/viewport/theme and application revision were not captured in
  this checkpoint; no release-level claim is made.
- Scope: basic container reset/reconfiguration and negative scan checks for
  HS5Y7DB7. No tests were rerun, no shared migration/release occurred, and this
  record itself performed no application or database writes.

## Verified local fixture snapshot

| Record | Read-only evidence at 20:49:23 PDT |
| --- | --- |
| Job | HS5Y7DB7; order `88967799-264c-490d-abe2-17e7833c6065`; finalized roster remains 9 samples / 18 tubes. |
| Active shipment | `45fecbe4-cab7-47ca-9d41-dc4cf8fa5884`; SHP-20260909-3FB23743E43; Preparing, version 1. |
| Container and tube slots | 20-tube container (reported as TRANS20); capacity 20, expected slots 18, matched 0. |
| Other shipment records | Four cancelled predecessors; no active unallocated pool. |
| Scan/packet/kit evidence | Zero scan events, packets, return kits, transportation-kit requests and Job-linked stock kits. |

This snapshot corroborates the resulting prepared-container state. It does not
by itself verify every reset transition or the later negative scan response.
No Customer delivery-location state or physical inventory outside this Job was
established by the supplied snapshot.

## Step observations

| Case / step | Expected check | Observation and evidence type | Status |
| --- | --- | --- | --- |
| SHP-09 reset variant / basic reset | Return the unscanned container plan to selection. | **USER-REPORTED:** owner explicitly confirmed reset succeeded. No screenshot or complete before/after audit assertion was supplied for this step. | Basic step completed by user report; full variant not completed. |
| SHP-09 / reconfigure | Confirm a new container configuration and reach Scan tubes. | **USER-REPORTED:** owner added a new configuration and reached Scan tubes. The separate database checkpoint records one Preparing container with 18 unmatched tube slots. | Basic step completed by user report, with resulting-state corroboration. |
| SHP-10 / empty barcode | Save scan with an empty barcode should validate without advancing. | **USER-REPORTED:** owner replied “Done” after that instruction. Exact validation text, screen state and lack of advancement were not independently observed. | Completion reported; expected assertions remain unverified. |
| SHP-10 / unknown barcode | Saving `TEST-UNKNOWN` should show Tube was not matched, remain at 0 of 18 and retain the same sample. | **USER-REPORTED:** owner replied “Success” for this negative check. No screenshot or newer database snapshot was supplied. | Negative check reported successful; not independent visual/database proof. |
| SHP-09 reset variant / return for kit ordering | Clear the rejected barcode and reset the unscanned plan back to its preparation pool. | **USER-REPORTED:** owner replied “Success” after clearing the failed scan and resetting back to the pool. No newer pool identity or database state has yet been supplied. | Return to pool reported complete. |
| SHP-03 / kit-order confirmation | Confirm one TRANS-20, the correct delivery address and no additional charge. | **USER-REPORTED, then SCREENSHOT/LOG-CORROBORATED:** owner replied “Done”; the later screenshot shows Order transportation kits with Kit order could not be saved / An unexpected error occurred. The API failed during fulfillment-recipient lookup and rolled the transaction back. | **Fail — SHP-03-001.** Correct action attempted; no saved request. |

## Historical case status and handoff — after the failed order attempt

| Case | Result | Remaining work |
| --- | --- | --- |
| SHP-09 | **Not run** as a complete case | Basic reset/reconfiguration is partially completed above. Alternate sizes, residual supply, all reset locks, concurrency, role and device variants are not complete. |
| SHP-10 | **Blocked** for a successful scan | No legitimate Job-linked registered kit supply is present in the verified snapshot. Ordering, fulfillment and Customer receipt must precede a valid tube match. Only negative scan checks have been reported. |
| SHP-03 | **Fail — SHP-03-001** | Confirm kit order failed in the application. Fix and successful connected retry are pending; other case variants remain unexecuted. |
| SHP-02, SHP-04–08, SHP-11–14 | **Not run in this partial run** | Do not infer address setup, notification, dispatch, receipt, manifest or laboratory completion from the reported confirmation. |

The user returned to the pool and attempted the correct kit-order confirmation.
The next checkpoint is the SHP-03-001 fix and a successful connected retry,
independently verifying one persisted request before genuine fulfillment and
Customer receipt. No saved request identity, fulfillment or physical receipt is
established here. The 20:49:23 snapshot remains historical; the subsequent
20:53:42 read-only result and API rollback establish the failed attempt's outcome.

Retain the Job, finalized roster and cancelled shipment audit history. Record
the next pool/shipment/request identities and later observations as additional
dated entries; do not overwrite this earlier snapshot or turn reported partial
steps into a full-case pass.

## Follow-up verification — 2026-09-08 20:53:42 PDT

The backend-agent read-only check found **zero transportation-kit requests and
zero related fulfillment notifications** for the same Job. The active shipment
is now `e9eccecd-8076-4e08-b67f-be0d01c5576e` / SHP-20260909-28314D28480,
Preparing version 1, with `isPackingPool = false`. A new physical-container
configuration is persisted; the reported kit-order confirmation did not result
in a saved request. This snapshot alone did not establish the reason or imply
that the user selected a different action. The later screenshot and API log
identify the failure below.

A fresh signed-in Phaeno Edge view at
`/lab-operations?section=receipt&requestSearch=HS5Y7DB7&requestStatus=open#transportation-kit-requests`
also displays “No transportation-kit requests have been submitted” and no
prepared standard kits. This corroborates the empty queue, not notification
delivery or any physical-stock acceptance.

No records were changed by this read-only check. The later screenshot resolves
the earlier uncertainty about the Customer screen; SHP-03 is now a confirmed
application failure, not an unverified or mistaken click.

## Incident SHP-03-001 — kit-order confirmation failed

**Status: resolved in the local walkthrough; connected retry saved the request.**

- User evidence: screenshot of **Order transportation kits**, showing **Kit
  order could not be saved** and **An unexpected error occurred**. It corroborates
  the correct attempted action; it does not show a successful order.
- Root-cause evidence: the API log identifies `NotifyFulfillmentAsync` in
  `TransportationKitRequestService.cs` (reported line 267). Its `SingleOrDefault`
  query for an active Phaeno organization matched more than one organization
  and threw. The transaction rolled back, including request/notification work.
- Persistence evidence: at 20:53:42 PDT the Job had zero transportation-kit
  requests and zero related fulfillment notifications; the independent signed-in
  Phaeno queue was empty. No fulfillment or email delivery should be inferred.
- Work identified at failure: backend recipient-routing correction for this data shape;
  frontend full-width failure alert and more useful generic-error fallback.
  Their later verification and successful retry are recorded below.
- Retest prescribed at failure: retain the reviewed location and kit quantities, retry after the fix
  is verified, and independently confirm one request plus one logical fulfillment
  notice. Verify the user-facing error remains readable and retryable if saving
  fails again. Provider delivery and physical fulfillment remain later checkpoints.

### Correction checkpoint

- Fulfillment routing now resolves exactly one active configured Phaeno
  organization; the existing administrator-recipient resolver remains in use.
  Read-only verification found one active match for the local configured name.
  Seven isolated PostgreSQL regressions passed, including concurrent/replay
  creation with another active Phaeno organization and rollback for unavailable
  routing. Evidence: `artifacts/kit-order-routing-tests/kit-order-routing.trx`.
- The kit-order error panel now shares the form's full content width. Generic
  failures provide retry guidance; meaningful server messages remain intact.
  Twenty-five component tests, seven synthetic responsive dialog cases, scoped
  lint and the full frontend typecheck passed. Browser evidence:
  `artifacts/kit-order-error-review/review.json`; no actual order was submitted.
- Local API was published to `artifacts/kit-order-save-runtime` and reloaded as
  process **24000** on `https://localhost:44399`; health returned 200, the protected
  kit-supply route returned 401 without sign-in, and the error log was empty.
  No shared database migration, release, live order, stock or provider write
  was performed by these verification steps.
- The owner has been asked to select **Confirm kit order** again. Preserve this
  failure history until the request is verified in the connected Customer/staff
  workflow; provider and physical-delivery acceptance remain separate.

### Successful connected retry — September 8, 2026

After the corrected API reload, the owner reported **Done** after confirming
again. A fresh signed-in Phaeno Edge queue shows **Request D20018AA**, Job
HS5Y7DB7, one 20-tube transportation kit, **0 of 1 sent**, **Pending**. Independent
read-only database verification corroborates:

- Request `d20018aa-d5e7-4041-a6dd-5b0264fff6a0`, Pending version 1; location
  `b434094b-8293-4cf2-ba78-725ab9def4d9`.
- One TRANS-20 line, quantity 1, revision 2, capacity 20; definition
  `4bbee8bd-881f-4fa9-962c-a908dc30e663`.
- Exactly one logical fulfillment notification
  `c4506e9f-2ac1-4115-a379-6ce4ef939992`, routed to the configured Phaeno
  organization `9ff77b04-f127-41fe-84b3-44f9331850f9`. Application status **Sent**,
  attempt 1, recorded at **21:05:09 PDT**. Inbox receipt is not verified.
- No registered stock kits exist yet, globally or for this Job. Dispatch,
  provisional customer stock, Customer receipt and successful scanning remain
  untested for this connected run.

The save-failure incident is resolved locally. This confirms the core SHP-03
order persistence and SHP-05 queue/notification-record observations; it does not
mark their remaining variants or inbox acceptance as complete. Next manual step:
Phaeno **Lab ops → Receipt & accession → Standard kits → Prepare standard kit**,
selecting the 20-tube size and supplying actual approved test-material facts.

### SHP-06 preparation — explicitly authorized synthetic stock

The owner asked Codex to complete the **Prepare standard kit** form and explicitly
chose **Use clearly labeled test values**. A read-only precheck found no existing
stock kits. Codex filled and submitted the open signed-in Phaeno form once.
The resulting detail page independently displayed:

- Stock kit `bccda557-d88f-4e8c-a345-9bbe7ca7f38c`, number
  `KIT-58073414ED6C47109A3E073EE5F9311F`, TRANS-20, capacity 20, **Preparing**.
- Tube supplier **TEST ONLY - Tube Supplier**, product **TEST-TUBE-20**, lot
  **TEST-LOT-HS5Y7DB7**.
- Shipper supplier **TEST ONLY - Shipper Supplier**, product **TEST-SHIPPER-20**.
- **0 of 20 tubes registered**, Customer Job **Not assigned**, and no carrier,
  tracking number or dispatch date.

These are synthetic walkthrough values, not approved supplier/product or
physical-material qualification evidence. SHP-06 creation is observed through
the connected UI; barcode registration, inventory readiness and dispatch are
still pending. The page is left on the saved kit with **Register tubes** available.

A subsequent read-only database check confirmed exactly one global stock kit,
revision 2/version 1, all five submitted test values, zero registered barcodes
and no Customer/Department/Job/request-line/location/shipment binding or dispatch.
Request D20018AA remains Pending version 1; its single Sent notification and
attempt count are unchanged.

### SHP-06 registration — 20 synthetic tube barcodes saved

The owner explicitly asked to continue tube registration. Codex entered
`TEST-HS5Y7DB7-001` through `TEST-HS5Y7DB7-020`, one per line, and submitted
**Register tubes** once through the connected Phaeno UI. A read-only precheck
found no collisions in standard stock or legacy registered tubes.

- The saved kit page displays **20 of 20 tubes registered** and remains correct
  after a browser refresh. **Record dispatch** is available, and the page states
  the kit is ready to send to a Customer Job.
- Independent read-only persistence verification confirms stock kit
  `bccda557-d88f-4e8c-a345-9bbe7ca7f38c`, version 2, capacity 20, with exactly
  the 20 distinct expected barcodes: zero missing, unexpected, other-kit or
  legacy matches.
- Organization, Department, Job, request line, delivery location and bound
  shipment remain unassigned. Dispatch, receipt, carrier and tracking fields
  remain empty. This is registered synthetic stock at Phaeno; no dispatch or
  Customer inventory receipt has been recorded.

The successful registration and refresh portion of SHP-06 is verified. Its
duplicate, already-used, excess and missing-tube variants remain unexecuted in
this connected run. Physical barcode/scanner qualification is not established
by entering these test values.

Next handoff: open **Request D20018AA → Fulfill request** and verify this matching
ready kit is offered. Use that request-linked flow for the later dispatch and
delivery-location inventory test; dispatch and Customer acknowledgement remain
separate steps.

### Incident SHP-07-001 — direct stock-kit dispatch did not fulfill the request

The owner reported completing **Record dispatch** from the standard kit page.
Their screenshot shows **Sent to customer**, while the kit-request queue still
shows **Request D20018AA**, Pending, 0 of 1 sent. A read-only check confirms:

- Kit `bccda557-d88f-4e8c-a345-9bbe7ca7f38c` is version 3, has all 20 registered
  test tubes, and is assigned to Job `88967799-264c-490d-abe2-17e7833c6065`.
- Dispatch is recorded at **2026-09-08 21:23 PDT**. The submitted carrier and
  tracking facts remain on the kit; they must be retained, not entered as a
  second dispatch.
- The kit's request-line, delivery-location, bound-shipment and Customer-receipt
  fields are empty.
- Request `d20018aa-d5e7-4041-a6dd-5b0264fff6a0` remains Pending version 1. Its
  one TRANS-20 line is `e8abc166-bef7-4f8d-92b2-163ee5836946`, quantity 1, at
  delivery location `b434094b-8293-4cf2-ba78-725ab9def4d9`.

The owner correctly completed the available dispatch action. This is a confirmed
application defect: the legacy stock-kit path saved dispatch without linking or
reconciling the existing kit request. The earlier instruction to perform dispatch
from the request did not account for this saved action. Do not dispatch another
kit to compensate. A guarded linking correction and consistent dispatch entry
points are being implemented; no repair or Customer receipt is claimed yet.

### SHP-07-001 correction — saved dispatch reconciled through the application

After the focused checks passed, the corrected local API was loaded and its
`/api/health` returned 200. The signed-in kit detail offered **Update kit request**
for Request D20018AA. Codex reviewed the confirmation showing the existing kit,
carrier, tracking number and September 8, 2026 21:23 PDT dispatch time, then
submitted that action once. The dialog closed and the recovery panel disappeared.
No direct SQL repair, new kit, second physical dispatch or Customer receipt was
performed.

A fresh navigation to Request D20018AA shows **Dispatched**, **1 requested ·
1 sent · 0 received**, and the same registered kit **On the way**, with its original
dispatch details. The kit remains **Sent to customer**, with 20 of 20 tubes
registered.

The Lab operations queue was subsequently observed with **All statuses** selected:
Request D20018AA shows **Dispatched, 1 of 1 sent**, alongside the standard kit's
**Sent to customer** status. The two screens now agree.

Independent read-only comparison verifies:

- Kit version 3 → 4; request version 1 → 2, status Dispatched.
- Exact equality of before/after dispatch-facts hashes and permanent tube-ID/
  barcode-roster hashes; all 20 tubes remain unchanged.
- The kit links to request line `e8abc166-bef7-4f8d-92b2-163ee5836946` and delivery
  location `b434094b-8293-4cf2-ba78-725ab9def4d9`.
- Exactly one Dispatched request event and one logical Customer dispatch
  notification, recorded Sent. The original request notice remains one. These
  application records do not establish mailbox receipt.
- Customer-received timestamp and bound sample-shipment ID remain empty.

Comparison evidence:
`artifacts/kit-order-required-tests/local-kit-reconciliation-comparison.json`;
the corresponding before/after snapshots retain the preservation hashes.

The implementation checkpoint passed **68/68 isolated backend cases**, **62/62
Customer component cases**, **28/28 staff component cases**, **28/28 Customer
synthetic browser cases** and **7/7 recovery-dialog synthetic browser cases**.
Backend build, full frontend typecheck, scoped lint and documentation generation/
check passed. Synthetic browser cases cover desktop/phone and light/dark; these
are separate from physical material/scanner and Customer receipt acceptance.
Plans and Customer/Phaeno guides now require Customer kits to be ordered for the
Job and acknowledged before preparation; the 56-guide corpus is `e81c712bcb04`.

SHP-07-001 is resolved locally. The next connected step is the Customer's receipt
acknowledgement for this dispatched kit, followed by preparation using the received
Job-specific supply. Remaining SHP-07 variants and physical delivery are not
marked complete by this recovery.
