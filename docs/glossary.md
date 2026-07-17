# Glossary

| Term | Meaning in this repository |
| --- | --- |
| External identity | The Clerk-authenticated provider and subject pair presented by a bearer token. |
| User | The portal-owned account record linked to an external identity. |
| Organization | A tenant or platform organization. Current kinds are `Phaeno`, `Prospect`, `Customer`, and `Partner`. |
| Organization membership | The access link between a user and an organization, including administrative grants. |
| Platform administrator | A user whose active membership grants platform-wide administration. |
| Organization administrator | A membership-level administrator who can manage an eligible organization's members and invitations. |
| Invitation | A time-limited, organization-scoped offer to create or connect a user account. |
| API envelope | The standard `success`, `data`, `error`, and `meta` response shape. |
| Audit event | An append-only record of a persisted entity change and its actor/request context. |
| Concurrency version | The numeric version used to reject stale updates. |
| HubSpot prospect | A commercially interesting company or contact managed in HubSpot. This does not create a Portal organization, invitation, or access. |
| Portal Prospect | An approved evaluation tenant with Trial Project or explicitly granted curated-data access. It is not every HubSpot prospect and may later convert to Customer or Partner. |
| Customer | An end-user organization that can place lab service orders, track submitted samples, and access resulting data released through the portal. |
| Partner | An external organization that may be entitled to submit specimens for Phaeno processing, order reagents, or submit data for assembly. Partner specimen work does not require downstream-customer identity. |
| Service entitlement | An approved organization-specific capability controlling which Customer or Partner sales and operational workflows are available. Organization kind alone does not grant every service. |
| Direct Portal sale | Standard configured work whose complete price and terms can be accepted in the Portal without Sales negotiation. |
| Sales-assisted work | Bespoke or exceptional work managed as a HubSpot Deal before a pending operational handoff creates executable Portal work. |
| HubSpot Order summary | The relationship-safe HubSpot record for one committed Portal sale. It is not the Portal operational record or the QuickBooks financial authority. |
| Lab service order | A Customer request involving physical sample submission, Phaeno accessioning and laboratory analysis, data processing, and portal delivery of resulting data. |
| Commercial Operations | The domain that owns customer-facing orders, authorization, quotes, safe status projections, files, payment gates, and publication. It does not own detailed laboratory execution. |
| Lab Operations | The Phaeno-only execution domain and replaceable provider that owns authorized laboratory work, receipt/accession, physical lineage, controlled protocols, materials/equipment, libraries/batches, NGS sendouts, exceptions, and scientific approval. |
| Lab work authorization | The immutable, versioned Commercial permission for Lab Operations to perform a defined service for submitted specimens. It is not a quote or a laboratory work order. |
| Lab work order | The Laboratory-owned execution record created from an accepted Commercial authorization. It is not the customer-facing lab service order. |
| Laboratory role | An additive Phaeno-only assignment: Operator, Supervisor, Protocol Administrator, Scientific Reviewer, or Lab Operations Administrator. Active Phaeno membership is also required. |
| Partner specimen-processing order | A Partner-owned request for Phaeno specimen processing. Phaeno does not require or infer the Partner's downstream-customer identity. |
| Sample accessioning | Phaeno's receipt and registration of a submitted physical sample so its laboratory progression is traceable. |
| Laboratory container | A physical submitted or derived material identity with barcode, label history, location, quantity, and parent-child lineage inside Lab Operations. |
| Controlled protocol version | An approved, immutable execution definition pinned to assigned work so later protocol changes cannot rewrite active or historical execution. |
| Lab projection | The Commercial-owned, customer-safe view of a Lab work milestone, schedule health, expected timing, action summary, and reviewer-permitted QC. It is not the Laboratory event ledger. |
| Ready for release | Scientific approval milestone projected from Lab Operations to Commercial. It creates no file or download and does not bypass scan, payment/credit, or publication gates. |
| Reagent order | A Partner order for reagents supplied through Phaeno's fulfillment workflow. |
| Data assembly request | A Partner submission of data for Phaeno processing and delivery of downloadable assembled data/results. |
| Seed data | Phaeno-selected data granted to an organization independently of lab service results or data assembly inputs and outputs. |
| Prospect-eligible sample data | Phaeno-owned, de-identified sample data approved for possible Prospect assignment; eligibility alone does not grant access. |
| Synthetic reference fixture | A Phaeno-created, non-production sample fixture used to exercise the baseline source, curation, grant, and download workflow without claiming scientific validity. |
| Prospect sample-data grant | Explicit view-and-download access assigned by an authorized Phaeno user from eligible sample data to one Prospect organization. |
| External-organization curated-data grant | Explicit access assigned by Phaeno to one Prospect, Customer, or Partner organization for one exact curated package version; organization kind never grants access automatically. |
| Grant revocation | An audited Phaeno action that immediately stops future portal viewing and downloading for the organization; it cannot recall prior downloads. |
| Grant suspension | Temporary loss of access caused by organization inactivity; it does not revoke the grant, and reactivation restores non-revoked access. |
| Package quarantine | An emergency cross-organization access block for every published version derived from a source with a de-identification, ownership, or sharing-rights concern; all evidence and history remain preserved for investigation, and clearance is allowed only after a documented safe outcome with no content change. |
| Quarantine suspension | Temporary package-version inaccessibility that preserves organization grants; clearance restores only grants that remain active and non-revoked. |
| Quarantine investigation access | Phaeno-only, purpose-limited, fully audited access to quarantined contents by a specifically authorized investigator. |
| Quarantine closeout attestation | One affected organization administrator's recorded confirmation that local copies were deleted and downstream recipients were notified after an unsafe or no-longer-shareable disposition. |
| Quarantine follow-up | Reminder and Phaeno review work for an outstanding organization closeout attestation, without automatic consequences for unrelated organization access. |
| Incident attestation due date | The required, incident-specific date selected by Phaeno for affected organizations to complete quarantine closeout attestations. |
| Recorded-by-Phaeno attestation | An organization closeout confirmation received outside the portal and entered by an authorized Phaeno user with the organization contact, evidence source, Phaeno actor, and timestamp preserved. |
| Withdrawn package version | A permanently inaccessible version confirmed unsafe or unshareable; it cannot be cleared or granted again, remains preserved as evidence, and corrections require a new version. |
| Active curated-data grant | A non-expiring organization grant that remains available until explicit Phaeno revocation, except while the organization is inactive. |
| Catalog removal | Removal of a package's general Prospect eligibility; it prevents new grants without changing existing organization access. |
| Catalog-wide revocation | An optional destructive catalog-removal action that revokes a package for every Customer, Prospect, and Partner organization with access. |
| Package access notification | An administrator notification and portal activity event produced when Phaeno grants, upgrades, or revokes a curated package. |
| Package download history | Tenant-scoped audit history showing the downloading user, package/version, and timestamp without recording package contents. |
| Package retirement | An irreversible, non-deletion lifecycle action that permanently prevents new grants while preserving all existing grants, package data, and access. |
| Published-version retention | Indefinite preservation of every published curated package version and its files, including superseded and retired versions, unless a future exceptional purge process is used. |
| Curated sample package | The complete, read-only set of approved records and files Phaeno places in the curated area for one sample; an organization grant applies to the package as a whole. |
| Internal Phaeno source sample | A Phaeno-owned sample created through the dedicated internal Phaeno sample workflow, separate from Customer lab-service samples and Partner data-assembly inputs or outputs, that may become eligible for curation after de-identification. |
| Source-sample registry | The Phaeno-only workflow for registering an internal source sample, attaching approved data, and recording ownership and de-identification evidence before curation. |
| Ready source-sample revision | A complete, atomically validated, immutable source-sample revision eligible to be snapshotted into a curated package draft. |
| Source sample snapshot | The lineage-preserving copy of one selected Phaeno-owned sample's approved data used to create a curated package draft. |
| De-identification eligibility | Required source-sample evidence that Phaeno owns the sample and de-identification is complete before curation can begin. |
| Source-sample ownership evidence | The Phaeno ownership basis, confirmer, confirmation time, and non-sensitive evidence reference or notes required before a source revision can become ready. |
| De-identification evidence | The confirmer, completion time, method or policy, and non-sensitive notes proving that de-identification was completed without retaining removed identifiers. |
| Package presentation metadata | Phaeno-authored title, description, release notes, or explanatory text that describes a package without altering its snapshotted sample data. |
| Curated package summary | The required portal-visible sample description, biological and assay context, analysis summary, QC status, and provenance published with every curated package. |
| Curated package manifest | The checksummed inventory of all records and files in the complete downloadable source snapshot. |
| Complete package archive | A downloadable bundle containing the manifest and every file in one exact immutable curated package version. |
| Approved file kind | A Phaeno-approved scientific file format allowed in a curated package; an unapproved kind blocks publication. |
| Curated-data terms | The portal's standard terms governing curated sample access; there is no separate package-specific acceptance in the initial workflow. |
| Curated sample package version | An immutable snapshot of a curated sample package. Prospect grants remain pinned to the selected version until Phaeno explicitly upgrades them. |
| Superseded grant version | A previously granted package version retained with its history after an explicit upgrade but no longer viewable or downloadable by the organization. |
| Data ownership class | The authorization boundary distinguishing Phaeno-owned curated Prospect data from Customer- or Partner-owned operational data. |
| Operational-data access | Member access to Customer- or Partner-owned samples, results, assembly inputs, or assembly outputs, managed by organization administrators with audited Phaeno support. |
| Provisioning run | The audited, retryable record of an exact-version curated-data grant or upgrade attempt for an organization. |
| Analysis definition | Phaeno configuration describing Customer sample requirements, instructions, expected results, and linked QuickBooks billable items. |
| Assembly profile | Versioned Phaeno configuration describing Partner metadata, accepted file kinds, validation, expected output, Partner availability, and linked QuickBooks items. |
| Partner reagent offering | The Partner-specific availability, negotiated price, currency, effective period, quantity rules, and shipping restrictions for a QuickBooks-linked reagent item. |
| Immutable quote | A versioned per-job commercial offer whose scope, line items, price, currency, and expiration do not change after issuance. Later scope changes create a new quote or amendment. |
| Quote validity | The period in which the current quote may be accepted. The initial configurable default is 30 days, and each quote snapshots its own expiration. |
| Commercial document link | The durable association between a portal workflow and a QuickBooks estimate, invoice, adjustment, or payment link. |
| Commercial synchronization | The durable, idempotent transfer or reconciliation of commercial facts between Phaeno Portal and QuickBooks Online. |
| Credit-approved release | Net 30 release allowed by the applicable audited Customer-lab or Partner-assembly credit setting after required invoice synchronization. |
| Payment release gate | A download block for an organization without applicable approved credit until QuickBooks confirms the completed invoice is paid. |
| Operational status | The workflow's scientific, laboratory, fulfillment, or processing progress; it remains separate from quote, sync, payment, and file-release state. |
| Result release | An immutable Customer sample-result version containing scanned, checksummed artifacts and scientific provenance/QC facts. |
| Assembly input revision | An immutable snapshot of the Partner metadata and files submitted for one data-assembly intake review. Corrections create another revision. |
| Assembly output release | An immutable manifest and file set tied to one accepted input revision and assembly profile, subject to the applicable commercial release gate. |
| Reagent substitution | A Phaeno-proposed replacement that cannot be fulfilled until an authorized Partner administrator explicitly approves it. |
| Backorder | The unshipped remainder of an accepted reagent-order quantity preserved after a partial shipment. |
