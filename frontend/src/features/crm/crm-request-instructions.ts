const orderSettings = 'A Phaeno platform administrator handles this shared setup. Open the user menu → Order settings.'
const shippingSettings = 'A Phaeno platform administrator handles this shared setup. Open the user menu → Samples & shipping.'
const billingSettings = 'Finance handles this Company’s billing setup. Open Order operations → Finance → Customer billing, open this Company, and select Edit billing and tax.'
const saveBilling = 'Complete the other required billing and tax fields in the same form, then select Save changes. Saving any billing or tax change requires a fresh Finance approval.'

const instructions: Record<string, string[]> = {
  'readiness-ActivePSeqOfferingRequired': [
    orderSettings + ' Select Service catalog.',
    'Open the approved PSeq Lab Service item by selecting its name, then select Edit item. Its required reference and Per sample-sequencing run sales unit are supplied automatically. If it is missing, select Add item in Service catalog and choose Item type: PSeq Lab Service; a different item with a similar name will not satisfy this check.',
    'Review Name, Base price, and Currency against the approved offering. Set Status to Active, then select Save item.',
    'This requirement clears when that catalog item is active with the sample-sequencing run sales unit. This is shared catalog setup; Company service permission is a separate item in this checklist.',
  ],
  'readiness-OrderConfigurationIncomplete': [
    orderSettings + ' Select Quote & workflow → Edit settings.',
    'Enter the approved Default quote validity (days), from 1 to 365. Review Sample workflow: Exact sample roster. Customers will finalize their specimen roster before preparing a shipment.',
    'Select Save changes. If earlier workflow settings are present, saving applies the supported sample and result workflows shown in the dialog.',
    'This requirement clears when quote validity is configured and the supported sample workflow is saved. These defaults apply across Companies.',
  ],
  'readiness-SampleConfigurationIncomplete': [
    shippingSettings + ' Select Sample types. Open the appropriate material definition; use Create revision to update it, or Add sample type if no approved definition exists.',
    'Enter the approved material class, quantity unit and limits, primary-container and preservation requirements, customer labeling, prohibited identifiers, and safety requirements. Obtain the scientific and operational requirements from the responsible team.',
    'Set Effective from to the approved start date. After review, select Active for packet resolution and save with Add sample type or Create revision.',
    'This requirement clears when at least one sample type is active and currently effective. An inactive or future-dated definition does not clear it; each later shipment still checks its own samples.',
  ],
  'readiness-ShippingConfigurationIncomplete': [
    shippingSettings + ' Select Ship-to destinations. Review an existing destination or use Add destination. Use Create revision for changes.',
    'Complete the approved receiving address, hours, time zone, and delivery instructions. Set the approved Effective from date, select Active for packet resolution after review, and save the destination.',
    'Select Shipping assignments. Use Add assignment, or Actions then Create revision on an existing assignment. Choose the exact Destination revision and the named Sample type. The sample type automatically follows its latest active, effective revision; the form shows the revision currently in use.',
    'Select an approved shared Shipping procedure, enter the compatibility group and add only destination-specific exceptions. Maintain each sample/container combination\'s packing and temperature-control instructions under Container sizes. Set the approved Effective from date, select Active for packet resolution after review, then save.',
    'This requirement clears when the rule and destination revision are active and currently effective, and the selected sample type has an active, currently effective revision. New sample-type revisions are followed automatically. A replacement destination still needs a rule linked to that destination revision.',
  ],
  'readiness-ResultDestinationIncomplete': [
    orderSettings + ' Select Quote & workflow → Edit settings.',
    'Review Result destination: Governed Portal delivery. Scientifically approved result files will be released through the Portal with download and retention tracking.',
    'Review the other settings and select Save changes to apply this supported result workflow. This requirement clears when the workflow is saved; no customer email address or file-storage path is entered here.',
  ],
  'readiness-SubmissionInstructionsIncomplete': [
    shippingSettings + ' Select Order submission guidance → Edit instructions.',
    'Enter the approved general guidance a customer should follow before submitting samples, including preparation and the next shipping step. Use instructions agreed with the laboratory; detailed destination-specific packing rules belong in Shipping assignments.',
    'Select Save changes. This requirement clears when non-empty default instructions are saved. New orders use this guidance when no customer-specific instructions are configured; existing orders keep their saved instructions.',
  ],
  'readiness-BillingContactIncomplete': [
    billingSettings,
    'Enter Billing contact name and a valid Billing contact email for the person or team that should receive billing correspondence. A CRM contact or invited Portal user does not automatically fill these fields.',
    saveBilling,
    'This requirement clears when both billing contact fields are saved. Finance tax approval is tracked separately below.',
  ],
  'readiness-BillingAddressIncomplete': [
    billingSettings,
    'Enter the invoice address: Address line 1, City, State or region, Postal code, and the two-letter Country code (for example, US). Address line 2 is optional. Use the billing address confirmed by the Company, which may differ from its shipping address.',
    saveBilling,
    'This requirement clears when the billing address has been saved in the Company’s billing profile.',
  ],
  'readiness-PaymentTermsIncomplete': [
    billingSettings,
    'Enter the agreed Payment terms (days) as a whole number from 0 to 365. For example, use 30 only if 30-day terms have been agreed. Finance supplies the commercial decision.',
    saveBilling,
    'This requirement clears when valid payment terms are saved in the Company’s billing profile.',
  ],
  'readiness-TaxDecisionIncomplete': [
    billingSettings,
    'Choose the Tax decision confirmed by Finance: Taxable, Exempt, or Non-taxable. For Taxable, enter Approved tax rate (%). For Exempt, enter Exemption evidence. Do not use the default selection as a substitute for a Finance decision.',
    saveBilling,
    'This requirement clears when the decision and its required rate or evidence are saved. A Finance reviewer must then complete Finance tax approval as a separate step.',
  ],
  'readiness-FinanceTaxApprovalRequired': [
    billingSettings,
    'Review the saved billing contact, invoice address, payment terms, and tax decision, including the rate or exemption evidence when applicable. Save any corrections before approving.',
    'In Finance approval notes, record the basis for the review. Select Approve current tax decision. This approves the currently saved version of the billing profile.',
    'Confirm Finance approved is shown. This requirement clears after approval; any subsequent billing or tax edit requires another approval.',
  ],
  'readiness-ActiveCustomerAdministratorRequired': [
    'Open this Company → People and find the intended administrator. If the person already has accepted Portal access, use their Actions → Manage access to review their existing role.',
    'An organization administrator qualifies across the Company. A department administrator qualifies for their assigned active department; verify that it is the department needing readiness. Organization-wide access is optional.',
    'If access has not been accepted, invite the intended person with the approved administrator role and have them follow the invitation link to sign in and accept. Sending or resending an invitation alone does not complete this requirement.',
    'This requirement clears when an eligible administrator has active, accepted access. Phaeno staff handle Company-wide setup where there is no organization administrator.',
  ],
  'readiness-PSeqServiceEntitlementNotReady': [
    'Open this Company → Services → Entitlements. Find the PSeq Lab Service permission for the required department or the Company default.',
    'Review the approved scope and effective dates. Edit the permission, set Service configuration to Ready when setup is complete, and save. If no permission exists, follow the Enable PSeq Lab Service instructions in this checklist to add one and link it to this request.',
    'This requirement clears when the service permission is currently usable for the relevant active department. Pending, Blocked, expired, or future-dated permissions do not provide current service access.',
  ],
  'readiness-ActiveCustomerRelationshipRequired': [
    'Open this Company and review its current relationship and Portal access status. Check that the approved relationship change has actually been applied; approving a request alone does not change the relationship.',
    'Use the approved relationship request to apply the Customer relationship, and have authorized Phaeno staff restore Company access if it is inactive.',
    'Return to Work needed. This requirement clears once the saved operational relationship is active and eligible for Customer ordering.',
  ],
  'readiness-ManualBlock': [
    'Read the block reason shown above and open this Company → Services to review its operational readiness.',
    'Work with the responsible Phaeno team to resolve the stated issue. An authorized staff member must clear the manual block after the issue is resolved.',
    'Return to Work needed to verify the block has cleared. Other setup steps do not remove a manual operational block.',
  ],
  'company-access': [
    'Review the access status and the next action shown above. Open this request’s Actions menu to continue the approved Company setup.',
    'If Complete access enablement is offered, use it to attach the approved Portal access to this Company. If access is already linked but inactive, open the Company workspace and have authorized Phaeno staff reactivate it.',
    'Return to Work needed and confirm this step shows Done. Creating the CRM Company alone does not enable Portal access; inviting administrators and enabling services are separate steps.',
  ],
  'disable-access': [
    'First complete the active-work, billing, files, and retention reviews above with the responsible teams.',
    'Open this Company and use its authorized deactivation action. Review the confirmation for the affected Company before proceeding.',
    'Return to Work needed and verify Company Portal access is inactive. Historical records remain available for their controlled workflows; record the review outcomes in completion notes.',
  ],
  'trial-outcome': [
    'Open Actions → Open Trial and read the recorded outcome and its reason.',
    'Confirm with the responsible team whether the requested Trial work is finished or will not proceed. Resolve any remaining obligations in the Trial workspace.',
    'Return to this request and use the appropriate available completion or cancellation action, recording the agreed outcome. An unsuccessful Trial is not treated as accepted scope.',
  ],
  'relationship': [
    'Open the Company and review the current relationship, this request’s approved target relationship, and the linked Opportunity when present.',
    'Return to this request and open Actions. Select the Apply relationship action named for the approved target, review the confirmation, and submit it.',
    'That action applies the supported relationship conversion and completes this request together. Verify the Company’s new relationship and the request in Completed / history.',
  ],
  'readiness': [
    'Open this Company → Services and review its operational-readiness status and any manual block reason.',
    'Ask the responsible Phaeno team to resolve the stated issue in its owning settings or Finance workspace. If a manual block remains, authorized staff must clear it after resolving the reason.',
    'Return to Work needed. Readiness is rechecked from saved configuration; Company service permission alone does not complete the other operational requirements.',
  ],
  'invite-admin': [
    'Open this Company → People. Find the intended contact and open their Actions menu.',
    'If the contact already has accepted Portal access, choose Manage access and review their approved role. Otherwise, choose Invite to Portal and assign either Organization administrator or administrator access to the appropriate active department.',
    'Send the invitation. A valid pending invitation completes this invitation step; the recipient must still accept before the next step completes. Department administrators remain limited to their assigned departments.',
  ],
  'activate-admin': [
    'The invited administrator opens the invitation email, follows its link, signs in with the invited email address, and accepts access.',
    'While waiting, open Company → People to check the invitation status. Use the contact’s Actions → Resend invite if needed; an expired invitation needs a fresh link.',
    'This step completes when accepted administrator access is active. For access-only onboarding, the request then moves to Completed / history automatically. Requests that include services or other work keep their remaining requirements.',
  ],
  'trial-created': [
    'Open this request’s Actions → Start Trial. The originating request is selected for you.',
    'Complete the Trial creation form with the approved Company and department context, then save. Open that linked Trial for the remaining scope and approval work.',
    'This step completes once the saved Trial is linked to this request. Starting a Trial does not approve its scope or authorize sample submission.',
  ],
  'trial-scope': [
    'Open this request’s Actions → Open Trial. Review the proposed scientific work with the responsible commercial and scientific teams.',
    'Define the sample scope, analyses, deliverables, timing, and terms in the Trial workspace, then submit the scope for review.',
    'This step completes once a scope revision is recorded. Commercial and Scientific Operations must each approve the current revision before the Prospect can accept it.',
  ],
  'trial-Commercial': [
    'Open Actions → Open Trial and review the current submitted scope and its Commercial decision.',
    'The authorized Commercial reviewer reviews the proposed terms and records approval or requested changes in the Trial workspace. If changes are requested, update and resubmit the scope.',
    'This step completes only when Commercial approval applies to the current scope revision. Approval of an older revision is not sufficient.',
  ],
  'trial-ScientificOperations': [
    'Open Actions → Open Trial and review the current submitted scope and its Scientific Operations decision.',
    'The authorized Scientific Operations reviewer checks samples, analyses, feasibility, and deliverables, then records approval or requested changes. Resolve requested changes and resubmit the scope.',
    'This step completes only when Scientific Operations approval applies to the current scope revision.',
  ],
  'trial-accepted': [
    'First obtain both Commercial and Scientific Operations approvals for the current Trial scope.',
    'The Prospect’s organization administrator, or an administrator assigned to the Trial’s department, opens the Trial, reviews the approved scope and terms, and accepts them.',
    'This step completes when acceptance is recorded against the current approved revision. A pending invitation or acceptance of an earlier scope does not satisfy it.',
  ],
  'review-work': [
    'Open Actions → Open Order operations and review this Company’s active orders. Also review its linked Trials and other ongoing work in their owning workspaces.',
    'Agree with each responsible team whether the work will finish, be placed on an authorized hold, or be cancelled. Carry out each agreed action in the owning record.',
    'Record the affected records, decisions, and remaining responsibilities in completion notes when closing this request. This is a manual review item and is not automatically verified.',
  ],
  'review-obligations': [
    'Have Finance review outstanding invoices, payments, and other commercial obligations for this Company.',
    'Have the responsible operations team review retained results, customer files, and physical materials against the applicable retention and handling requirements.',
    'Record the agreed disposition and any continuing responsibilities in completion notes. Disabling Portal access does not settle billing or delete retained records.',
  ],
  'service-review': [
    'Open the Company and review this request’s approved service scope, affected departments, and effective dates.',
    'Open Services → Entitlements and make the approved permission changes. Review existing permissions before adding new ones, and link the applicable permission to this request where available.',
    'Verify the saved permissions against the approved scope. Record what changed and the outcome in completion notes; this item requires manual review.',
  ],
  'order-created': [
    'Open Order operations → Intake and locate this approved Company request. Confirm the Company and linked Opportunity match the intended order.',
    'Start the Customer order from that handoff and complete the order-creation form. Using this handoff preserves the link to the request.',
    'Creating the linked order completes this request. Quote approval, purchase commitment, sample submission, and fulfillment continue in the order workflow.',
  ],
  'order-eligibility': [
    'Open this Company and the linked Opportunity. Review the specific blocking reason shown above.',
    'Resolve the stated relationship, access, service, or commercial requirement in its owning workspace, then return to Order operations → Intake.',
    'This step completes when the order handoff is eligible or an order is already linked. Later quote and purchase requirements remain part of the order workflow.',
  ],
  'custom-work': [
    'Open the Company and linked Opportunity. Confirm the agreed deliverables, responsible team, commercial decision, and timing.',
    'Carry out the approved handoff in the workspace that owns the work and record the resulting work reference on the relevant records.',
    'Once the authorized work for this request is complete, use Complete request and record the outcome in completion notes. This checklist item requires manual review.',
  ],
}

export function getRequestWorkInstructions(id: string): string[] | undefined {
  return instructions[id]
}
