# CRM Integration Strategy

## Status

This document is the approved durable boundary for a planned HubSpot
integration. HubSpot is the selected relationship CRM and planned integration
target. A non-production HubSpot developer project and private app shell now
exist for Phase 0 proof. The HubSpot Free account also contains the approved
ten-property Company, Contact, and Deal foundation recorded in the owning plan.
The Free account has reached its ten-custom-property limit, and the app still
has no CRM scopes, webhooks, runtime credentials, or Portal connection. Phaeno
Portal still has no running CRM integration today, and QuickBooks Online
remains the only implemented external business system.

Nothing below describes current Portal behavior or authorizes implementation.
`plans/HUBSPOT-PORTAL-LIFECYCLE-PLAN.md` owns the approved active workflow,
field-boundary, implementation, verification, and production-readiness plan.

## Purpose

Use HubSpot for generic sales and relationship capabilities rather than
recreating them in the Portal. Keep Portal development focused on Phaeno's
unique scientific and operational workflows, and keep Portal workflows
operational when HubSpot is unavailable.

## Guiding Principles

1. **Build domain-specific functionality.**
   - Scientific workflows
   - Sample lifecycle
   - Sequencing operations
   - Bioinformatics
   - Reporting
   - Customer project management
2. **Buy generic business functionality.**
   - CRM
   - Email tracking
   - Sales pipeline
   - Contact management
   - Marketing automation
3. **Keep systems loosely coupled.**
   - The Portal must continue functioning if the CRM is unavailable.
   - CRM synchronization must not be part of a Portal transaction's critical
     path.
   - CRM vendors should be replaceable without changes to the Portal's core
     scientific and operational domains.
4. **Share only the minimum necessary data.**
   - Send relationship records and operational summaries to the CRM.
   - Keep scientific, laboratory, and regulated data in the Portal and approved
     scientific storage.

## Approved Future Responsibilities

Some named integration and Portal concepts are not implemented and must not be
inferred as current product capabilities.

### Phaeno Portal (Operational System of Record)

The Portal owns:

- Organizations and customer accounts
- Projects
- Samples
- Kits
- Shipments
- Sequencing runs
- Laboratory requests
- Analyses
- Reports
- Customer operational activity
- Billing events

The Portal remains the authoritative platform for Phaeno's scientific and
operational workflows.

### HubSpot (Relationship System)

HubSpot owns:

- Companies
- Relationship contacts
- Sales opportunities
- Meeting history
- Notes
- Follow-up tasks
- Email history
- Sales pipeline
- Investor relationships
- Partner relationships

## Integration Architecture

```text
                       HubSpot
                  (Relationships)
                         ▲
                         │ REST API / Webhooks
                         │
               CRM Integration Service
                         ▲
                         │
                  Phaeno Portal
             (Scientific Operations)
                         │
             Possible future LIMS
```

The Portal orchestrates exchanges with the CRM through an integration boundary.
Vendor-specific API clients, webhook validation, field mapping, retry behavior,
and synchronization state remain behind that boundary. A CRM outage or delayed
synchronization must not prevent users from completing Portal workflows.

## Synchronization Goals

### Organization Linking And Onboarding

Most HubSpot companies never receive Portal access. Ordinary onboarding starts
with an explicit HubSpot request and becomes a pending Portal review; a stage
change never directly grants access.

- Link one HubSpot Company to one stable Portal organization.
- Create a Portal Prospect only for an approved evaluation tenant.
- Create an approved direct buyer as a Customer or Partner without forcing it
  through Portal Prospect.
- Require an explicitly designated primary Portal administrator rather than
  inviting the HubSpot Deal contact automatically.
- Store exact HubSpot external identifiers in the Portal.
- Make synchronization idempotent so retries do not create duplicate
  organizations, invitations, entitlements, or requests.

### Contact Synchronization

Synchronize the relationship fields needed by both systems:

- Name
- Email
- Phone
- Title or role
- Organization association

The Portal remains authoritative for access, membership, and operational
contact information. HubSpot remains authoritative for sales activity and
relationship context. Portal-created members do not automatically become
HubSpot contacts. Any additional bidirectional field synchronization must
define a field-level owner and conflict rule before implementation.

### Organization And Sales Summaries

The Portal may publish non-scientific organization and committed-sale summaries
to HubSpot, including:

- Organization type and enabled services
- Number of open orders or projects
- Most recent committed sale and result-delivery dates
- HubSpot Order amount, currency, and high-level status
- HubSpot Order current expected completion date and schedule health
- High-level QuickBooks invoice and payment status
- Customer- or Partner-since date
- Organization status
- Last operational activity date

These summaries allow the commercial team to understand account activity
without exposing raw scientific data.

### CRM Lookup from the Portal

An internal organization workspace may display read-only HubSpot context such
as:

- A deep link to the CRM company record
- Account owner
- Last commercial activity
- Current opportunity stage

Commercial data is edited in the CRM, not duplicated as editable Portal data.
Customer-facing users must not receive internal CRM notes, opportunities, or
sales activity.

### CRM-Originated Changes

CRM webhooks may notify the integration service about relevant company or
contact changes. Webhook processing must authenticate the sender, tolerate
duplicate and out-of-order delivery, and enqueue retryable work rather than
coupling CRM availability to Portal requests.

## Data Ownership

| Data | System of record | Integration behavior |
| --- | --- | --- |
| Organizations | Portal | Publish identity and status to CRM |
| Organization type, status, and services | Portal | Publish summary to HubSpot |
| Operational contacts and access | Portal | Publish approved relationship fields |
| Relationship contacts | CRM | Read or link when operationally useful |
| Projects | Portal | Publish aggregate counts or status only |
| Samples | Portal | Publish aggregate counts only |
| Reports | Portal | Publish dates or aggregate counts only |
| Opportunities | CRM | Read-only summary in internal Portal views |
| Meeting notes | CRM | Link or show approved read-only metadata only |
| Tasks | CRM | Keep in CRM |
| Emails | CRM | Keep in CRM |

External CRM identifiers are integration metadata, not business identifiers.
Portal entities must retain their own stable identifiers and remain usable if
the CRM record is missing, merged, or replaced.

## Scientific Data Excluded from the CRM

The following data must remain exclusively within the Portal and approved
scientific storage unless a separately approved future boundary says otherwise:

- Sequencing data
- FASTQ files
- BAM files
- Transcript assemblies
- QC metrics and results
- Bioinformatics inputs and outputs
- Laboratory protocols and workflow details
- Scientific report contents
- Raw instrument data
- Sample-level scientific metadata
- Patient, subject, or other protected health information

Only approved operational summaries may cross the CRM integration boundary.

## Future Internal Organization Workspace

The Portal may provide a unified internal organization workspace with sections
for:

- Organization
- Contacts
- Active projects
- Samples
- Reports
- Billing
- Support
- CRM summary

This creates a relationship and operations view without reproducing HubSpot
workflows. Portal data supplies the scientific and operational view; HubSpot
supplies limited commercial context.

## Phased Implementation Plan

### Phase 1: Organization Linking And Pending Onboarding

- Configure HubSpot authentication and secrets outside source control.
- Implement the CRM provider boundary and HubSpot adapter.
- Ingest explicit evaluation and Closed Won onboarding requests.
- Store HubSpot Company, Contact, and Deal identifiers.
- Add pending Phaeno review, designated-administrator invitation, internal deep
  links, idempotency, retry, audit, and reconciliation support.

### Phase 2: Commercial Context And Committed Sales

- Publish every committed Portal sale as an associated HubSpot Order without
  creating routine Deals.
- Publish approved organization, service, operational, and high-level
  QuickBooks payment summaries.
- Display the HubSpot account owner and read-only commercial summary in
  internal Portal views.
- Process relevant HubSpot webhooks and monitor failed or stale synchronization.

### Phase 3: Account Lifecycle And Operational Hardening

- Add custom-work and account-change requests, sales-assisted-order handoff,
  service changes, Customer/Partner relationship changes, and offboarding.
- Add dashboards, digests, exception alerts, reconciliation, and runbooks.
- Keep HubSpot-specific field mapping isolated so Portal domains do not depend
  on HubSpot models. Do not implement another provider without a proven need.

## Provider Abstraction

Portal features should depend on a provider-neutral contract rather than the
HubSpot SDK or HubSpot-specific models. An illustrative interface is:

```csharp
public interface ICrmProvider
{
    Task<CrmCompany?> GetCompanyAsync(
        string externalCompanyId,
        CancellationToken cancellationToken);

    Task<CrmContact?> GetContactAsync(
        string externalContactId,
        CancellationToken cancellationToken);

    Task<CrmDeal?> GetDealAsync(
        string externalDealId,
        CancellationToken cancellationToken);

    Task PublishOrganizationSummaryAsync(
        string externalCompanyId,
        CrmOrganizationSummary summary,
        CancellationToken cancellationToken);

    Task<CrmSale> UpsertCommittedSaleAsync(
        CrmCommittedSale sale,
        CancellationToken cancellationToken);

    Task PublishIntegrationRequestStatusAsync(
        CrmIntegrationRequestStatus status,
        CancellationToken cancellationToken);
}
```

The application contract should use provider-neutral models. The HubSpot
adapter translates those models to Companies, Contacts, Deals, Orders, Line
Items, properties, associations, and API behavior.

## Architectural Rule

> **HubSpot owns commercial relationships and pipeline. Phaeno Portal owns
> tenant access, service readiness, scientific and operational workflows, and
> committed operational records. QuickBooks Online owns the approved financial
> facts. No system may silently grant access or overwrite another system's
> authority.**

The Portal must not become a CRM by accident, and HubSpot must not become a
scientific or authorization system. The integration remains unimplemented until
the owning plan is explicitly authorized and verified.
