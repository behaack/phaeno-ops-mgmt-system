# Decision log

This file records durable decisions visible in current code. Dates are capture dates, not claims about when the original decision was made.

## 2026-07-14: External identity is separated from product authorization

Status: observed in current code.

Clerk authenticates the person, while the API resolves an internal user and active memberships for authorization. Tenant access must not be granted solely from frontend state or external claims.

## 2026-07-14: The API uses feature ownership and a common envelope

Status: observed in current code.

Backend code is organized under `Features/<FeatureName>`, with common API response/error behavior in infrastructure and exception middleware under `/api`.

## 2026-07-14: PostgreSQL persistence owns audit and concurrency behavior

Status: observed in current code.

Auditing and version increments are centralized in EF persistence. Endpoints should participate through the established entity interfaces rather than duplicating this logic.

## 2026-07-14: Normal removal is deactivation

Status: observed in project guidance and persistence rules.

Users and organizations are deactivated for normal product workflows. Hard deletion requires a separately approved purge/retention design.

## 2026-07-14: Partner is the external-organization product term

Status: confirmed by the Product Owner and implemented.

Use `Partner`, not `Distributor`, in product language. Partner persistence,
membership authorization, reagent ordering, and data assembly are implemented.

## 2026-07-14: Portal Prospect is an evaluation tenant phase

Status: confirmed by the Product Owner and implemented.

A Portal Prospect is an approved evaluation tenant, not every commercial
prospect. It can have users, manage its own users, and access curated data
assigned by Phaeno. Prospects cannot order. Conversion to Customer or Partner
preserves the organization and its history rather than replacing it.
Existing seed-data access remains unless Phaeno explicitly removes or replaces
it.
Conversion preserves all existing curated-package grants and exact pinned
versions. It performs no automatic grant additions, replacements, upgrades, or
revocations.

Prospect sample-data access has two levels. Authorized Phaeno users maintain the
catalog of sample data generally eligible for Prospect access, then explicitly
grant a selected subset to each Prospect organization. Catalog eligibility does
not grant access, and Prospects cannot self-assign data. Only Phaeno-owned,
de-identified sample data may enter the eligible catalog; Customer and Partner
operational data is excluded. Prospect users may view and download granted
sample data, and each download is tenant-authorized and audited.
Authorized Phaeno users may explicitly grant the same Phaeno-owned curated
packages to Customer or Partner organizations. Organization phase or kind never
grants package access automatically.
The first implementation uses the confirmed baseline curated-sample contract.
Development and automated tests use an explicitly synthetic Phaeno-created
fixture. It is not evidence of scientific validity and cannot be published,
marked externally eligible, or granted in production. Production begins with no
speculative approved scientific file kinds; Phaeno must explicitly configure
and approve actual kinds and profile rules before real data can become ready or
published.
Authorized organization users may download either an individual file or a
complete archive containing the manifest and every file in the exact immutable
package version. Both download modes are separately audited.
The same authorized Phaeno user may curate, approve, publish, and assign the
package; a separate approver is not required.
Package creation selects an existing Phaeno-owned sample and snapshots its
approved data into a curated draft. Source changes never mutate the snapshot;
Phaeno explicitly creates a new package version when needed.
Eligible source samples originate only from a dedicated internal Phaeno sample
workflow, separate from Customer lab-service work and Partner data-assembly
work. Customer or Partner operational data is never reused automatically. Any
future reuse requires a separately approved, explicit ownership-and-consent
process.
The first release includes a minimal Phaeno-only source-sample registry because
the current portal has no source-sample model or workflow. Authorized staff
register the sample, attach approved data, and record ownership and
de-identification evidence before curation. The registry is not a Customer lab
or Partner assembly workflow.
Approved files are uploaded directly into managed portal storage; external file
references/imports are deferred. Marking a complete source revision ready
validates all metadata, evidence, files, scans, and checksums atomically and
makes the revision immutable. Only an unreferenced draft may be discarded, with
destructive confirmation, a reason, and preserved audit history.
The source sample must already be marked de-identified. Curation validates and
records that evidence but does not perform de-identification.
Ownership evidence records the Phaeno ownership basis, confirming Phaeno user,
confirmation timestamp, and a non-sensitive evidence reference or notes. No
second approver is required.
The evidence records the authorized Phaeno user who confirmed de-identification,
the completion timestamp, the method or policy used, and optional non-sensitive
notes. It must not reproduce removed identifiers, and no second approver is
required.
A suspected de-identification failure or loss or uncertainty of Phaeno's
ownership or right to share requires immediate quarantine of every published
version derived from the affected source across all organizations. Quarantine
overrides all grants, blocks viewing and downloading, requires a reason, notifies
affected organization administrators, and preserves the package, files,
lineage, grants, and audit history for investigation. Earlier downloads cannot
be recalled.
The administrator notice identifies the high-level concern category, confirms
blocked access, and provides prior-download guidance. It does not expose
internal evidence, suspected identifiers, or investigation details.
While the investigation is open, affected organizations are instructed to stop
using or sharing prior downloads, isolate local copies, and await Phaeno's final
instructions. The interim notice does not require deletion before the final
disposition.
A confirmed unsafe or no-longer-shareable disposition requires one
administrator per affected organization to attest that local copies were
deleted and downstream recipients were notified. Phaeno records the attestation
and follow-up status but does not claim technical verification of deletion.
The affected version then becomes permanently `Withdrawn`. It can never regain
tenant access or receive new grants, remains preserved internally as evidence,
and any corrected content requires a new version.
Outstanding closeout attestations generate administrator reminders and remain
visible for Phaeno follow-up. They do not automatically deactivate the
organization or block unrelated packages or operational data; broader action
requires an explicit Phaeno decision.
Each confirmed-unsafe incident has a required attestation due date selected by
an authorized Phaeno user. Reminders and overdue status follow that date rather
than a universal product deadline.
An authorized Phaeno user may record an attestation received outside the portal.
It is marked `Recorded by Phaeno`, identifies the organization contact and
evidence source, and retains the Phaeno actor and timestamp without impersonating
an organization user.
An authorized Phaeno user may clear quarantine only after a documented
investigation confirms that the immutable version is safe and unchanged. The
clearance requires a reason and audit record. Any content correction requires a
new package version.
Quarantine suspends rather than revokes grants. Clearance automatically restores
still-active, non-revoked grants, never reactivates a grant revoked during the
investigation, and notifies administrators of organizations whose access
resumes.
Specifically authorized Phaeno investigators may view or download quarantined
contents after recording a purpose or reason. Every investigation access is
audited. Customer, Prospect, Partner, and ordinary Phaeno access remains blocked.
Supplemental data files or records cannot be added. Curators may add descriptive
presentation metadata that does not alter the sample-data snapshot.
Every published package includes a portal-visible summary with the sample
description, biological and assay context, analysis summary, QC status, and
provenance, plus a checksummed manifest and the complete downloadable source
snapshot. Dataset-specific metadata may extend this minimum set.
The initial portal shows the summary, scientific context, QC, provenance,
manifest, and file metadata but does not preview scientific file contents
in-browser. Generic or specialized scientific viewers are deferred.
Curated package publication accepts only file kinds on a Phaeno-approved
configurable list. Any unexpected, unsupported, or disallowed kind blocks
publication. Development/test fixture approvals never flow into production.
Publication is atomic. Any failed required metadata, file, checksum, scan,
schema, or policy check leaves the entire package version in draft for
correction and retry. No partial version becomes visible or grantable.

Phaeno defines a complete package for each sample in a curated area. A grant
provides access to all data in that curated package; per-file access is not
configured separately for each Prospect. The grant is frozen to one immutable
package version. New versions never roll out automatically; an authorized
Phaeno user must explicitly upgrade a Prospect's grant.
An explicit upgrade atomically makes the new version the organization's only
portal-viewable and downloadable version. The superseded version and its
grant/download history remain preserved internally, but organization users can
no longer access its files.
Curated contents remain read-only in the portal. Organizations may view and
download them but cannot edit, customize, or create package versions.

Revoking a curated package grant immediately stops portal viewing and
downloading for every user in the organization. Previously downloaded copies
cannot be recalled. Delivery must therefore remain revocable rather than depend
on long-lived signed URLs.

Organization deactivation suspends curated-data access without changing the
underlying grants. Reactivation restores every still-active, non-revoked grant;
revoked grants remain unavailable.
Curated sample-package grants do not expire automatically and remain active
until Phaeno explicitly revokes them.
Removing a package from the generally eligible catalog prevents new assignments
but leaves all existing organization grants unchanged.
At removal time, the authorized Phaeno user is offered a separate option to
revoke the package for all Customer, Prospect, and Partner organizations. That
choice shows the affected scope, requires confirmation, and blocks portal access
immediately.

A curated package is optional during Prospect creation. If none is selected,
the Phaeno user receives a non-blocking warning and explicitly continues. Users
may still be invited and see a clear no-data-assigned state until Phaeno grants
a package.
Prospect organization creation commits independently from optional package
grants. A failed grant leaves a valid organization with a visible idempotently
retryable failure and no access to that package; it never rolls back or
deactivates the organization or prevents invitations.

Curated sample packages are not permanently deleted through the normal
configuration interface. Retirement is distinct from catalog removal and grant
revocation. Retirement permanently prevents new grants while preserving all
existing grants, files, and access.
Retirement cannot be reversed; future availability requires a new package or
version.
Every published package version and its files are retained indefinitely,
including superseded and retired versions. Normal retention cleanup cannot
delete them. A future exceptional purge process is the only planned deletion
path; unpublished-draft cleanup remains a separate later decision.

Active organization administrators are notified when Phaeno grants, upgrades,
or revokes a curated package, and the event appears in portal activity. Ordinary
members are not emailed. Notification delivery does not control whether the
access change commits.

Organization administrators can view per-user curated package download history
for their own organization. Authorized Phaeno users can review history across
organizations. Audit records identify the user, package/version, and timestamp
without storing package contents.

The portal's standard terms govern curated sample viewing and downloading. The
initial workflow has no separate package-specific click-through agreement.

All active organization users can access Phaeno-owned curated Prospect packages
granted to their organization, including after conversion. Customer- or
Partner-owned operational data follows Customer/Partner access rules instead.
Authorization is based on data ownership/classification rather than changing
the access policy of preserved Prospect packages at conversion.
Customer and Partner organization administrators manage access to their own
operational data. Authorized Phaeno administrators may assist, and every access
change is audited.

## 2026-07-14: Customer and Partner service workflows are distinct

Status: confirmed by the Product Owner and implemented for the approved initial release.

Customers place lab service orders involving physical sample submission,
accessioning, laboratory analysis, data processing, and portal delivery of
resulting data. Customers track their samples through the portal. Partners place
reagent orders and submit data for Phaeno assembly, then retrieve completed
assembled data/results for availability to their own customers. These workflows remain
separate from seed-data provisioning.

## 2026-07-14: QuickBooks Online is the only commercial integration

Status: confirmed by the Product Owner and implemented behind an adapter.

Phaeno Portal owns laboratory, fulfillment, assembly, release, and operational
workflow. QuickBooks Online owns billable items, estimates, invoices,
adjustments, tax, freight, discounts, balances, terms, paid status, and hosted
payment links. There is no ERP or LIMS in the implemented system.

## 2026-07-14: Pricing and release depend on workflow and credit

Status: confirmed by the Product Owner and implemented.

Customer laboratory and Partner assembly work use immutable per-job quotes.
Partner reagents use organization-specific negotiated prices. Customer lab
credit and Partner assembly credit are separate audited settings: approved
credit uses Net 30 release, while absence of approved credit blocks downloads
until QuickBooks confirms payment. The configurable quote-validity default is
30 days.

## 2026-07-14: User help stays in the authenticated portal

Status: implemented.

The current help system uses portable MDX inside the TanStack portal rather than
a separate Astro application. Prospect, Customer, and Partner content is
locale-aware with `en-US` initially; Phaeno-only help may remain US English.
Search is deferred to a backend index that must filter results by authenticated
audience and locale. Browser-bundled help contains no confidential procedures.

## 2026-07-15: HubSpot is the relationship CRM and Portal access is an explicit handoff

Status: confirmed by the Product Owner for planning; not implemented.

HubSpot owns companies, relationship contacts, account ownership, Deals,
commercial qualification, and commercial outcomes. Most HubSpot companies never
receive Portal access. A Portal Prospect is an approved evaluation tenant, not
every HubSpot prospect. A buyer already approved to transact may be onboarded
directly as Customer or Partner.

Every ordinary onboarding request originates in HubSpot and becomes a pending
Portal review. Closed Won satisfies commercial approval but cannot directly
create access, invitations, service entitlements, relationship changes, or
deactivation. Phaeno reviews operational and access readiness before applying
the request. Portal-created users do not automatically become HubSpot contacts.

## 2026-07-15: Customer and Partner are exclusive types with service entitlements

Status: confirmed by the Product Owner for planning; not implemented.

An organization is Customer or Partner, not both simultaneously. The same
organization may change type at an explicit reviewed cutover while preserving
users, work, results, identifiers, and audit history. Partner services are
enabled independently. A Partner may be entitled to specimen processing,
reagent ordering, data assembly, or any approved subset.

Partner specimen work belongs to the Partner. Phaeno does not require, infer,
or synchronize the Partner's downstream-customer identity. Optional Partner PO
or project references are opaque Partner data.

## 2026-07-15: Standard work is sold directly and custom work is Sales-assisted

Status: confirmed by the Product Owner for planning; not implemented.

Eligible Customers and Partners may commit to standard configured-price work
directly in the Portal. Standard specimen processing and Partner data assembly
must show the complete configured price before commitment; Partner reagents use
active organization-specific negotiated pricing. Unsupported or negotiated
work creates a HubSpot custom-work request instead of an order.

Closed Won custom work creates a pending sales-assisted-order handoff for
operational validation. It does not silently create active work. Every committed
Portal sale is published to HubSpot as a relationship-safe Order summary, while
routine direct sales do not create Deals. QuickBooks remains authoritative for
financial facts, and scientific data never enters HubSpot.

## 2026-07-16: Commercial and Laboratory execution are separate, replaceable domains

Status: confirmed by the Product Owner and implemented for the approved
internal Lab Operations application scope. Validation and production
activation remain incomplete.

Commercial Operations owns the Customer order, authorization, quote, customer-
safe projection, files, payment, and publication. Laboratory owns work orders,
receipt/accession, physical lineage, controlled execution, materials and
equipment, libraries and batches, outsourced NGS sendouts/custody, exceptions,
and scientific approval in `lab_ops`. Accepted quote authorization and approved
cancellation cross the versioned provider boundary transactionally; durable
events update Commercial projections without exposing the Laboratory schema.

Ready for release is scientific readiness, not file publication. It creates no
file or download and does not bypass Commercial scanning, credit/payment, or
publication gates. The internal provider may later be replaced by a third-party
LIMS only through an approved, data-preserving, validated cutover. Pipeline and
scientific-file ownership remain deliberately unresolved.

## Open decisions

- Any exceptional curated-package purge process.
- Production storage, malware scanning, scientific file policies, analysis and
  assembly profiles, Partner shipping restrictions, QuickBooks/Postmark
  credentials, and sandbox validation.
- Production hosting, deployment, monitoring, backup/restore, and rollback
  workflow.
- Backend help-search implementation, ranking, locale fallback, and reindexing.
- Future LIMS selection only if an approved workflow later requires one.
- HubSpot account capabilities, field mapping, configured-price service rules,
  sandbox validation, and production activation remain in the owning plans.

Open items belong in the relevant `docs/plans/` document until resolved.
