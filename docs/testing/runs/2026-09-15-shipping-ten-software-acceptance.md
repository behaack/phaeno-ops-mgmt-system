# Ten shipping and accession cases — September 15, 2026

## Result and scope

**Ten further cases are Pass (simulated): ORD-05, LAB-02, SHP-05, SHP-06, SHP-07, SHP-08, SHP-10, SHP-11, SHP-12 and SHP-13.** This continues the Product Owner's approved simulated software approach and requested ten-case slice. The controlling ledger becomes **66/81 software cases closed (81.5%): 39 ordinary passes and 27 simulated passes; 15 remain**. Physical, scientific, carrier, printer/scanner and real recipient acceptance remain open. This is not final manual UAT or release signoff.

The batch fills software gaps and carries forward completed observations instead of replaying operational writes. Three new PostgreSQL journeys exercise notification recovery, full-capacity stock registration, and one specimen split 9+9 across two independently dispatched and received containers. Actual signed-in browser checks are read-only against the retained 30-sample shipping fixture. Existing owner's Jobs HS5Y7DB7 and 69SJN4PA were not targeted.

## Evidence key

| Ref | Evidence and its boundary |
| --- | --- |
| N | New `ShippingAcceptanceNoticeFailureRetriesSameRequestWithCurrentRecipientsOnly`: actual request/dispatcher/persistence; transport deliberately fails, then succeeds in memory. One logical notice, two attempts, current administrator recipients only. No real inbox or external send. |
| R | New `ShippingAcceptanceStockRegistrationRejectsIncompleteDuplicateExcessAndUsedTubeIdentities`: synthetic 20-capacity stock for 18 expected tubes; incomplete, duplicate, excess and used identities; saved full stock, dispatch, receipt and first assignment. Materials and custody are simulated. |
| J | New `ShippingAcceptanceSplitPacketsDispatchReceiptAccessionAndLabelHistoryRetainOneLineage`: exact original 18 slots, two nine-tube manifests, reasoned revision replacement, separate return tracking, two arrival events, 18 distinct accessions/replays, same specimen accession, adopted supplier barcodes/boxes and derived label history. Print/custody confirmations are explicitly simulated. |
| B | Current focused backend runs: 25 main plus three targeted branch checks, all pass with zero skips. The final three explicitly verify frozen catalog edits, Customer receipt before scanning and the Lab-owned legacy whole-sample bypass guard. Besides N/R/J, named existing checks cover partial 20+10 dispatch/receipt, concurrent direct/request dispatch, retained reconciliation facts, cancellation/wrong kits, location reuse/scope, catalog succession/withdrawal, supplier accession, rejected/bulk intake, concurrent packet issue, queues beyond 250, whole-kit binding, Partner/Trial/legacy policy and barcode/packet domain rules. |
| C | Current 113/113 component checks, zero skips: stock preparation/request/dispatch/recovery, partial inventory, scanners/corrections, packet/print frame/QR rendering, location inventory, Lab label confirmation and tube receipt. Mocked API responses exercise actual components; these are not live custody events. |
| V | Current real C-ADMIN, P-ADMIN and C-MEMBER browser sessions. Retained 10- and 20-tube packets, 390×480 light/dark reduced-motion layout, square graphics, 13-request paging and return context, Customer denial from staff queue; zero page errors and zero business writes. Packet DTOs are equal before/after. |
| P | Fixed direct-page print output: four connected PDFs (two containers × Letter/A4), plus four synthetic receiving PDFs (two themes × Letter/A4), all one page. Three Chromium print checks pass, including laboratory and stock-kit labels. PDF page counts independently checked with pypdf; connected Letter and dark A4 pages visually inspected. Exact readable QR values and scanner API strings are checked; raster QR decoding and physical scanner qualification are not claimed. |
| H1 | [Shipping recovery](2026-09-15-shipping-recovery-uat.md): actual request/retry/cancellation, frozen address, one logical notice and retained state. |
| H2 | [Packing and reset](2026-09-15-packing-reset-uat.md): alternate sizes/residual supply, barcode preview/reservation, cancelled-origin reuse, wrong location/member, concurrent claim and saved-scan locks. |
| H3 | [Long shipping recovery](2026-09-15-shipping-large-recovery-uat.md): actual 20+10 request/dispatch/receipt, all 30 scans, populated queues, paging, navigation, keyboard, themes and pre-execution failure/delay recovery. Both return shipments remain ReadyToShip. |
| H4 | [Tube intake](2026-09-14-tube-intake-uat.md): connected read-only identification, exception-first intake, rejected/held/missing tubes, atomic bulk acceptance, discard/reopen, lost response, foreign/voided/stale/arrival/storage guards and Customer-safe progress. |
| H5 | [Policy and shipping access](2026-09-15-policy-history-and-shipping-access-uat.md): independent staff/member/tenant/Department denials and unchanged saved readbacks. |

## Required-step and variant crosswalk

### ORD-05 — Kits through sample dispatch

| Steps | Software result |
| --- | --- |
| 1 | H2/H3 and inventory components distinguish physical tubes, compatible configured sizes, unavailable lookup and actual recorded supply. No verified-zero inventory is inferred from a missing record. |
| 2 | H1/H3 preserve reviewed location/revision snapshots, no extra charge/invoice and one request on replay; missing location and changed review are covered there. |
| 3 | R and B require full physical capacity, reject incompatible/used/incomplete stock, retain outstanding partial quantities and update stock/request atomically from either dispatch entry. H3 supplies the connected fulfillment screens. |
| 4 | B's partial 20+10 journey proves outbound supply unusable until acknowledged. H3/C provide actual screen and failure/delay/cancel evidence. |
| 5 | H2 supplies all documented alternate combinations, spare and residual capacity, explicit physical-container reservation and original slot/price conservation. J adds a specimen split evenly across two containers. |
| 6 | H3/C cover leave/reopen, next unmatched tube, focus, long-list paging, rejected/delayed save; B/H2 enforce exact bound-kit identity and no implicit replacement. |
| 7 | J compares per-container and specimen-wide counts, one first revision, correction history and voided prior packet. B/H1 retain snapshots; P verifies representative print layout. |
| 8 | J records RETURN-1 and RETURN-2 separately; first dispatch leaves its sibling ReadyToShip. Original slots and quote identity/version/status/acceptance/total remain equal. H2/H3 supply parent/child navigation. |
| 9 | B's whole-kit and registered-tube journeys resolve Job/sample/shipment identities and exact packet/tube pairs read-only, reject malformed/unknown/voided/wrong pairs and require arrival before accession. H4 supplies connected continuation into Lab. |
| Trial/legacy branch | B reruns `TransportationKitOrderRuleRetainsPartnerTrialAndUnacceptedLegacyPreparationPolicies` and the shipment-specific registered-kit journey. Customer-only ordering remains denied for Trial/Partner work; legacy supply, original identifiers and frozen scope remain distinct. No new Trial price or Customer charge is introduced. |

### SHP-05 — Notification and queue

| Steps | Software result |
| --- | --- |
| 1 | N persists Failed with no sent time, then retries the same notice successfully. It removes the former administrator from the recipient set and uses the newly current administrator; Customer is absent. A third delivery call does not send again. Queued/failed/simulated-sent remain distinct from real delivery. |
| 2–3 | V opens the saved Job-filtered queue: 13 records, pages 12+1, keyboard Next, detail and Back retain page two. B independently prevents server truncation beyond 250; H1/H3 cover pending quantities and frozen detail. |
| 4 | V returns 403 for C-MEMBER at the staff endpoint; H5 retains separate unauthorized Phaeno and other-Customer/Department checks. |

### SHP-06 — Stock preparation

| Steps | Software result |
| --- | --- |
| 1–2 | R creates synthetic stock at Phaeno, requires 20 registered tubes for an 18-tube Job and proves the request remains Pending/zero dispatched before fulfillment. The saved backend stock status is Preparing; full registration supplies the UI's ready eligibility. H3/C cover preparation form review and discarded drafts. |
| 3 | R rejects dispatch with 19 tubes, duplicate/excess registration and reuse of an existing/used permanent identity without partial registration. The twentieth valid tube completes saved stock. |
| 4 | B's ordinary-successor/withdrawal and location scope tests preserve compatible stock across catalog revisions while blocking withdrawn/foreign/unavailable supply. C covers shortage presentation. |
| 5 | B's concurrent direct/request dispatch and recorded-dispatch reconciliation preserve one dispatch, original tracking/address, request quantities and separate legacy policy. C covers review, cancel, failed save and pending state. |
| 6 | P prints the exact stock-kit QR and readable identity. H2 covers read-only physical-barcode preview followed by explicit reservation. This is software rendering and keyboard-scan evidence, not paper/hardware acceptance. |

### SHP-07 — Partial dispatch

| Steps | Software result |
| --- | --- |
| 1 | H3/C cover required carrier/tracking/time and reviewed address. B stores destination/location and provenance without assigning a consuming return shipment. |
| 2–3 | B's partial journey dispatches only TRANS-20, leaves TRANS-10 owed, exposes in-transit quantity and zero available supply, and denies preparation until receipt. |
| 4 | B covers wrong/used/excess/concurrent/replay rejection; H1 preserves the confirmed address after later location edits. |
| 5 | B preserves recorded legacy dispatch facts through reconciliation and synchronizes both dispatch entries once. C covers ambiguous, mismatched, already-bound/linked and missing-fact eligibility; review/cancel/reopen, failure and busy controls. H3 supplies connected dispatch failure/delay evidence. |

### SHP-08 — Partial Customer receipt

| Steps | Software result |
| --- | --- |
| 1 | C validates empty selection and discards cancelled receipt drafts without a request. H3/H2 retain connected pending/failure and dirty-selection evidence. |
| 2–4 | B acknowledges TRANS-20, prepares only received capacity, retains the ten-tube residual and then dispatches/receives TRANS-10. Receipt replay does not duplicate stock. H2 proves an allocated container cannot supply a sibling again; H3 confirms persisted screen counts. |
| 5 | B and H2 acknowledge location stock after originating Job cancellation and reserve it to a different eligible Job while retaining original delivery history. |
| 6 | B/H5 deny unreceived, undocumented legacy, wrong Customer/Department/location and member writes; same-location eligible unused stock from another Job remains usable. |

### SHP-10 — Tube identities

| Steps | Software result |
| --- | --- |
| 1–2 | H3 saves all 30 unique supplier identities and verifies refresh, focus/announcement, eight-row pages and next-unmatched progress. B/H2 prove first saved scan fixes the physical binding and reset lock. |
| 3 | B/H2/H5 enforce unknown, duplicate, unreceived, unassigned, used and other-container boundaries. H3/C prove delayed/rejected saves preserve value/progress and cannot select another kit implicitly. |
| 4 | J rejects correction without a reason, then changes one tube to the same kit's spare identity, creates revision two and retains/voids revision one. H2 proves scanned/bound plans cannot reset or repack. |

### SHP-11 — Receiving sheets and split manifests

| Steps | Software result |
| --- | --- |
| 1 | P verifies branded receiving-only output with Customer/Job/shipment, container totals/identity, handling notes and two separate square scan targets. Full Portal instructions and sample/tube graphics are excluded from print. |
| 2 | J's two manifests contain nine rows each; both retain specimen total 18, own count nine and other-shipment count nine. B also retains a 10/20 split and unallocated-pool identity. |
| 3 | V/H3 and the print E2E traverse the full paged manifest. P produces one-page Letter/A4 PDFs in both themes with readable references and white QR margins; backend identity/packet lookup uses the exact encoded input strings. No claim of raster decoder or physical scanner success. |
| 4 | J rejects stale first-confirmation replay without a competing revision. B tests simultaneous first issuance. J and B retain voided/replacement revision identities and frozen crosswalks; H1 and existing frozen-configuration coverage preserve historical issued facts. |

### SHP-12 — Separate return dispatch

| Steps | Software result |
| --- | --- |
| 1 | J rejects return dispatch before packet confirmation. B/H2 require assigned received supply and completed tube matching; viewing/printing does not write dispatch. |
| 2–3 | J records distinct carrier/tracking/time per container, reads Shipped back, and verifies its sibling remains ReadyToShip until separately dispatched. Two subsequent receipt events retain separate shipment identity. |
| 4 | H2/H3 cover parent and sibling return links; J compares every original slot and frozen quote field before/after both dispatches and all accessions. V reopens existing packets without writes. |

### SHP-13 — Split receipt

| Steps | Software result |
| --- | --- |
| 1–2 | B/H4 prove read-only multi-manifest identity lookup and exact tube comparison, then adoption of the registered supplier barcode with immutable external reference. J records each verified tube with its box. |
| 3 | J receives nine tubes from the first container: no aggregate accession yet. Nine from the second bring the total to 18; all containers share the specimen accession number and keep distinct physical identities. Every replay leaves the count unchanged. |
| 4 | B rejects malformed/unknown/wrong/voided associations and whole-specimen receipt lacking required physical tube evidence. H4 adds foreign shipment, missing arrival, stale and duplicate atomic-batch guards. J rejects the voided revision and preserves original arrival time on replay. |

### LAB-02 — Arrival, accession and derived labels

| Steps | Software result |
| --- | --- |
| 1–2 | B records one arrival/time/event on repeated PH-P input, rejects other barcode types and accession before arrival, retains Work visibility and leaves tubes unaccessioned. H4 adds connected lookup and unconfirmed response recovery. |
| 3–4 | J's 9+9 split proves partial versus complete aggregate accession, distinct supplier containers, entered boxes and one specimen accession. H4 supplies the small multi-tube bulk-selection, storage/cancel/declined-discard/reopen and scanner-focus journey. |
| 5 | B/H4 reject wrong-container/unknown/already-decided/voided/packet-as-tube and changed-box attempts. Exact replay creates no new container or count and preserves recoverable screen state. |
| 6 | B's registered-tube journey receives a container without Customer dispatch and preserves null carrier/tracking/dispatch time. Completed shipments leave the accession queue. H4 retains Work/Customer visibility and independently governed scientific acceptance/target behavior. |
| 7–8 | J creates an Aliquot with its immediate parent, rejects supplier-label printing, requires failed-print details, records failure without incrementing print count, then simulated success (one), rejects reasonless reprint and records reasoned reprint (two). All three history rows remain. Derived/adopted identity and boxes resolve; altered/unknown identifiers fail. C verifies count-changing confirmation occurs only after Label printed; P verifies label layout. |
| 9 | H4/B retain Accepted, On hold and Rejected per tube, required reasons/held storage, rejected-without-storage, missing tube left pending, preserved original decisions and authoritative scientific acceptance timing. No unmatched material is attached to guessed work. |

## Defect fixed and checked

Direct printing from the packet page included the application header/footer and produced two pages. Dark theme also colored the paper margins. Shipping print CSS now hides application chrome only when a shipping packet is present, releases the viewport-height shell, and explicitly paints the page/body white with black text. The application's root shell has a stable selector for this rule. Normal on-screen navigation remains visible.

The existing print fixture previously omitted application chrome and expected all 20 tube graphics simultaneously, despite the approved eight-sample paging change. It now includes the shell/header/footer, verifies 16 then four tube graphics across both pages, checks hidden chrome and white body in print, and asserts one PDF page for both paper sizes and themes. All three print tests pass. Visual PDF review caught and corrected the dark page-margin issue that computed body color alone missed.

Customer shipping and Phaeno receipt guides were reviewed: their one receiving sheet, complete Portal manifest, distinct container/tube identities and explicit physical print confirmation instructions remain accurate. This restores documented output without changing an operator action, permission or scientific rule. No guide wording or translation change is required.

## Verification, baseline and artifacts

- Backend: **28 passed, zero failed/skipped**, including the three new journeys in `backend/test/ShippingAcceptancePostgresTests.cs`.
- Components: **113 passed, zero failed/skipped** across 13 targeted files.
- Browser print: **3 passed, zero skipped**; eight receiving PDFs plus one Lab label and one stock-kit label each independently contain one page.
- Connected browser: three existing scoped identities, two unchanged packet DTOs, 13-request paging/return, light/dark short-phone layouts, restricted staff queue, no business writes or browser errors.
- TypeScript and scoped ESLint pass. No dependency, authentication, cross-app contract or schema changes.
- Source: `7df0ccbef62252732ceae877abb4fe7bb9a721dc` plus pre-existing changes and this batch. Connected UI `https://localhost:3016`; API `https://localhost:7116`. Backend tests execute current source in the disposable database, not a claim that the running API or a deployed release contains every workspace change.
- Disposable database `pseq_shipping_acceptance_95cbc9a3c3ad4a5ca37b30fe19a6da8d` used a schema-only copy plus migration history. No source business rows were copied or source migrations applied. The three final branch checks used `pseq_shipping_acceptance_4069cc28fa494103ad7fe51ca7be1698`, also removed. Cleanup succeeded for both. Synthetic fixture unit alignment is confined to the new test database; the existing catalog was not edited.
- Ignored evidence: `tmp/shipping-ten-results/shipping-ten-main.trx`, `shipping-ten.trx`, `components.json`, `browser.json`, `database-run.json`, `database-cleanup.txt`, `packet-{1,2}-{Letter,A4}.pdf`, inspected PNGs and `print-e2e/`. Reusable print regression is under `frontend/e2e/shipping-insert-print.spec.ts`; live read-only script is `tmp/uat-closure-identities/shipping-ten-browser.mjs`.
- Retained connected fixture: Job `TEST14-LARGE-0915`; shipments `72e247a0-06d9-4562-bf80-8ab0b68c93a9` and `809c78b9-7bb2-4fda-84c5-0c65449af5cb`. Both still have unvoided revision one and remain ReadyToShip. No second request, dispatch, receipt, accession or print confirmation was written to them.

## Gates still open

| Gate | Affected cases | Required independent evidence |
| --- | --- | --- |
| Real fulfillment delivery | SHP-05 / ORD-05 | Provider acceptance and configured inbox receipt with controlled recipient and notice link. In-memory sender success is not delivery. |
| Actual stock and custody | SHP-06/07/08/12/13, ORD-05, LAB-02 | Approved materials/lots, physical kit contents and observed partial dispatch/receipt/carrier facts linked to exact saved identifiers. |
| Printer and scanner qualification | SHP-06/10/11/13, ORD-05, LAB-02 | Actual Letter/A4 sheets and label stock, readable/scannable QR identities, printer failure/success/reprint and bench storage/adhesion observations. PDF rendering, keyboard strings and simulated confirmations do not establish these. |
| Scientific and release acceptance | LAB-02 and downstream cases | Real specimen inspection/acceptance, accountable laboratory procedure and eventual qualified release baseline. These software cases confer no scientific suitability or production readiness. |

No Git staging/commit/push, deployment, shared migration, external message or owner's operational-record mutation was performed.
