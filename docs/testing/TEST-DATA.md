# Acceptance prerequisites and reusable test data

Use the [run record](RUN-RECORD.md) to capture the actual prepared identifiers. The tester must not invent scientific acceptance criteria, provider receipt facts, production billing terms, or an administrator identity.

## Environment owner preparation

- Record an isolated test Portal/API deployment, separate Website deployment when tested, test database, test private storage/scanner, and approved mail sink or tester-controlled recipients. Start with an empty run namespace `UAT-<date>-<run>`.
- Confirm schema/configuration match the application revision. Preparing fixtures does not authorize applying a shared migration, changing authentication, starting production workers or submitting real purchases.
- Use supported administration and workflow actions to prepare records. Where a scenario needs an otherwise unreachable clock, provider failure, or historical state, engineering supplies an isolated fixture and records how it was prepared. Do not manually rewrite immutable commercial or scientific records.
- Keep synthetic/mock evidence labeled. Offerings/analyses/profiles explicitly marked synthetic are excluded from purchasing: keep one as a negative fixture. Positive purchases require a properly reviewed eligible configuration in the isolated environment; do not toggle synthetic flags merely to bypass a gate.
- Record storage/scanner mode, mail sender mode, retention processing/enforcement/deletion flags, Kit lifecycle flag, operational attention queue availability, and backup/restore capability separately. Missing capability blocks its dependent step.

## People and scope

These are responsibilities, not invented role-picker labels. The platform administrator records each account's effective capabilities and uses supported role assignment. Do not use one all-powerful account as proof of separation of duties.

| Alias | Required identity/capability |
| --- | --- |
| P-ADMIN | Phaeno platform administrator; isolated setup and restricted CRM/access actions |
| P-SALES | Ordinary Phaeno commercial user without platform administration |
| P-PRICE | Authorized order-pricing operator; separate proposal reviewer where dual control applies |
| P-TRIAL-C / P-TRIAL-S | Different people assigned Commercial / Scientific Operations Trial approval authority |
| P-PROTOCOL-A / P-PROTOCOL-B | Different Protocol Administrators for authorship and independent approval |
| P-LAB / P-SUP | Lab operator / supervisor, including the specific controlled step roles used |
| P-REVIEW | Scientific Reviewer who did none of the tested receipt, accession, execution, QC, library, batch or sendout work |
| P-RELEASE | Authorized Result Release Manager, respecting enforced separation from scientific approval |
| P-FILE | Authorized file/provisioning administrator; platform authority for retention policy/holds |
| P-BILL / P-CASH / P-RECON | Billing, Cash Operator, independent Cash Reconciler with no contributing activity |
| C-ADMIN / C-DEPT / C-MEMBER | Customer A organization admin / Research-only Department admin / Research member |
| C-OTHER | Customer B member with no Customer A access |
| R-ADMIN / R-DEPT / R-MEMBER | Prospect organization admin / Department admin / member |
| K-ADMIN / K-DEPT / K-MEMBER | Partner organization admin / Research Department admin / member |
| INVITED / WRONG-EMAIL | Controlled pending invite recipient and a different controlled sign-in account |

Prepare active Customer A, Customer B, Partner and Prospect Companies. Each operational organization has General plus Research and Operations Departments. Give Department-limited identities no Operations access. Use separate sessions for separate organizations; no self-service organization switcher is assumed. Include one inactive member, one revoked invite, and one expired invite as negative fixtures. Invite delivery requires the test sender or approved controlled inbox.

## Reusable business records

| Alias | Fixture and expected use |
| --- | --- |
| COMPANY-NEW | CRM-only Company without Portal tenant/access, entitlement, user or order |
| COMPANY-DUP | Two disposable CRM-only duplicate candidates for reviewed merge; no real customer history |
| OPPORTUNITY | Active Opportunity linked to Prospect for a Trial request; separate Customer Won Opportunity for Sales handoff |
| LAB-MANUAL | Customer Job: two samples, one approved biological source group of count two; manual pricing |
| LAB-STANDARD | Same count/source composition with eligible versioned standard offering; complete approved billing/tax |
| SAMPLE-A / SAMPLE-B | Coded IDs `UAT-<run>-A` and `UAT-<run>-B`; tube counts one and two, giving three tube slots |
| KIT-ORDER | Two whole units of one eligible negotiated Kit offering, active shipping address and test PO; two included cases |
| LEGACY-ASSEMBLY | Genuine isolated historical standalone request with its own saved quote/billing terms; no inferred Kit link |
| TRIAL-MAIN | Original allowance two, open submission window, extracted-RNA type, approved analyses/workflow/deliverables and material terms |
| TRIAL-VARIANTS | Separate draft/held/expired-window/closed Trials, plus authorized replacement fixture |
| CURATED | Owned/de-identified test source with clean dummy files, source revisions 1 and 2, published versions 1 and 2 |
| RELEASE-A/B | Two disposable approved operational packages, each with at least two clean files and known checksums; one left incomplete at cutoff |

## Scientific and shipping setup

The Lab owner supplies approved test-only operating definitions with known valid values/units and deliberately invalid alternatives. Capture exact analysis, protocol, workflow, output-role and profile versions. Provide a required numeric capture, a choice capture, an optional/conditional step, an explicit confirmation, a repeatable step, a role-restricted step and Pass/Fail/Hold QC. Record the acceptance criteria; passing software validation does not establish scientific validity.

Provide approved test destination/sample-type/instruction revisions, registered unused supplier tubes, a packet/return-kit fixture, a second shipment for wrong-tube checks, a qualified material lot, failed/expired lot variants, calibrated/overdue equipment, and approved final-output fixtures matching the frozen output contract. Physical execution needs approved tubes, packout, printer/scanner, custody procedures and an accountable operator.

## Financial arithmetic fixtures

Only in the isolated environment, use USD unit price 100.00 × two specimens with an approved **test** 10% rate and no other charges: subtotal 200.00, tax 20.00, total 220.00. These numbers test arithmetic; they are not real tax or pricing guidance. Preserve the configured actual terms/rounding rules in the record. For a pre-tax variant, expect 200.00 explicitly labeled pre-tax before billing approval.

Prepare a 220.00 invoice and 250.00 receipt for allocation: allocate 100.00 then 120.00 → invoice outstanding 0.00, receipt unapplied 30.00. Reverse the 120.00 allocation → invoice outstanding 120.00, receipt unapplied 150.00. Use separate invoices for credit/debit/write-off variants to avoid contaminating reconciliation fixtures.

## Files, imports, and failure variants

- Download the actual sample CSV template. Its exact headers are `customer_sample_id,biological_source,tube_count`; use the permitted source value from the form. Prepare valid two-row data, duplicate ID, wrong source composition, zero/fractional tube count, missing header, and extra barcode-column variants. Use no PHI, even in rejection tests.
- CRM import templates/columns are documented in [CRM administration help](../../frontend/src/content/docs/phaeno/crm-reports-administration.mdx). Prepare one valid, one duplicate and one invalid row for atomic-preview testing.
- Receipt import headers are `source,external_id,date,amount,currency,payer,reference,memo`. Use the parser's supported date format, unique test external IDs and one controlled source. Preserve the original file identity for duplicate/retry testing.
- Use approved-format harmless files with recorded sizes/checksums. Include over-limit and unsupported-format variants. Engineering supplies controlled scanner rejection/unavailability outcomes; do not upload malware or confidential data.
- Engineering prepares bounded request-failure, delayed-response, stale-version, storage interruption and disposable clock/deadline fixtures. Record whether interception or the real provider produced each failure. Restore those settings after each case.
