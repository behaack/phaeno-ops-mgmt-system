# Current active sample-type selection

Status: active. Owner approved September 19, 2026.

## Behavior
Shipping rules select a sample-type identity and automatically resolve its highest active, currently effective revision for new previews, packing and packet issuance. Inactive, future and ended revisions are excluded; missing effective revisions block issuance explicitly. Published packets retain exact immutable revision snapshots. Destinations remain revision-specific. Container compatibility follows the same sample identity, while its instruction-rule identity remains exact. Activating a sample revision approves that revision for these existing rules and compatible containers; limits and quantity units are revalidated at issuance.

Compatibility group is a shared handling label, not a unique reference. Matching groups permit combining sample types only when no rule requires separate shipment. Explain FROZEN_RNA as a suitable example for the approved frozen-RNA workflow; do not automatically classify other materials.

## Implementation

### September 21: availability without content revisions

Owner authorized separating Activate/Deactivate from Create revision. Phaeno
configuration administrators change a saved revision's availability in place;
its ID, reference, content and revision number stay fixed. Existing audit events
record actor, time and old/new status; optimistic concurrency rejects stale actions.
Expose one Actions menu on the list and detail, with a confirmation describing
the selected revision and effect on new shipping work. New UI-created content
revisions start inactive; creation no longer includes an activation checkbox.
The existing create API remains compatible with established callers.

Activation is available on the latest non-ended revision and respects a future
effective start. It closes earlier active intervals at activation time (or the
future start), without backdating retirement to a draft's original start.
Deactivation remains available on an earlier still-active revision when a newer
draft exists. Surface that active predecessor explicitly on the latest record.
Ended historical revisions cannot be reactivated, and deactivation never reopens
an older interval. Family mutations share the existing database transaction-lock
mechanism so concurrent activation and revision creation cannot fork availability.
Issued packets and existing scientific content stay unchanged. Reuse existing
columns and audit infrastructure; no schema migration, permission change or new
dependency. Update regression sources and documentation, build/typecheck/lint;
test suites remain request-only. This local refinement is not a deployment.

The owner extended this correction to shipping assignments and their destination
prerequisite. Live read-only inspection found Santa Barbara Lab revision 1 inactive
while the assignment revision dialog requested activation. Add the same explicit
status transitions to destinations and assignments. Activation checks destination,
current sample and selected procedure at now or the scheduled future start, not a
past draft start. Show named prerequisite problems and setup links before submit;
do not auto-approve related records. Destination/assignment drafts must leave
earlier active revisions available, with actions for deactivating those revisions.
Retain exact destination references and reject overlapping assignment families.

Use the existing stable DefinitionKey through each stored sample revision reference; no schema migration or API contract break is needed. Retain original references as identity anchors and preserve historical DTOs/snapshots. Update current-resolution consumers rather than rewriting saved references.

- [x] Central family/current-revision resolver and rule matching.
- [x] Readiness, new order shipment setup, packing, container compatibility, preview and packet snapshots.
- [x] Name-based form selection, active revision readback and compatibility explanation.
- [x] Focused regression source coverage, builds and documentation. Test suites remain request-only.
- [ ] Verify against the restarted local API and signed-in browser.

## September 19 verification
Full API solution build passed with zero warnings/errors. Frontend TypeScript, scoped ESLint, generated documentation consistency and diff whitespace checks passed. PostgreSQL regression sources compile but were not executed because suites were not requested. The browser currently reports Access check failed; asked the owner to rebuild/restart the local API. No configuration record was created, activated or rewritten by this implementation; no migration is needed. Prior unrelated repeated-sequencing work remains tracked separately.

## September 21 availability verification

Implemented locally for samples, destinations and shipping assignments. The full
API solution, including the new PostgreSQL regression sources, builds with zero
warnings or errors. Frontend TypeScript, scoped ESLint, generated documentation
consistency (56 guides), and whitespace checks pass. Tests were not executed under
the request-only repository policy. Read-only live inspection confirmed the
inactive destination behind the reported assignment failure; no production data
or open unsaved form was changed. Runtime transition and browser acceptance remain
pending. No database migration, commit, push or deployment was performed.

Follow-up live investigation confirmed the assignment retains destination revision 1 (inactive and ended), while destination revision 2 is active. The same name does not make these references interchangeable. The new status preflight correctly blocks the historical destination and directs creation of an assignment for the current destination. Owner authorized deployment of the completed correction and settings naming follow-up; production configuration changes remain separate.
