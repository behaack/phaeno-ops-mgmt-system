# Revision strategy

This policy applies to every Portal record that has a stable identity and numbered content revisions. An object may call its usable state Active, Approved, Published, or another domain term; the same identity, display, and pending-revision rules apply. Scientific approval, physical readiness, authorization, and record-specific restrictions still determine whether a revision can become usable.

## Identity and display

- Keep the object's stable identity separate from each exact revision. A detail URL opens the exact revision named by that URL; history links never silently redirect to a newer revision.
- A discovery-list row represents the object. When a revision is currently usable, its primary title link, revision badge, key values, capacity or other comparable fields, preview, and status pill all describe that same revision. A newer pending revision appears below with its own exact link and status. If no revision is currently usable, the primary line shows the latest revision and its unavailable state.
- Search includes the displayed revision and any newer pending name or identifier. Filters for usable objects use the current usable revision, even when the latest revision is pending.
- Detail pages show the viewed revision's own status and values. Put revision history after the record's details and relationships.
- Name the exact revision affected by an action whenever it differs from the revision shown on the primary line.

## Creating and resolving revisions

For Sample types, Phaeno ship-to destinations, Shipping procedures, and Kit specifications, the [shipping configuration plan](plans/SHIPPING-CONFIGURATION-VERSIONING-PLAN.md) supersedes the general status and relationship rules below. These four records start as editable Drafts, and their Sample type-to-procedure and Kit specification-to-Sample type relationships are content of the owning revision. An administrator directly activates a complete Draft or discards it without reusing its number. Placed Jobs retain exact Sample type and procedure pins through ordinary supersession or deactivation; a separate audited safety hold blocks later packets.

- A new content revision preserves every relationship of the preceding revision, including single and multiple links. Keep identity-level links on the stable object; copy revision-level links exactly when the model stores them on each revision. Never clear, reassign, or silently advance an exact-revision link during content revision. Show inherited relationships in the revision form as read-only context. Change a relationship only through its explicit, audited relationship action, subject to that relationship's domain rules.
- A new content revision starts with a visible Status choice defaulted to the usable state when that state is permitted. Choose Inactive or the domain's pending state to save for review. Record-specific prerequisites may force a draft; explain why and provide its activation path.
- Saving a pending successor leaves the preceding usable revision available for new work. It does not change that predecessor's content, end time, or issued snapshots.
- Permit at most one unresolved successor per object. While a newer revision has not yet become usable, disable **Create revision** with a clear reason and reject the same operation in the API. Initial version 1 setup is not a successor. Resolve a pending successor by activating it, or by an explicit audited correction or withdrawal flow where the domain permits one; do not create another numbered revision merely to fix a pending one.
- Activation checks current dependencies, approvals, effective dates, and domain readiness on the server. It closes the earlier usable interval when the new revision takes effect. A future start preserves the earlier revision until that time. Deactivation never silently reactivates an older revision.
- Do not reactivate an ended, withdrawn, or superseded revision when the domain requires a new revision. Preserve immutable issued instructions, orders, shipments, scientific outputs, and other exact-revision snapshots.
- Status changes do not increment the content revision number. Enforce authorization, audit stamping, optimistic concurrency, and family-level serialization for competing status and revision commands.

## Adoption

Transportation kits implement the active-revision primary row, secondary Draft link, explicit activation, predecessor retention, and server-enforced one-Draft gate. Their initial version 1 Draft can be revised during setup; any Draft can be edited or Discarded without reusing its number. Historical containers without a named Phaeno finished-kit product may be Active for record management, but are never ready for new Orders.

Sample types, Phaeno destinations, and Shipping procedures use the shipping Draft lifecycle described above. Other versioned Portal records must be audited before claiming they conform. Do not change their APIs or scientific lifecycle solely because this policy was recorded.
