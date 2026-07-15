# CRM Integration Strategy

## Status

This document is an unapproved reference for evaluating a possible future CRM
boundary. Phaeno Portal has no CRM integration today, no CRM product has been
selected, and HubSpot is not an approved dependency or implementation target.
QuickBooks Online is the only implemented external business system.

Nothing below describes current Portal behavior or authorizes implementation.
Before any CRM work begins, product discovery must establish the relationship
workflow, minimum data exchange, ownership rules, cost, privacy constraints,
and measurable need. An approved plan must replace or explicitly adopt the
relevant parts of this reference.

## Purpose

If Phaeno later needs a Customer Relationship Management (CRM) system, prefer
evaluating a specialized product over recreating generic sales and marketing
capabilities in the Portal. HubSpot is one candidate used to make this reference
concrete, not a selected provider.

Any future approach should keep Portal development focused on Phaeno's unique
scientific and operational workflows and leave current Portal workflows
independent of a CRM.

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

## Hypothetical Future Responsibilities

The responsibilities in this section are a design hypothesis for a future
discovery process. Some named Portal concepts are not implemented and must not
be inferred as current product capabilities.

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

### Possible CRM (Relationship System)

Candidate products could include HubSpot, Odoo CRM, Salesforce, or Microsoft
Dynamics. No candidate is currently preferred or selected.

The CRM owns:

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
                    Candidate CRM
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

### Customer Synchronization

When a customer organization is created in the Portal:

- Create or match the corresponding CRM company.
- Create or match the primary contact when one is present.
- Store the CRM provider and external company identifier in the Portal.
- Make synchronization idempotent so retries do not create duplicates.

### Contact Synchronization

Synchronize the relationship fields needed by both systems:

- Name
- Email
- Phone
- Title or role
- Organization association

The Portal remains authoritative for access, membership, and operational contact
information. The CRM remains authoritative for sales activity and relationship
context. Any bidirectional field synchronization must define a field-level
owner and conflict rule before implementation.

### Customer Activity Summaries

The Portal may publish non-scientific customer summaries to the CRM, including:

- Number of active projects
- Total samples received
- Number of active sequencing runs
- Most recent report date
- Customer-since date
- Customer status
- Last operational activity date

These summaries allow the commercial team to understand account activity
without exposing raw scientific data.

### CRM Lookup from the Portal

An internal customer workspace may display read-only CRM context such as:

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
| Customer status | Portal | Publish summary to CRM |
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

## Future Customer Workspace

The Portal may provide a unified internal customer workspace with sections for:

- Organization
- Contacts
- Active projects
- Samples
- Reports
- Billing
- Support
- CRM summary

This creates a Customer 360 view without reproducing CRM workflows. Portal data
supplies the scientific and operational view; the CRM supplies limited
commercial context.

## Phased Implementation Plan

### Phase 1: Foundational Provider Integration

- Select a provider only after an approved product and data-ownership decision.
- Configure provider authentication and secrets outside source control.
- Implement the CRM provider boundary and selected-provider adapter.
- Synchronize approved Portal organization facts to provider companies.
- Synchronize approved primary-contact fields.
- Store the CRM provider and external company identifier.
- Add an internal deep link to the provider company record.
- Add idempotency, retry, audit, and reconciliation support.

### Phase 2: Commercial Context and Customer Summaries

- Publish approved customer activity summaries.
- Display the CRM account owner in internal Portal views.
- Display a read-only opportunity-stage summary.
- Display approved recent commercial activity metadata.
- Process relevant HubSpot webhooks.
- Add operational monitoring for failed or stale synchronization.

### Phase 3: Provider Portability

- Extract configuration and field mappings that remain HubSpot-specific.
- Validate the provider abstraction against a second adapter or contract test
  double.
- Support replacing the configured CRM provider without changing Portal domain
  workflows.
- Add provider-neutral reconciliation and migration tooling if a vendor change
  is planned.

Provider portability does not require implementing multiple CRM integrations in
advance. The abstraction should isolate the initial HubSpot integration while
remaining no broader than proven Portal requirements.

## Provider Abstraction

Portal features should depend on a provider-neutral contract rather than the
HubSpot SDK or HubSpot-specific models. An illustrative interface is:

```csharp
public interface ICrmProvider
{
    Task<CrmCompany> CreateCompanyAsync(
        CrmCompanyDraft company,
        CancellationToken cancellationToken);

    Task<CrmCompany> UpdateCompanyAsync(
        string externalCompanyId,
        CrmCompanyUpdate company,
        CancellationToken cancellationToken);

    Task<CrmCompany?> GetCompanyAsync(
        string externalCompanyId,
        CancellationToken cancellationToken);

    Task<CrmContact> CreateContactAsync(
        CrmContactDraft contact,
        CancellationToken cancellationToken);

    Task<CrmContact> UpdateContactAsync(
        string externalContactId,
        CrmContactUpdate contact,
        CancellationToken cancellationToken);

    Task<CrmOpportunitySummary?> GetOpportunitySummaryAsync(
        string externalCompanyId,
        CancellationToken cancellationToken);
}
```

The application contract should use provider-neutral models. A selected-provider
adapter would translate those models to provider objects, properties,
associations, and API behavior.

## Architectural Rule

> **The Phaeno Portal owns scientific and operational workflows. Generic
> business capabilities may be integrated from specialized third-party systems
> only after the product need and ownership boundary are approved. QuickBooks
> Online is the only such system in the current architecture.**

The Portal must not become a CRM by accident. Its responsibility is to manage
the implemented scientific and operational lifecycle of Customer and Partner
work. Commercial relationship management is not currently represented by an
external CRM platform.
