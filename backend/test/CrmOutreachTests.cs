namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.Crm.Domain;

public sealed class CrmOutreachTests
{
    private static readonly DateTime Now = new(2026, 9, 8, 12, 0, 0, DateTimeKind.Utc);
    private static CrmContact Contact(CrmCommunicationPreference preference = CrmCommunicationPreference.Unknown) =>
        new("Test", "Person", Guid.NewGuid(), "person@example.test", communicationPreference: preference);
    private static void Allow(CrmContact contact) => contact.RecordOutreachDecision(CrmCommunicationPreference.Permitted,
        "RecordedConsent", new(2026, 9, 7), null, "Email about the requested product family", Now);

    [Theory]
    [InlineData(CrmCommunicationPreference.Unknown, "NotEstablished")]
    [InlineData(CrmCommunicationPreference.Permitted, "NotEstablished")]
    [InlineData(CrmCommunicationPreference.OptedOut, "Suppressed")]
    [InlineData(CrmCommunicationPreference.DoNotContact, "Suppressed")]
    public void LegacyValuesNeverManufacturePermission(CrmCommunicationPreference preference, string status)
    {
        var contact = Contact(preference);
        Assert.Equal(preference, contact.CommunicationPreference);
        Assert.Equal(status, contact.OutreachStatus);
        Assert.False(contact.CanReceiveOutreach);
    }

    [Fact]
    public void ReviewedPermissionRequiresCurrentEmailAndActiveUnmergedContact()
    {
        var contact = Contact(); Allow(contact);
        Assert.True(contact.CanReceiveOutreach);
        contact.Deactivate(); Assert.False(contact.CanReceiveOutreach);
        contact.Reactivate(); Assert.True(contact.CanReceiveOutreach);
        contact.MergeInto(Guid.NewGuid()); Assert.False(contact.CanReceiveOutreach);
    }

    [Theory]
    [InlineData("bad", "2026-09-07", "Evidence", null)]
    [InlineData("StaffReview", "2026-09-09", "Evidence", null)]
    [InlineData("StaffReview", null, "Evidence", null)]
    [InlineData("StaffReview", "2026-09-07", "", null)]
    [InlineData("DirectRequest", "2026-09-07", "Evidence", "invalid")]
    public void InvalidEvidenceDoesNotChangeExistingDecision(string source, string? date, string explanation, string? suppressionReason)
    {
        var contact = Contact(); Allow(contact);
        Assert.Throws<ArgumentException>(() => contact.RecordOutreachDecision(
            suppressionReason is null ? CrmCommunicationPreference.Permitted : CrmCommunicationPreference.Suppressed,
            source, date is null ? null : DateOnly.Parse(date), suppressionReason, explanation, Now));
        Assert.True(contact.CanReceiveOutreach);
        Assert.Equal("RecordedConsent", contact.OutreachPermissionSource);
    }

    [Fact]
    public void PermissionCannotBeRecordedWithoutAnEmail()
    {
        var contact = new CrmContact("Test", "Person", Guid.NewGuid());
        Assert.Throws<ArgumentException>(() => Allow(contact));
        Assert.Equal("NotEstablished", contact.OutreachStatus);
    }

    [Fact]
    public void ChangingEmailRequiresFreshPermissionButCaseChangesDoNot()
    {
        var contact = Contact(); Allow(contact);
        contact.UpdateProfile("Test", "Person", "PERSON@example.test", null, contact.CommunicationPreference, null, contact.CommunicationNotes, []);
        Assert.True(contact.CanReceiveOutreach);
        contact.UpdateProfile("Test", "Person", "different@example.test", null, contact.CommunicationPreference, null, contact.CommunicationNotes, []);
        Assert.False(contact.CanReceiveOutreach);
        Assert.Equal("NotEstablished", contact.OutreachStatus);
        Assert.Null(contact.OutreachRecordedOn);
    }

    [Theory]
    [InlineData(CrmCommunicationPreference.OptedOut)]
    [InlineData(CrmCommunicationPreference.DoNotContact)]
    [InlineData(CrmCommunicationPreference.Suppressed)]
    public void MergeAndEmailChangePreserveSuppression(CrmCommunicationPreference preference)
    {
        var source = Contact(preference); var target = Contact(); Allow(target);
        target.PreserveSuppressionFrom(source);
        target.UpdateProfile("Test", "Person", "different@example.test", null, target.CommunicationPreference, null, target.CommunicationNotes, []);
        Assert.Equal("Suppressed", target.OutreachStatus);
        Assert.False(target.CanReceiveOutreach);
    }
}
