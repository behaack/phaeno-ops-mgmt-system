# Happy-path UI/UX testing

One successful journey per script. Use these manual walkthroughs to judge whether the Portal is understandable and comfortable to use from beginning to end. Prepared September 15, 2026 against the current repository and audience guides.

## Start here

1. Record your environment, release, browser and testers in a copy of [RESULTS.md](RESULTS.md). Every script starts **Not run**.
2. Use designated test accounts and records. Prefix new names with `HP-YYYYMMDD-initials`. Keep existing UAT records intact; carry the same Job, sample, shipment and package references through each handoff.
3. Have an administrator prepare the roles, active services, approved pricing/billing, shipping configuration and test recipients required below. Use separate browser profiles for different people. Complete passwords and authenticator steps privately; an authenticator requires its current code.
4. Have the laboratory owner provide the approved test procedure, valid scientific values, physical materials and known-good files. Record physical events when performed. Label a simulated event as simulated in your results.
5. Follow each table in order. At a role handoff, open the saved record as the named person. Record the visible result and any confusing wording or unnecessary effort.

These are new UI/UX walkthroughs. Their results stay separate from the [full acceptance pack](../README.md) and its 81-case ledger. This pack has no variants, exception exercises or edge-case tests. No workflows were executed when these documents were created.

## Scripts

| ID | Workflow | Successful finish |
| --- | --- | --- |
| [HP-01](01-COMPLETE-website-inquiry.md) | Public discovery and technical-brief request | Visitor receives and opens the requested brief |
| [HP-02](02-crm-lead-to-opportunity.md) | Lead to Company, Contact and Opportunity | Won Opportunity with completed follow-up |
| [HP-03](03-customer-onboarding.md) | Customer access and first sign-in | Invited administrator reaches the correct Customer workspace |
| [HP-04](04-department-and-member.md) | Department and member access | Member can work in the intended Department |
| [HP-05](05-laboratory-configuration.md) | Protocol, workflow and tray setup | Independently approved workflow is available for preparation |
| [HP-06](06-lab-job-and-quote.md) | Lab request, manual quote and sample roster | Accepted Job with finalized samples |
| [HP-07](07-transportation-kit-supply.md) | Transportation-kit supply | Registered kit delivered and acknowledged |
| [HP-08](08-pack-and-send-samples.md) | Pack and send samples | Correct tubes, insert and tracking on the sent shipment |
| [HP-09](09-receipt-and-accession.md) | Laboratory receipt and accession | All expected tubes accepted and stored |
| [HP-10](10-library-preparation.md) | Library preparation | Completed preparation with confirmed, QC-passed libraries |
| [HP-11](11-sequencing.md) | Sequencing and provider custody | Completed sequencing batch and recorded custody |
| [HP-12](12-results-and-job-completion.md) | Scientific review, delivery and Job completion | Customer downloads results; completed Job has its invoice |
| [HP-13](13-payment-and-reconciliation.md) | Payment and reconciliation | Paid invoice and independently approved closeout |
| [HP-14](14-trial-project.md) | Prospect Trial | Approved evaluation reaches complete result delivery |
| [HP-15](15-partner-kit-order.md) | Partner PSeq Kit purchase and fulfillment | Purchased Kit shipped with its included Assembly case |
| [HP-16](16-included-assembly.md) | Included Assembly | Partner downloads approved outputs |
| [HP-17](17-curated-data.md) | Curated publication and access | Department member downloads the granted package version |
| [HP-18](18-help-and-resume.md) | Find help and resume work | Customer finds an answer and returns to the same Job |

## Connected run order

**Customer order to cash:** HP-02 → HP-03 → HP-04 → HP-06 → HP-07 → HP-08 → HP-09 → HP-10 → HP-11 → HP-12 → HP-13. Complete HP-05 before HP-06 so the Job uses the approved workflow. Use HP-18 while that Job is open.

**Prospect evaluation:** HP-14 contains the Trial-specific start and finish and explicitly calls the shared Lab scripts. Use a separate Prospect and Trial record.

**Partner delivery:** HP-15 → HP-16, using the same order and included case.

**Independent journeys:** HP-01 and HP-17. A Website inquiry does not automatically become the CRM Lead used in HP-02.

## Simple fixtures

| Journey | Prepared data |
| --- | --- |
| Customer | One Customer, Research Department, administrator and member; approved billing/tax and Ready Lab-service access |
| Lab Job | Two coded samples from one approved biological source; SAMPLE-A has one tube, SAMPLE-B has two; three tubes total |
| Shipping | One eligible transportation-kit size with capacity for all three tubes; one saved Department delivery location; one receiving destination |
| Laboratory | Approved preparation workflow/tray with room for three tubes, confirmed tube-use instructions, valid materials/equipment and one sequencing provider |
| Results | One complete, checksummed, clean final package for each sample, prepared by the upstream scientific owner |
| Finance | One full-payment test receipt matching the final invoice and one matching bank-total fixture |
| Trial | Separate Prospect administrator, approved extracted-RNA scope, two samples with one tube each, prepared Trial shipping kit |
| Partner | Separate Partner administrator/member, an offering permitting one purchased Kit, frozen Assembly profile and approved Assembly credit |
| Curated data | Phaeno-owned, de-identified source evidence and approved files; an eligible Customer Research Department |

The scripts use a manual quote for the Customer journey and approved Assembly credit for the Partner journey. These choices keep each journey on one route. Use the fixture's approved prices, tax, scientific values and dates rather than inventing them during the walkthrough.

## What to notice

At the end of each script, record:

- Was the next action and its responsible person clear?
- Did names, counts, totals and status mean what you expected?
- Could you find the record again and continue without remembering hidden context?

Record the step number, what you expected, what appeared and a suggested improvement. A screenshot is helpful when it contains no credentials or confidential data. Use **Pass**, **Needs attention**, **Blocked** or **Not run**. A successful screen interaction alone does not establish physical or scientific acceptance.
