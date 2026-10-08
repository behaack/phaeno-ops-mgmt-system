# Current configuration relationships

Status: product behavior clarified; implementation pending. This record does not claim runtime, database, or deployment changes.

## Product decision - September 28, 2026

Phaeno configuration administrators link reusable scientific and shipping objects by identity. They do not choose specific dependency versions. Each configuration picker lists an object once by name. New work follows its current usable version: approved Lab steps, approved Protocols, production service workflows, and active shipping configuration. Pending Drafts never displace usable versions. Unavailable dependencies block new work instead of silently falling back to an older retired or inactive revision.

This decision supersedes exact dependency selection/adoption in the Lab step and kit plans. Numbered configuration revisions still govern their own content and relationship choices; activating a successor dependency does not require changing every referring configuration. Step ordering, occurrence identity, required/optional/conditional placement, independent approval, permissions, and audited lifecycle changes remain enforced.

Operational commitments preserve exact evidence. Placed Jobs and issued shipping packets keep their shipping revisions. Physical kit assemblies freeze resolved step versions and instructions at creation. Selected scientific attempts and preparation trays freeze the resolved workflow stages, Protocol versions, and Lab step instructions for their work. Explicitly approved Trial scientific scope also retains its approved definition. Existing records are never re-resolved against future configuration.

## Engineering scope

- Replace kit workflow step snapshots with ordered Lab step identities. Resolve and validate current approved instruction-only versions when saving, approving and starting assembly; run snapshots retain exact IDs and text.
- Protocol occurrences refer to Lab step identities. Resolve current approved content for configuration display/preview and new scientific work, preserving occurrence keys, placement requirements and conditions. Keep exact version provenance in operational definitions.
- Service workflow stages refer to Protocol identities. Resolve current approved Protocols and their Lab step dependencies together at scientific attempt/tray creation, then use the saved resolution for every subsequent stage and evidence operation.
- Audit Samples & shipping settings relationships and pickers: Sample type to Shipping procedure, Kit specification to Sample type and assembly method, and destination selection/defaults. Keep family-level resolution for new Jobs and preparation; preserve existing Job/packet/physical-kit pins.
- Apply a verified additive EF migration to the configured local development database only; update the complete ERD. Convert old configuration references through verified identity foreign keys, refuse missing/ambiguous mappings, and populate operational snapshots from their existing exact definitions. Add no runtime compatibility adapter.
- Update affected Phaeno help and living test plans. Compilation/static checks and bounded manual browser checks are the current verification scope. Automated suites require a request. No Git publishing or deployment is part of this change.

## Acceptance

1. Each relationship picker lists identities without selectable dependency versions.
2. Approval/activation of a successor advances new work automatically through every relevant relationship.
3. A newer Draft has no effect on usable configuration or existing work.
4. Retirement, deactivation or incompatible current content blocks new work with a useful explanation.
5. Repeated step occurrences keep separate keys and execution evidence.
6. Work already selected/created retains its exact resolved versions, instructions, fields, conditions and source lineage across subsequent approvals.
