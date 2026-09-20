# Current active sample-type selection

Status: active. Owner approved September 19, 2026.

## Behavior
Shipping rules select a sample-type identity and automatically resolve its highest active, currently effective revision for new previews, packing and packet issuance. Inactive, future and ended revisions are excluded; missing effective revisions block issuance explicitly. Published packets retain exact immutable revision snapshots. Destinations remain revision-specific. Container compatibility follows the same sample identity, while its instruction-rule identity remains exact. Activating a sample revision approves that revision for these existing rules and compatible containers; limits and quantity units are revalidated at issuance.

Compatibility group is a shared handling label, not a unique reference. Matching groups permit combining sample types only when no rule requires separate shipment. Explain FROZEN_RNA as a suitable example for the approved frozen-RNA workflow; do not automatically classify other materials.

## Implementation
Use the existing stable DefinitionKey through each stored sample revision reference; no schema migration or API contract break is needed. Retain original references as identity anchors and preserve historical DTOs/snapshots. Update current-resolution consumers rather than rewriting saved references.

- [x] Central family/current-revision resolver and rule matching.
- [x] Readiness, new order shipment setup, packing, container compatibility, preview and packet snapshots.
- [x] Name-based form selection, active revision readback and compatibility explanation.
- [x] Focused regression source coverage, builds and documentation. Test suites remain request-only.
- [ ] Verify against the restarted local API and signed-in browser.

## Verification
Full API solution build passed with zero warnings/errors. Frontend TypeScript, scoped ESLint, generated documentation consistency and diff whitespace checks passed. PostgreSQL regression sources compile but were not executed because suites were not requested. The browser currently reports Access check failed; asked the owner to rebuild/restart the local API. No configuration record was created, activated or rewritten by this implementation; no migration is needed. Prior unrelated repeated-sequencing work remains tracked separately.
