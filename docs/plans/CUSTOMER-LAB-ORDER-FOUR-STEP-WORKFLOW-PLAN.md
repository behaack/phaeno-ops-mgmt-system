# Customer Lab order: four-step kit and sample workflow

Status: implemented locally for new initial manual-quote and configured-standard orders; connected and physical acceptance pending. September 29, 2026.

## Product discovery and outcome

Customer organization or Department administrators accept PSeq pricing and
prepare physical samples. Phaeno fulfills Transportation kits and receives the
return shipments. The current six-step Job display requires the Customer to
finalize a sample list before requesting kits, then assign containers and match
tubes separately. The Customer wants one clear confirmation of price and order,
an automatically initiated kit fulfillment, and a one-sample/one-tube entry
sequence after the physical kits arrive.

Success is a four-stage Customer journey: **Confirm price and order**, a kit stage
that reads **Preparing your transportation kits** until dispatch and **Receive
transportation kits** after dispatch, **Prepare sample shipment**, and **Send samples**. No Customer kit-type
acceptance is required. Each saved sample ID is paired with one distinct,
registered barcode from the exact received kit selected for that shipment.
POMS still retains separate physical custody, immutable commercial, Lab
authorization, packet, and dispatch evidence behind these four stages.

## Settled product rules

1. POMS may propose a Sample type during pricing. At acceptance, the Customer
   actively confirms the type and the Department-scoped kit delivery location.
   A manual quote confirms the Sample type saved on the Job and rechecks its
   current shipping readiness; it does not depend on a configured standard
   offering. A configured standard order also checks the selected offering's
   supported Sample types. If a different type changes pricing, scientific
   scope, handling or turnaround, the Customer requests a revised quote rather
   than silently accepting the old one. The accepted choice and address are
   frozen for this order. An address correction before dispatch requires
   explicit review; dispatched kits retain their original address snapshot.
2. Accepting an initial manual quote or placing a configured standard order creates one durable, idempotent kit
   fulfillment obligation for the accepted sample count. Phaeno chooses the
   approved compatible kit configuration and quantity. Existing compatible,
   physically received, unreserved stock at the chosen location can cover the
   requirement; only a shortage needs outbound delivery. Kits and outbound
   delivery remain included in the Lab order. A pending request is operational,
   not another Customer purchase or approval. Accepted additional-sample Change
   quotes retain the existing supplemental sample and kit pathway for now; that
   separate scope needs its own shortage accounting before conversion.
3. Kit receipt means physically confirming the kit IDs that arrived. Partial,
   missing, damaged, expired, withdrawn and replacement kits stay visible as
   exceptions. Dispatch or tracking alone never makes a kit available for
   sample preparation. In the new Job's single-kit receipt dialog, the
   administrator scans or enters the barcode printed on that physical kit.
   The value must match the selected dispatched kit before receipt is saved;
   an empty or mismatched entry stays in the dialog for correction. Scanner
   Enter checks the value and moves focus to the explicit confirmation action
   when it matches. The dialog sends that barcode with the existing per-kit
   receipt request, and the server compares it with the dispatched kit's saved
   number before updating receipt. The added request field is optional so the
   legacy multi-kit receipt flow remains unchanged.
4. In Prepare sample shipment, the Customer scans and saves one received kit
   number before any tube entry. The saved kit identity is fixed and persists
   across reloads. The Customer then enters **one Sample ID and one tube barcode
   at a time**, with biological
   source and declared material amount/unit. Each save validates the kit's
   Department/location/Job eligibility, exact registered tube roster, pinned
   Sample type, uniqueness, and current physical status. The paired path counts
   one physical tube per sample, separately from the declared material amount.
   Kit usable tube capacity counts physical tubes; it is not the volume
   of each tube. The paired path must not reject a Sample type's material
   quantity unit as an unsupported tube-count unit at pair save or finalization.
   Each Tube product records its maximum sample amount and unit; each Sample
   type revision records its minimum sample amount and unit independently of
   submission tube count. Both limits must be configured and use the same unit.
   A tube maximum must meet or exceed the Sample type minimum. Kit activation
   checks this when the linked Sample type is active; order readiness excludes
   incompatible kit configurations, and pair save rejects a missing
   or mismatched unit or an entered amount outside the inclusive range. The
   selected physical kit's tube product and the pinned Sample type supply the
   amount unit and accepted range on the Customer form; do not infer capacity
   from a product name or description. Existing local active Test Sample Type
   and 2mL RNA Tube product were explicitly configured at 1.5 mL minimum and
   2.0 mL maximum after adding the nullable fields. The owner also corrected
   the local Test Sample Type's old `Tube with 1ml` submission-unit wording to
   `2mL tube`, a tube-count unit that matches the supplied product. These are
   local data repairs, not an automatic production backfill.
   The interface advances only
   after the pair is saved; errors preserve both entries. A short running list
   permits review and audited correction before final confirmation. The active
   row has a Save action at its end; after a save, it becomes a read-only row
   under the fixed kit number and a blank row follows. When multiple kits are
   required, staff explicitly finish the current kit before scanning and
   saving the next kit; unused tubes may remain. Each pair remains tied to its
   saved kit. A correction to a finished kit reopens it for review.
   Each sample receives one sequencing run automatically; do not show a run
   count field, allocation progress, or run count in saved pairs for the usual
   one-run-per-sample order. An accepted order that explicitly purchases more
   runs than samples retains an allocation field and run totals so it can be
   completed without losing that purchased scope. Final confirmation requires
   the accepted sample/source totals and any explicit additional runs before
   authorizing Lab work and shipment preparation.
   Keep Biological source, Sample ID, Tube barcode, and Quantity (unit) on one
   row at wide widths, with one set of field headings for the active pair.
   Show the fixed unit in the Quantity label, not as a separate column or
   editable field. When the order has one accepted biological source, preselect and
   display it read-only; multiple sources retain the selector. Put the
   no-patient-identifiers reminder above the entry row so the fields align.
   Match the read-only source box and source selector to the neighboring input
   height and label baseline, and keep Quantity compact.
   Final-confirmation errors span the available dialog content width; the
   close control still has clear space beside the title and description.
5. Send samples retains per-kit insert review, exact frozen sample/tube
   crosswalk, print-and-pack acknowledgment, carrier handoff and tracking.
   Partial dispatch remains possible; Send completes only after every required
   active shipment is recorded as sent. Phaeno physical receipt and accession
   happen afterward and are not inferred from Customer dispatch.

## Historical implementation baseline and gap

- New Jobs currently select one Sample type before pricing; the Job and quote
  show it. The POMS choice checks general PSeq/shipping readiness, while the
  service offering model separately lists supported Sample types. Acceptance
  revalidates the saved type, but does not take a Customer-confirmed type or kit
  delivery location.
- Quote acceptance is idempotent and pins the shipping procedure. The kit
  request stores a Job ID, delivery location, immutable address snapshot and
  requested kit lines, so it does not need a shipment FK. The current kit
  recommendation, request, fulfillment and destination choice require a
  finalized sample list and a generated shipment; those gates must move to
  the accepted order's planned tube count and selected Sample type.
- Finalizing the exact sample list currently creates Lab authorization and
  shipment slots. Tube matching currently happens later and already rejects
  unknown, duplicate and wrong-kit barcodes. The proposed one-at-a-time
  Customer flow requires durable draft pairs or an equivalent atomic save
  before finalization, then an exact finalization/binding transaction. It must
  not create Lab authorization from an incomplete pair list.
- Current issued and accepted orders, dispatched kits and issued packets keep
  their saved history. No automatic kit request or guessed address is created
  retroactively. The new four-step presentation should explain recovery for
  historical orders lacking the newly required confirmation details.

## Implementation slices

1. **Confirmation contract.** Resolve the active quoted service's supported
   Sample types; display the quoted type and allowed same-terms choices.
   Read active Department delivery locations. Extend initial quote acceptance
   with explicit type/location/version, enforce compatibility and current
   quote/version, freeze the address, and create the fulfillment obligation in
   the same idempotent transaction. Keep configured direct placement aligned.
2. **Pre-roster kit fulfillment.** Compute the initial kit need from the
   accepted sample/tube policy; Phaeno selects exact approved specifications
   and dispatches physical registered kits. Remove finalized-roster dependency
   from request, dispatch and destination routing while retaining all physical
   stock, compatibility, scope, concurrency and receipt checks. Expose
   Pending, Partially dispatched, On the way, Received and exception states.
3. **One pair at a time.** Persist draft sample/tube pairs with order,
   Department, selected physical kit, source, amount/unit and actor/version.
   Validate uniqueness and the registered tube relationship on every save;
   recover drafts after navigation and stale responses. Final confirmation
   atomically verifies exact accepted totals, finalizes Lab authorization,
   creates shipment slots and binds the already verified pairs. Preserve
   correction audit and safe retry semantics. Keep CSV import only as a
   reviewed exception path if it can satisfy the same pair validation.
4. **Four-stage experience.** Replace the six-stage progress display and
   duplicate kit-order/assign/match actions with the four-stage navigation.
   Keep contextual Phaeno fulfillment and Customer receipt actions inside
   the kit stage. While Phaeno prepares an unshipped order, call the stage
   Preparing your transportation kits and its navigation action View kit order.
   Once a kit is dispatched, call the stage Receive transportation kits and
   its action Record receipt. Its indicator shows the saved fulfillment state:
   kit order received by Phaeno, sent, physically received, or a partial state.
   Keep the sample-entry panel out of view until the server reports a compatible
   physical kit received at the order's confirmed location. A partial receipt
   opens preparation for the received kit while outstanding kits remain visible.
   The receipt confirmation body shows the saved physical kit number and
   carrier/tracking details and requires a matching scanned kit barcode before
   saving.
   The kit-delivery card presents one prominent fulfillment state and the saved
   delivery address; it shows physical-kit tracking rows only after dispatch.
   The containing Samples and shipping card describes only the current work,
   rather than summarizing later sample and return-shipping stages.
   Order details put sample and biological-source scope to the left of price,
   quote and billing on wide screens. Remove the separate Sample submission
   card; show saved instructions beside preparation once that work is available.
   Keep the sample-preparation prerequisite beside the fulfillment state, not
   as a detached repeat below the card. Use status text and semantic colors
   together so pending, in-transit, received, and cancelled states are clear.
   Prepare sample shipment then shows one active pair form, progress,
   kit identity, review and correction; the next empty pair receives focus on
   save. Send shows the existing per-kit packet, packing and dispatch flow.
   Update Customer and Phaeno help and read-only historical views.

## Data and release boundary

The additive `20260929201411_AddLabSampleTubePairs` migration and ERD update
preserve existing records. The owner approved local application after review;
the migration was applied to the configured local development database on
September 29. Existing placed orders remain on their historical path, while
newly confirmed orders use draft pairs. The owner requested a subsequent
hosted release; that release must satisfy the current hosted database,
backup, rollback, and verification gates recorded in `AGENTS.md` and
`HOSTED-CLEAN-DATABASE-20260929-PLAN.md`.

## Local verification and remaining acceptance

The API and test project compile in Release; frontend lint, TypeScript and
documentation corpus checks pass; and the generated migration contains only
the new table, foreign keys and indexes. On September 29, the owner requested
the full automated suite and release. The first full run exposed outdated
fixtures and UI expectations; fixes and reruns are in progress. Authenticated
Customer/Phaeno browser review, physical kit and scanner handling, and
provider/laboratory evidence remain separate acceptance gates.

September 29 correction: initial manual-quote acceptance no longer queries
configured standard offerings to decide whether the quoted Sample type is
supported. The Job's confirmed type must still match the quoted scope and pass
the current shipping-readiness check. This avoids rejecting valid manual quotes
in environments without any configured standard offerings.

## Acceptance and success measures

- An issued quote cannot be accepted without a supported Sample type and an
  active, Department-scoped kit delivery location; a stale quote, type,
  location or version fails without an accepted quote or duplicate request.
- One successful confirmation yields one accepted order and one fulfillment
  obligation, even on retry. Phaeno can dispatch before any Sample ID is
  entered. The Customer sees tracking and confirms only physically received
  kit IDs.
- A Customer scans and saves the kit number before entering one Sample ID/tube
  barcode pair at a time. The kit selection survives reload; a different kit
  cannot start until the earlier kit is explicitly finished, including when
  some tubes remain unused. A wrong-kit,
  duplicate, unknown, used, unreceived or incompatible tube cannot save.
  Failed saves retain the entered pair. Reloading restores saved draft pairs.
- Final confirmation rejects missing/excess pairs, wrong source totals, wrong
  run totals and missing material declarations. Lab authorization and shipment
  slots are created once. Every authorized sample is linked to exactly one
  registered tube in its selected physical kit.
- At desktop and phone widths in light/dark themes, the four stages, focus
  return, error messages, scanning, correction and partial-kit cases remain
  usable with keyboard and assistive technology. No duplicate customer kit
  acceptance appears. Existing quote, kit and shipment history remains
  readable.

The measurable outcome is one Customer commercial confirmation, zero extra
kit-type approvals, zero accepted sample/tube mismatches, and no duplicate kit
fulfillment from retry or reload. Automated/backend/frontend/browser and
physical scanner/label acceptance evidence remain distinct; execute tests
only when requested under the repository test policy.
