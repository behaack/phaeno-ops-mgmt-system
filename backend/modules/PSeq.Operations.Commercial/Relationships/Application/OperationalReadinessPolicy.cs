namespace PSeq.Operations.Commercial.Relationships.Application;

public enum OperationalReadiness
{
    NeedsSetup,
    Ready,
    Blocked
}

public enum OperationalReadinessBlockerCode
{
    ActiveCustomerRelationshipRequired,
    ManualBlock,
    ActiveCustomerAdministratorRequired,
    PSeqServiceEntitlementNotReady,
    ActivePSeqOfferingRequired,
    OrderConfigurationIncomplete,
    SampleConfigurationIncomplete,
    ShippingConfigurationIncomplete,
    ResultDestinationIncomplete,
    SubmissionInstructionsIncomplete,
    BillingContactIncomplete,
    BillingAddressIncomplete,
    PaymentTermsIncomplete,
    TaxDecisionIncomplete,
    FinanceTaxApprovalRequired
}

public sealed record OperationalReadinessInput(
    bool HasActiveCustomerRelationship,
    bool HasManualBlock,
    string? ManualBlockReason,
    bool HasActiveCustomerAdministrator,
    bool HasReadyPSeqEntitlement,
    bool HasActivePSeqOffering,
    bool HasCompleteOrderConfiguration,
    bool HasCompleteSampleConfiguration,
    bool HasCompleteShippingConfiguration,
    bool HasCompleteResultDestination,
    bool HasCompleteSubmissionInstructions,
    bool HasCompleteBillingContact,
    bool HasCompleteBillingAddress,
    bool HasValidPaymentTerms,
    bool HasEffectiveTaxDecision,
    bool HasFinanceApprovedTaxDecision);

public sealed record OperationalReadinessBlocker(
    OperationalReadinessBlockerCode Code,
    string Label,
    string NextAction);

public sealed record OperationalReadinessEvaluation(
    OperationalReadiness State,
    IReadOnlyList<OperationalReadinessBlocker> Blockers)
{
    public bool CanStageOrder => Blockers.All(blocker => blocker.Code is not (
        OperationalReadinessBlockerCode.ActiveCustomerRelationshipRequired
        or OperationalReadinessBlockerCode.ManualBlock
        or OperationalReadinessBlockerCode.PSeqServiceEntitlementNotReady
        or OperationalReadinessBlockerCode.ActivePSeqOfferingRequired));

    public bool CanIssueQuote => State == OperationalReadiness.Ready;
}

public static class OperationalReadinessPolicy
{
    public static OperationalReadinessEvaluation Evaluate(OperationalReadinessInput input)
    {
        var blockers = new List<OperationalReadinessBlocker>();
        AddIfMissing(input.HasActiveCustomerRelationship,
            OperationalReadinessBlockerCode.ActiveCustomerRelationshipRequired,
            "Active Customer relationship",
            "Complete and activate the Customer relationship.", blockers);
        AddIfMissing(input.HasActiveCustomerAdministrator,
            OperationalReadinessBlockerCode.ActiveCustomerAdministratorRequired,
            "Active Customer administrator",
            "Deliver and accept an administrator invitation.", blockers);
        AddIfMissing(input.HasReadyPSeqEntitlement,
            OperationalReadinessBlockerCode.PSeqServiceEntitlementNotReady,
            "PSeq service entitlement",
            "Activate the entitlement and mark its service configuration Ready.", blockers);
        AddIfMissing(input.HasActivePSeqOffering,
            OperationalReadinessBlockerCode.ActivePSeqOfferingRequired,
            "Active PSeq offering",
            "Activate an approved PSeq Lab Service offering.", blockers);
        AddIfMissing(input.HasCompleteOrderConfiguration,
            OperationalReadinessBlockerCode.OrderConfigurationIncomplete,
            "Order configuration",
            "Complete the PSeq order defaults.", blockers);
        AddIfMissing(input.HasCompleteSampleConfiguration,
            OperationalReadinessBlockerCode.SampleConfigurationIncomplete,
            "Sample configuration",
            "Complete required sample fields and validation.", blockers);
        AddIfMissing(input.HasCompleteShippingConfiguration,
            OperationalReadinessBlockerCode.ShippingConfigurationIncomplete,
            "Shipping configuration",
            "Complete approved shipping configuration.", blockers);
        AddIfMissing(input.HasCompleteResultDestination,
            OperationalReadinessBlockerCode.ResultDestinationIncomplete,
            "Result destination",
            "Configure the approved result destination.", blockers);
        AddIfMissing(input.HasCompleteSubmissionInstructions,
            OperationalReadinessBlockerCode.SubmissionInstructionsIncomplete,
            "Submission instructions",
            "Publish complete sample-submission instructions.", blockers);
        AddIfMissing(input.HasCompleteBillingContact,
            OperationalReadinessBlockerCode.BillingContactIncomplete,
            "Billing contact",
            "Add the Customer billing contact.", blockers);
        AddIfMissing(input.HasCompleteBillingAddress,
            OperationalReadinessBlockerCode.BillingAddressIncomplete,
            "Billing address",
            "Add the Customer billing address.", blockers);
        AddIfMissing(input.HasValidPaymentTerms,
            OperationalReadinessBlockerCode.PaymentTermsIncomplete,
            "Payment terms",
            "Set valid Customer payment terms.", blockers);
        AddIfMissing(input.HasEffectiveTaxDecision,
            OperationalReadinessBlockerCode.TaxDecisionIncomplete,
            "Tax decision",
            "Record Taxable, Exempt, or Non-taxable.", blockers);
        AddIfMissing(input.HasFinanceApprovedTaxDecision,
            OperationalReadinessBlockerCode.FinanceTaxApprovalRequired,
            "Finance tax approval",
            "Have Finance approve the effective tax decision.", blockers);

        if (input.HasManualBlock)
        {
            blockers.Insert(0, new OperationalReadinessBlocker(
                OperationalReadinessBlockerCode.ManualBlock,
                "Manual operational block",
                string.IsNullOrWhiteSpace(input.ManualBlockReason)
                    ? "Review and clear the manual block."
                    : input.ManualBlockReason));
        }

        var state = input.HasManualBlock
            ? OperationalReadiness.Blocked
            : blockers.Count == 0
                ? OperationalReadiness.Ready
                : OperationalReadiness.NeedsSetup;
        return new OperationalReadinessEvaluation(state, blockers);
    }

    private static void AddIfMissing(
        bool condition,
        OperationalReadinessBlockerCode code,
        string label,
        string nextAction,
        ICollection<OperationalReadinessBlocker> blockers)
    {
        if (!condition) blockers.Add(new OperationalReadinessBlocker(code, label, nextAction));
    }
}
