namespace PhaenoPortal.Test;

using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Common.Exceptions.Conflict;
using PhaenoPortal.App.Features.Accounts.DTOs;
using PhaenoPortal.App.Features.Accounts.Endpoints;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Controllers;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PhaenoPortal.App.Infrastructure.Persistence.Auditing;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.Relationships.Domain;
using UglyToad.PdfPig;

[Collection(PostgreSqlReferenceCollection.Name)]
public sealed class DepartmentAccessPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task InvitationPreviewShowsOnlyPendingRecipientDetailsWithoutGrantingAccess()
    {
        await using var scope = await Scope.Create();
        var tokens = new PSeq.Operations.Commercial.Accounts.Application.InvitationTokenService();
        var token = tokens.CreateToken();
        var invitation = new OrganizationInvitation(scope.Organization.Id, $"preview-{Guid.NewGuid():N}@example.com",
            "Invited", "Person", false, token.TokenHash, DateTime.UtcNow.AddDays(1));
        scope.Db.Add(invitation);
        await scope.Db.SaveChangesAsync();
        var membershipCount = await scope.Db.OrganizationMemberships.CountAsync();
        var anonymous = new DefaultHttpContext();
        var result = Assert.IsType<Ok<InvitationPreviewDto>>(await InvitationEndpoints.PreviewInvitation(
            new(token.RawToken), anonymous, scope.Db, tokens, default));
        Assert.Equal(invitation.Email, result.Value!.Email);
        Assert.Equal("Invited", result.Value.FirstName);
        Assert.Equal(scope.Organization.Name, result.Value.OrganizationName);
        Assert.Equal("no-store", anonymous.Response.Headers.CacheControl.ToString());
        Assert.Equal(InvitationStatus.Pending, invitation.Status);
        Assert.Equal(membershipCount, await scope.Db.OrganizationMemberships.CountAsync());
        Assert.False(scope.Db.ChangeTracker.HasChanges());
    }

    [PostgreSqlReferenceFact]
    public async Task InvitationPreviewRejectsInvalidExpiredConsumedAndInactiveLinksWithoutIdentityDisclosure()
    {
        await using var scope = await Scope.Create();
        var tokens = new PSeq.Operations.Commercial.Accounts.Application.InvitationTokenService();
        var unavailableTokens = new List<string> { "", "unknown", new('x', 257) };
        foreach (var state in new[] { "expired", "revoked", "accepted", "declined", "inactive" })
        {
            var token = tokens.CreateToken();
            var invitation = new OrganizationInvitation(scope.Organization.Id, $"{state}-{Guid.NewGuid():N}@example.com",
                "Invited", "Person", false, token.TokenHash,
                DateTime.UtcNow.AddDays(state == "expired" ? -1 : 1));
            if (state == "revoked") invitation.Revoke(scope.Actor.Id, DateTime.UtcNow);
            if (state == "accepted") invitation.Accept(scope.Actor.Id, DateTime.UtcNow);
            if (state == "declined") invitation.Decline(scope.Actor.Id, DateTime.UtcNow);
            scope.Db.Add(invitation);
            if (state == "inactive") scope.Organization.Deactivate();
            await scope.Db.SaveChangesAsync();
            await AssertUnavailable(token.RawToken);
        }
        foreach (var token in unavailableTokens)
            await AssertUnavailable(token);

        async Task AssertUnavailable(string token)
        {
            var anonymous = new DefaultHttpContext();
            var error = await Assert.ThrowsAsync<BadRequestException>(() => InvitationEndpoints.PreviewInvitation(
                new(token), anonymous, scope.Db, tokens, default));
            Assert.Equal("This invitation is unavailable. Ask the sender for a new invitation.", error.Message);
            Assert.Equal("no-store", anonymous.Response.Headers.CacheControl.ToString());
        }
    }

    [PostgreSqlReferenceFact]
    public async Task OrganizationDefaultsAreVersionedAuditedAndInheritedByOrderContext()
    {
        await using var scope = await Scope.Create();
        var request = new UpdateOrganizationConfigurationRequest(true, "billing@example.com", "notice@example.com", "Frozen", "Portal", scope.Organization.Version);
        var saved = Assert.IsType<Ok<OrganizationConfigurationDto>>(await DepartmentEndpoints.UpdateOrganizationConfiguration(
            scope.Organization.Id, request, scope.Http, scope.Db, scope.Identity, default));
        Assert.True(saved.Value!.Version > request.Version);
        Assert.True(await scope.Db.AuditEvents.AnyAsync(value => value.EntityId == scope.Organization.Id.ToString()));
        var tenant = await scope.Context.RequireTenantAsync(scope.Http, OrganizationKind.Customer, true, default);
        Assert.True(tenant.Configuration.PurchaseOrderRequired);
        Assert.Equal("billing@example.com", tenant.Configuration.BillingContactEmail);
        Assert.Equal("Frozen", tenant.Configuration.ShippingInstructions);
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => DepartmentEndpoints.UpdateOrganizationConfiguration(
            scope.Organization.Id, request, scope.Http, scope.Db, scope.Identity, default));
        scope.General.UpdateConfiguration(false, null, "team@example.com", null, null);
        await scope.Db.SaveChangesAsync();
        tenant = await scope.Context.RequireTenantAsync(scope.Http, OrganizationKind.Customer, true, default);
        Assert.False(tenant.Configuration.PurchaseOrderRequired);
        Assert.Equal("team@example.com", tenant.Configuration.NotificationEmail);
        var other = new Organization($"Other {Guid.NewGuid():N}", OrganizationKind.Customer);
        scope.Db.Add(other);
        await scope.Db.SaveChangesAsync();
        Assert.IsType<ForbidHttpResult>(await DepartmentEndpoints.ReadOrganizationConfiguration(other.Id, scope.Http, scope.Db, scope.Identity, default));
        Assert.IsType<ForbidHttpResult>(await DepartmentEndpoints.UpdateOrganizationConfiguration(other.Id, request, scope.Http, scope.Db, scope.Identity, default));
    }

    [PostgreSqlReferenceFact]
    public async Task DepartmentAdminCannotManageOrganizationDefaultsOrOverrideOrganizationAdminAccess()
    {
        await using var scope = await Scope.Create();
        var target = scope.AddMember(scope.General, false);
        await scope.Db.SaveChangesAsync();
        target.OrganizationMembership.SetOrganizationAdmin(true);
        scope.AdminMembership.SetOrganizationAdmin(false);
        scope.Db.Add(new OrganizationDepartmentMembership(scope.AdminMembership.Id, scope.General.Id, true));
        await scope.Db.SaveChangesAsync();
        Assert.IsType<ForbidHttpResult>(await DepartmentEndpoints.ReadOrganizationConfiguration(scope.Organization.Id, scope.Http, scope.Db, scope.Identity, default));
        Assert.IsType<ForbidHttpResult>(await DepartmentEndpoints.UpdateOrganizationConfiguration(scope.Organization.Id,
            new(true, null, null, null, null, scope.Organization.Version), scope.Http, scope.Db, scope.Identity, default));
        await Assert.ThrowsAsync<BadRequestException>(() => DepartmentEndpoints.DeactivateDepartmentMember(scope.Organization.Id,
            scope.General.Id, target.OrganizationMembershipId, new(false, target.Version), scope.Http, scope.Db, scope.Identity, default));
        await Assert.ThrowsAsync<BadRequestException>(() => DepartmentEndpoints.UpsertDepartmentMember(scope.Organization.Id,
            scope.General.Id, target.OrganizationMembershipId, new(true, target.Version), scope.Http, scope.Db, scope.Identity, default));
        Assert.True(target.IsActive);
    }

    [PostgreSqlReferenceFact]
    public async Task DepartmentAdminCanEditAssignedSettingsButCannotChangeStructureOrAnotherDepartment()
    {
        await using var scope = await Scope.Create();
        scope.AdminMembership.SetOrganizationAdmin(false);
        scope.Db.Add(new OrganizationDepartmentMembership(scope.AdminMembership.Id, scope.Research.Id, true));
        await scope.Db.SaveChangesAsync();
        var request = new UpsertDepartmentRequest("RESEARCH", "Research updated", null,
            true, "billing@example.com", null, "Frozen", "Portal", scope.Research.Version);
        Assert.IsType<Ok<DepartmentDto>>(await DepartmentEndpoints.UpdateDepartment(scope.Organization.Id,
            scope.Research.Id, request, scope.Http, scope.Db, scope.Identity, default));
        Assert.Equal("Research updated", scope.Research.Name);
        Assert.True(scope.Research.PurchaseOrderRequired);
        Assert.IsType<ForbidHttpResult>(await DepartmentEndpoints.UpdateDepartment(scope.Organization.Id,
            scope.General.Id, request with { Version = scope.General.Version }, scope.Http, scope.Db, scope.Identity, default));
        Assert.IsType<ForbidHttpResult>(await DepartmentEndpoints.CreateDepartment(scope.Organization.Id,
            request, scope.Http, scope.Db, scope.Identity, default));
        Assert.IsType<ForbidHttpResult>(await DepartmentEndpoints.SetDefaultDepartment(scope.Organization.Id,
            scope.Research.Id, new(scope.Research.Version), scope.Http, scope.Db, scope.Identity, default));
        Assert.IsType<ForbidHttpResult>(await DepartmentEndpoints.ChangeDepartmentActive(scope.Organization.Id,
            scope.Research.Id, "deactivate", new(scope.Research.Version), scope.Http, scope.Db, scope.Identity, default));
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => DepartmentEndpoints.UpdateDepartment(scope.Organization.Id,
            scope.Research.Id, request, scope.Http, scope.Db, scope.Identity, default));
    }

    [PostgreSqlReferenceFact]
    public async Task DepartmentMemberCannotEditSettingsOrLookUpOrganizationMembers()
    {
        await using var scope = await Scope.Create();
        scope.AdminMembership.SetOrganizationAdmin(false);
        scope.Db.Add(new OrganizationDepartmentMembership(scope.AdminMembership.Id, scope.Research.Id, false));
        await scope.Db.SaveChangesAsync();
        Assert.IsType<ForbidHttpResult>(await DepartmentEndpoints.UpdateDepartment(scope.Organization.Id, scope.Research.Id,
            new("RESEARCH", "Denied", null, null, null, null, null, null, scope.Research.Version), scope.Http, scope.Db, scope.Identity, default));
        Assert.IsType<ForbidHttpResult>(await DepartmentEndpoints.LookupDepartmentMember(scope.Organization.Id, scope.Research.Id,
            new(scope.Actor.Email), scope.Http, scope.Db, scope.Identity, default));
    }

    [PostgreSqlReferenceFact]
    public async Task DepartmentMemberLookupRequiresExactActiveOrganizationMembershipAndAssignedAdminScope()
    {
        await using var scope = await Scope.Create();
        scope.AdminMembership.SetOrganizationAdmin(false);
        scope.Db.Add(new OrganizationDepartmentMembership(scope.AdminMembership.Id, scope.Research.Id, true));
        var target = scope.AddMember(scope.General, false);
        await scope.Db.SaveChangesAsync();
        var user = await scope.Db.Users.SingleAsync(value => value.Id == target.OrganizationMembership.UserId);
        var result = Assert.IsType<Ok<List<DepartmentMemberCandidateDto>>>(await DepartmentEndpoints.LookupDepartmentMember(
            scope.Organization.Id, scope.Research.Id, new($" {user.Email.ToUpperInvariant()} "), scope.Http, scope.Db, scope.Identity, default));
        Assert.Equal(target.OrganizationMembershipId, Assert.Single(result.Value!).OrganizationMembershipId);
        Assert.IsType<ForbidHttpResult>(await DepartmentEndpoints.LookupDepartmentMember(scope.Organization.Id, scope.General.Id,
            new(user.Email), scope.Http, scope.Db, scope.Identity, default));
        var missing = Assert.IsType<Ok<List<DepartmentMemberCandidateDto>>>(await DepartmentEndpoints.LookupDepartmentMember(
            scope.Organization.Id, scope.Research.Id, new("unknown@example.com"), scope.Http, scope.Db, scope.Identity, default));
        Assert.Empty(missing.Value!);
        user.Deactivate();
        await scope.Db.SaveChangesAsync();
        var disabled = Assert.IsType<Ok<List<DepartmentMemberCandidateDto>>>(await DepartmentEndpoints.LookupDepartmentMember(
            scope.Organization.Id, scope.Research.Id, new(user.Email), scope.Http, scope.Db, scope.Identity, default));
        Assert.Empty(disabled.Value!);
    }

    [PostgreSqlReferenceFact]
    public async Task DepartmentAssignmentRequiresReviewedVersionAndRetainsOtherDepartmentAccess()
    {
        await using var scope = await Scope.Create();
        scope.AdminMembership.SetOrganizationAdmin(false);
        scope.Db.Add(new OrganizationDepartmentMembership(scope.AdminMembership.Id, scope.Research.Id, true));
        var target = scope.AddMember(scope.General, false);
        await scope.Db.SaveChangesAsync();
        var added = Assert.IsType<Ok<DepartmentMembershipDto>>(await DepartmentEndpoints.UpsertDepartmentMember(scope.Organization.Id,
            scope.Research.Id, target.OrganizationMembershipId, new(false, null), scope.Http, scope.Db, scope.Identity, default));
        Assert.True(added.Value!.IsActive);
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => DepartmentEndpoints.UpsertDepartmentMember(scope.Organization.Id,
            scope.Research.Id, target.OrganizationMembershipId, new(true, null), scope.Http, scope.Db, scope.Identity, default));
        var promoted = Assert.IsType<Ok<DepartmentMembershipDto>>(await DepartmentEndpoints.UpsertDepartmentMember(scope.Organization.Id,
            scope.Research.Id, target.OrganizationMembershipId, new(true, added.Value.Version), scope.Http, scope.Db, scope.Identity, default));
        Assert.True(promoted.Value!.IsDepartmentAdmin);
        await DepartmentEndpoints.DeactivateDepartmentMember(scope.Organization.Id, scope.Research.Id,
            target.OrganizationMembershipId, new(false, promoted.Value.Version), scope.Http, scope.Db, scope.Identity, default);
        Assert.True(target.IsActive);
    }

    [PostgreSqlReferenceFact]
    public async Task OrganizationAdminCannotReadAnotherOrganizationsDepartmentMembers()
    {
        await using var scope = await Scope.Create();
        var other = new Organization($"Other {Guid.NewGuid():N}", OrganizationKind.Customer);
        scope.Db.Add(other);
        await scope.Db.SaveChangesAsync();
        var result = await DepartmentEndpoints.ListDepartmentMembers(scope.Organization.Id,
            other.Departments.Single().Id, scope.Http, scope.Db, scope.Identity, default);
        Assert.IsType<ForbidHttpResult>(result);
    }

    [PostgreSqlReferenceFact]
    public async Task DepartmentDeactivationCannotStrandAnActiveMember()
    {
        await using var scope = await Scope.Create();
        var member = scope.AddMember(scope.Research, false);
        await scope.Db.SaveChangesAsync();
        var error = await Assert.ThrowsAsync<BadRequestException>(() => DepartmentEndpoints.ChangeDepartmentActive(
            scope.Organization.Id, scope.Research.Id, "deactivate", new(scope.Research.Version),
            scope.Http, scope.Db, scope.Identity, default));
        Assert.Contains("another department", error.Message);
        Assert.True(scope.Research.IsActive);
        Assert.True(member.IsActive);
    }

    [PostgreSqlReferenceFact]
    public async Task DepartmentDeactivationPreservesOtherAccessAndReactivationDoesNotRestoreRevokedAccess()
    {
        await using var scope = await Scope.Create();
        var member = scope.AddMember(scope.Research, false);
        scope.Db.Add(new OrganizationDepartmentMembership(member.OrganizationMembershipId, scope.General.Id, false));
        await scope.Db.SaveChangesAsync();
        await DepartmentEndpoints.ChangeDepartmentActive(scope.Organization.Id, scope.Research.Id,
            "deactivate", new(scope.Research.Version), scope.Http, scope.Db, scope.Identity, default);
        Assert.False(member.IsActive);
        await DepartmentEndpoints.ChangeDepartmentActive(scope.Organization.Id, scope.Research.Id,
            "reactivate", new(scope.Research.Version), scope.Http, scope.Db, scope.Identity, default);
        Assert.False(member.IsActive);
    }

    [PostgreSqlReferenceFact]
    public async Task DefaultSwitchRemainsUniqueAndAudited()
    {
        await using var scope = await Scope.Create();
        await DepartmentEndpoints.SetDefaultDepartment(scope.Organization.Id, scope.Research.Id,
            new(scope.Research.Version), scope.Http, scope.Db, scope.Identity, default);
        var defaults = await scope.Db.OrganizationDepartments.AsNoTracking()
            .Where(value => value.OrganizationId == scope.Organization.Id && value.IsDefault).ToListAsync();
        Assert.Equal(scope.Research.Id, Assert.Single(defaults).Id);
        Assert.True(await scope.Db.AuditEvents.AnyAsync(value => value.EntityId == scope.Research.Id.ToString()));
    }

    [PostgreSqlReferenceFact]
    public async Task InvalidInvitationDepartmentNeverFallsBackToGeneral()
    {
        await using var scope = await Scope.Create();
        var invitation = new OrganizationInvitation(scope.Organization.Id, $"invite-{Guid.NewGuid():N}@example.com",
            "Invited", "Person", false, Guid.NewGuid().ToString("N"), DateTime.UtcNow.AddDays(1));
        scope.Db.AddRange(invitation, new OrganizationInvitationDepartment(invitation.Id, scope.Research.Id, false));
        scope.Research.Deactivate();
        await scope.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<BadRequestException>(() => InvitationEndpoints.ValidateDepartmentIntentAsync(scope.Db, invitation, default));
        Assert.Single(await scope.Db.OrganizationInvitationDepartments.Where(value => value.OrganizationInvitationId == invitation.Id).ToListAsync());
    }

    [PostgreSqlReferenceFact]
    public async Task BlockedDepartmentEntitlementOverridesReadyOrganizationDefault()
    {
        await using var scope = await Scope.Create();
        scope.Db.AddRange(
            new OrganizationServiceEntitlement(scope.Organization.Id, PortalService.PSeqLabService,
                DateTime.UtcNow.AddDays(-1), null, EntitlementConfigurationStatus.Ready, scope.Actor.Id, null, null),
            new OrganizationServiceEntitlement(scope.Organization.Id, PortalService.PSeqLabService,
                DateTime.UtcNow.AddDays(-1), null, EntitlementConfigurationStatus.Blocked, scope.Actor.Id, null, null, scope.Research.Id));
        await scope.Db.SaveChangesAsync();
        var research = await LabServiceOrderingEligibility.ReadAsync(scope.Db, scope.Organization.Id, DateTime.UtcNow, default, scope.Research.Id);
        var general = await LabServiceOrderingEligibility.ReadAsync(scope.Db, scope.Organization.Id, DateTime.UtcNow, default, scope.General.Id);
        Assert.False(research.OrderingAuthorized);
        Assert.True(general.OrderingAuthorized);
    }

    [PostgreSqlReferenceFact]
    public async Task DepartmentOnlyEntitlementCannotAuthorizeAnUnspecifiedDepartment()
    {
        await using var scope = await Scope.Create();
        scope.Db.Add(new OrganizationServiceEntitlement(scope.Organization.Id, PortalService.PSeqLabService,
            DateTime.UtcNow.AddDays(-1), null, EntitlementConfigurationStatus.Ready, scope.Actor.Id, null, null, scope.Research.Id));
        await scope.Db.SaveChangesAsync();
        Assert.False((await LabServiceOrderingEligibility.ReadAsync(scope.Db, scope.Organization.Id, DateTime.UtcNow, default)).OrderingAuthorized);
    }

    [PostgreSqlReferenceFact]
    public async Task ResultListAndDownloadRejectOtherDepartmentBeforeReadingStorage()
    {
        await using var scope = await Scope.Create();
        var order = scope.AddOrder(scope.Research);
        await scope.Db.SaveChangesAsync();
        var storage = new RecordingStorage();
        var controller = new PSeqResultDownloadsController(scope.Db, scope.Context, storage, null!,
            new PhaenoPortal.App.Features.FileManagement.Services.GovernedResultRetentionService(scope.Db), null!)
            { ControllerContext = new() { HttpContext = scope.Http } };
        var error = await Assert.ThrowsAsync<OrderManagementException>(() => controller.List(order.Id, default));
        Assert.Equal(StatusCodes.Status404NotFound, error.StatusCode);
        await Assert.ThrowsAsync<OrderManagementException>(() => controller.Download(order.Id, Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), default));
        Assert.Equal(0, storage.ReadCount);
        scope.Http.Request.Headers["X-Department-Id"] = scope.Research.Id.ToString();
        Assert.Empty(await controller.List(order.Id, default));
    }

    [PostgreSqlReferenceFact]
    public async Task InvoiceListAndPdfStayInsideSelectedDepartment()
    {
        await using var scope = await Scope.Create();
        var own = scope.AddInvoice(scope.General);
        var other = scope.AddInvoice(scope.Research);
        await scope.Db.SaveChangesAsync();
        var storage = new RecordingStorage();
        var controller = new CustomerInvoicesController(scope.Db, scope.Context, storage)
            { ControllerContext = new() { HttpContext = scope.Http } };
        Assert.Equal(own.Id, Assert.Single(await controller.List(default)).Id);
        await Assert.ThrowsAsync<OrderManagementException>(() => controller.DownloadPdf(other.Id, default));
        Assert.Equal(0, storage.ReadCount);
        Assert.IsType<FileStreamResult>(await controller.DownloadPdf(own.Id, default));
        Assert.Equal(1, storage.ReadCount);
    }

    [PostgreSqlReferenceFact]
    public async Task QuotePdfAllowsOrdinaryMemberAndKeepsStoredCommercialDataUnchanged()
    {
        await using var scope = await Scope.Create();
        var access = scope.UseOrdinaryMember();
        var order = scope.AddOrder(scope.General, 9);
        var catalogItemId = Guid.NewGuid();
        const string internalNote = "Confidential costing review for laboratory operations";
        var quote = scope.AddQuote(order, QuoteStatus.Issued, catalogItemId, internalNote);
        await scope.Db.SaveChangesAsync();
        var before = JsonSerializer.Serialize(await scope.Db.LabServiceQuotes.AsNoTracking().SingleAsync(value => value.Id == quote.Id));
        var orderVersion = order.Version;
        var auditCount = await scope.Db.AuditEvents.CountAsync();

        var result = await scope.QuoteController().GetQuotePdf(order.Id, quote.Id, default);

        Assert.False(scope.AdminMembership.IsOrganizationAdmin);
        Assert.False(access.IsDepartmentAdmin);
        Assert.Equal("application/pdf", result.ContentType);
        Assert.Equal($"{order.OrderNumber}-quote-r1.pdf", result.FileDownloadName);
        Assert.Equal("no-store", scope.Http.Response.Headers.CacheControl.ToString());
        using var pdf = PdfDocument.Open(result.FileContents);
        Assert.NotEmpty(pdf.GetPage(1).GetImages());
        var text = string.Join(" ", pdf.GetPages().Select(page => page.Text));
        Assert.Contains("Phaeno Inc.", text);
        Assert.Contains("PSeq Lab Service", text);
        Assert.Contains("900.00", text);
        Assert.Contains("USD", text);
        Assert.DoesNotContain(catalogItemId.ToString(), text);
        Assert.DoesNotContain(scope.Actor.Id.ToString(), text);
        Assert.DoesNotContain("private-catalog-reference", text);
        Assert.DoesNotContain(internalNote, text);
        Assert.DoesNotContain("linesJson", text);
        Assert.False(scope.Db.ChangeTracker.HasChanges());
        Assert.Equal(before, JsonSerializer.Serialize(await scope.Db.LabServiceQuotes.AsNoTracking().SingleAsync(value => value.Id == quote.Id)));
        Assert.Equal(orderVersion, await scope.Db.LabServiceOrders.Where(value => value.Id == order.Id).Select(value => value.Version).SingleAsync());
        Assert.Equal(auditCount, await scope.Db.AuditEvents.CountAsync());
    }

    [PostgreSqlReferenceFact]
    public async Task QuotePdfKeepsIssuedHistoricalRevisionsAvailableToMembers()
    {
        await using var scope = await Scope.Create();
        scope.UseOrdinaryMember();
        var order = scope.AddOrder(scope.General, 9);
        var quotes = new[] { QuoteStatus.Issued, QuoteStatus.Accepted, QuoteStatus.Superseded, QuoteStatus.Expired, QuoteStatus.Declined }
            .Select((status, index) => scope.AddQuote(order, status, revision: index + 1)).ToArray();
        await scope.Db.SaveChangesAsync();
        var controller = scope.QuoteController();

        foreach (var quote in quotes)
        {
            var result = await controller.GetQuotePdf(order.Id, quote.Id, default);
            Assert.Equal($"{order.OrderNumber}-quote-r{quote.Revision}.pdf", result.FileDownloadName);
            using var pdf = PdfDocument.Open(result.FileContents);
            Assert.NotEmpty(pdf.GetPages());
        }

        Assert.False(scope.Db.ChangeTracker.HasChanges());
    }

    [PostgreSqlReferenceFact]
    public async Task QuotePdfUsesFrozenBillingTermsAndReportsMalformedStoredLines()
    {
        await using var scope = await Scope.Create();
        scope.UseOrdinaryMember();
        var order = scope.AddOrder(scope.General, 9);
        var quote = scope.AddQuote(order, QuoteStatus.SyncPending);
        quote.FreezeCommercialTerms(
            "{\"name\":\"Original Billing Contact\",\"email\":\"original-billing@example.com\"}",
            "{\"line1\":\"123 Original Street\",\"line2\":\"Suite 4\",\"city\":\"Baltimore\",\"region\":\"MD\",\"postalCode\":\"21201\",\"countryCode\":\"US\"}",
            45, "{\"decision\":\"NonTaxable\"}", 1);
        quote.MarkIssued();
        var currentProfile = new OrganizationCommercialProfile(scope.Organization.Id);
        currentProfile.UpdateBillingConfiguration("Replacement Billing Contact", "replacement-billing@example.com",
            "{\"line1\":\"999 Replacement Avenue\"}", 60, EffectiveTaxDecision.NonTaxable, null, null);
        scope.Db.Add(currentProfile);
        var malformed = scope.AddQuote(order, QuoteStatus.Issued, revision: 2);
        scope.Db.Entry(malformed).Property(value => value.LinesJson).CurrentValue = "{\"internalNote\":\"Non-public malformed quote detail\"}";
        await scope.Db.SaveChangesAsync();
        var controller = scope.QuoteController();

        var result = await controller.GetQuotePdf(order.Id, quote.Id, default);
        using var pdf = PdfDocument.Open(result.FileContents);
        var text = string.Join(" ", pdf.GetPages().Select(page => page.Text));
        foreach (var expected in new[] { "Original Billing Contact", "original-billing@example.com", "123 Original Street",
            "Suite 4", "Baltimore", "MD", "21201", "US", "Payment terms: Net 45 days." })
            Assert.Contains(expected, text);
        Assert.DoesNotContain("Replacement Billing Contact", text);
        Assert.DoesNotContain("replacement-billing@example.com", text);
        Assert.DoesNotContain("999 Replacement Avenue", text);
        Assert.DoesNotContain("Net 60", text);

        var error = await Assert.ThrowsAsync<OrderManagementException>(() => controller.GetQuotePdf(order.Id, malformed.Id, default));
        Assert.Equal("quote_document_unavailable", error.ErrorCode);
        Assert.Equal(StatusCodes.Status409Conflict, error.StatusCode);
        Assert.DoesNotContain("Non-public", error.Message);
        Assert.False(scope.Db.ChangeTracker.HasChanges());
    }

    [PostgreSqlReferenceFact]
    public async Task QuotePdfRejectsOtherTenantDepartmentOrderAndUnavailableRevisions()
    {
        await using var scope = await Scope.Create();
        scope.UseOrdinaryMember();
        scope.Db.Add(new OrganizationDepartmentMembership(scope.AdminMembership.Id, scope.Research.Id, false));
        var own = scope.AddOrder(scope.General);
        var ownQuote = scope.AddQuote(own, QuoteStatus.Issued);
        var otherOrder = scope.AddOrder(scope.General);
        var otherOrderQuote = scope.AddQuote(otherOrder, QuoteStatus.Issued);
        var otherDepartmentOrder = scope.AddOrder(scope.Research);
        var otherDepartmentQuote = scope.AddQuote(otherDepartmentOrder, QuoteStatus.Issued);
        var otherOrganization = new Organization($"Other quote tenant {Guid.NewGuid():N}", OrganizationKind.Customer);
        scope.Db.Add(otherOrganization);
        var foreignOrder = new LabServiceOrder(otherOrganization.Id, otherOrganization.Departments.Single().Id,
            $"TEST-{Guid.NewGuid():N}", "Other organization request", null, 1, false, "RNA", "Frozen", "No hazard", "Test instructions");
        scope.Db.Add(foreignOrder);
        var foreignQuote = scope.AddQuote(foreignOrder, QuoteStatus.Issued);
        var draft = scope.AddQuote(own, QuoteStatus.Draft, revision: 2);
        var pending = scope.AddQuote(own, QuoteStatus.SyncPending, revision: 3);
        await scope.Db.SaveChangesAsync();
        var controller = scope.QuoteController();

        await AssertMissing(otherDepartmentOrder.Id, otherDepartmentQuote.Id);
        await AssertMissing(foreignOrder.Id, foreignQuote.Id);
        await AssertMissing(own.Id, otherOrderQuote.Id);
        await AssertMissing(own.Id, draft.Id);
        await AssertMissing(own.Id, pending.Id);
        await AssertMissing(own.Id, Guid.NewGuid());
        await AssertMissing(Guid.NewGuid(), ownQuote.Id);
        scope.Http.Request.Headers["X-Department-Id"] = scope.Research.Id.ToString();
        await AssertMissing(own.Id, ownQuote.Id);
        scope.Http.Request.Headers["X-Organization-Id"] = otherOrganization.Id.ToString();
        scope.Http.Request.Headers["X-Department-Id"] = otherOrganization.Departments.Single().Id.ToString();
        await AssertMissing(foreignOrder.Id, foreignQuote.Id);
        Assert.False(scope.Db.ChangeTracker.HasChanges());

        async Task AssertMissing(Guid orderId, Guid quoteId)
        {
            var error = await Assert.ThrowsAsync<OrderManagementException>(() => controller.GetQuotePdf(orderId, quoteId, default));
            Assert.Equal(StatusCodes.Status404NotFound, error.StatusCode);
        }
    }

    [PostgreSqlReferenceFact]
    public async Task QuotePdfRejectsRevokedDepartmentAndOrganizationMemberships()
    {
        await using var scope = await Scope.Create();
        var access = scope.UseOrdinaryMember();
        var order = scope.AddOrder(scope.General);
        var quote = scope.AddQuote(order, QuoteStatus.Issued);
        await scope.Db.SaveChangesAsync();
        var controller = scope.QuoteController();
        Assert.Equal("application/pdf", (await controller.GetQuotePdf(order.Id, quote.Id, default)).ContentType);

        access.Deactivate();
        await scope.Db.SaveChangesAsync();
        var departmentError = await Assert.ThrowsAsync<OrderManagementException>(() => controller.GetQuotePdf(order.Id, quote.Id, default));
        Assert.Equal(StatusCodes.Status404NotFound, departmentError.StatusCode);

        access.Reactivate();
        scope.AdminMembership.Deactivate();
        await scope.Db.SaveChangesAsync();
        var organizationError = await Assert.ThrowsAsync<OrderManagementException>(() => controller.GetQuotePdf(order.Id, quote.Id, default));
        Assert.Equal(StatusCodes.Status404NotFound, organizationError.StatusCode);
        Assert.False(scope.Db.ChangeTracker.HasChanges());
    }

    [PostgreSqlReferenceFact]
    public async Task InactiveOrganizationCannotBeManagedThroughDepartmentAdminAssignment()
    {
        await using var scope = await Scope.Create();
        scope.AdminMembership.SetOrganizationAdmin(false);
        scope.Db.Add(new OrganizationDepartmentMembership(scope.AdminMembership.Id, scope.Research.Id, true));
        scope.Organization.Deactivate();
        await scope.Db.SaveChangesAsync();
        Assert.IsType<ForbidHttpResult>(await DepartmentEndpoints.ListDepartmentMembers(scope.Organization.Id,
            scope.Research.Id, scope.Http, scope.Db, scope.Identity, default));
    }

    [PostgreSqlReferenceFact]
    public async Task InactiveDepartmentCannotAuthorizeOrdering()
    {
        await using var scope = await Scope.Create();
        scope.Research.Deactivate();
        await scope.Db.SaveChangesAsync();
        var error = await Assert.ThrowsAsync<OrderManagementException>(() => LabServiceOrderingEligibility.RequireAsync(
            scope.Db, scope.Organization.Id, DateTime.UtcNow, default, scope.Research.Id));
        Assert.Equal("customer_department_not_available", error.ErrorCode);
    }

    [PostgreSqlReferenceFact]
    public async Task MissingInvitationIntentCannotGrantGeneralAccess()
    {
        await using var scope = await Scope.Create();
        var invitation = new OrganizationInvitation(scope.Organization.Id, $"invite-{Guid.NewGuid():N}@example.com",
            "Invited", "Person", false, Guid.NewGuid().ToString("N"), DateTime.UtcNow.AddDays(1));
        scope.Db.Add(invitation);
        await scope.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<BadRequestException>(() => InvitationEndpoints.ValidateDepartmentIntentAsync(scope.Db, invitation, default));
        Assert.False(await scope.Db.OrganizationInvitationDepartments.AnyAsync(value => value.OrganizationInvitationId == invitation.Id));
    }

    private sealed class Scope(PSeqOperationsDbContext db, IDbContextTransaction transaction) : IAsyncDisposable
    {
        public PSeqOperationsDbContext Db => db;
        public Organization Organization { get; } = new($"Department review {Guid.NewGuid():N}", OrganizationKind.Customer);
        public OrganizationDepartment General => Organization.Departments.Single(value => value.Code == OrganizationDepartment.DefaultCode);
        public OrganizationDepartment Research { get; private set; } = null!;
        public User Actor { get; private set; } = null!;
        public OrganizationMembership AdminMembership { get; private set; } = null!;
        public DefaultHttpContext Http { get; } = new();
        public IExternalIdentityContext Identity { get; private set; } = null!;
        public OrderRequestContext Context => new(db, Identity);

        public static async Task<Scope> Create()
        {
            var connection = Environment.GetEnvironmentVariable("PSEQ_OPERATIONS_REFERENCE_CONNECTION")!;
            var options = new DbContextOptionsBuilder<PSeqOperationsDbContext>().UseNpgsql(connection)
                .AddInterceptors(new AuditSaveChangesInterceptor(new AuditContext())).Options;
            var db = new PSeqOperationsDbContext(options, Options.Create(new PersistenceOptions()));
            var scope = new Scope(db, await db.Database.BeginTransactionAsync());
            var external = new ExternalIdentity("test", Guid.NewGuid().ToString("N"), $"review-{Guid.NewGuid():N}@example.com", true);
            scope.Actor = new User(external.Email, "Department", "Administrator");
            scope.Actor.LinkExternalIdentity(external.Provider, external.SubjectId);
            scope.Actor.Activate();
            scope.Identity = new IdentityContext(external);
            scope.AdminMembership = new(scope.Actor.Id, scope.Organization.Id, true);
            scope.Research = new(scope.Organization.Id, "RESEARCH", "Research");
            db.AddRange(scope.Organization, scope.Actor, scope.AdminMembership, scope.Research);
            await db.SaveChangesAsync();
            scope.Http.Request.Headers["X-Organization-Id"] = scope.Organization.Id.ToString();
            scope.Http.Request.Headers["X-Department-Id"] = scope.General.Id.ToString();
            return scope;
        }

        public OrganizationDepartmentMembership AddMember(OrganizationDepartment department, bool admin)
        {
            var user = new User($"member-{Guid.NewGuid():N}@example.com", "Department", "Member");
            user.Activate();
            var membership = new OrganizationMembership(user.Id, Organization.Id, false);
            var assignment = new OrganizationDepartmentMembership(membership.Id, department.Id, admin);
            db.AddRange(user, membership, assignment);
            return assignment;
        }

        public LabServiceOrder AddOrder(OrganizationDepartment department, int requestedSpecimenCount = 1)
        {
            var order = new LabServiceOrder(Organization.Id, department.Id, $"TEST-{Guid.NewGuid():N}",
                $"Review {Guid.NewGuid():N}", null, requestedSpecimenCount, false, "RNA", "Frozen", "No hazard", "Test instructions");
            db.Add(order);
            return order;
        }

        public OrganizationDepartmentMembership UseOrdinaryMember()
        {
            AdminMembership.SetOrganizationAdmin(false);
            var access = new OrganizationDepartmentMembership(AdminMembership.Id, General.Id, false);
            db.Add(access);
            return access;
        }

        public LabServiceQuote AddQuote(LabServiceOrder order, QuoteStatus status,
            Guid? catalogItemId = null, string? internalNote = null, int revision = 1)
        {
            var now = DateTime.UtcNow;
            var lines = JsonSerializer.Serialize(new[] { new {
                description = "PSeq Lab Service", quantity = 9, unitPrice = 100,
                catalogItemId = catalogItemId ?? Guid.NewGuid(), externalItemId = "private-catalog-reference", internalNote
            } });
            var quote = new LabServiceQuote(order.Id, revision, QuotePurpose.Initial, lines, 900, 0, "USD", now, now.AddDays(30));
            quote.RecordPricingDecision(1, 90, 100, internalNote ?? "Private pricing decision", Actor.Id, now);
            db.Add(quote);
            // Seed persisted lifecycle states without exercising the separate pricing/acceptance workflow.
            db.Entry(quote).Property(value => value.Status).CurrentValue = status;
            return quote;
        }

        public LabServiceOrdersController QuoteController() => new(db, Context, null!, null!,
            Options.Create(new PSeqOrderToCashOptions()), null!, null!, null!, null!, null!)
            { ControllerContext = new() { HttpContext = Http } };

        public Invoice AddInvoice(OrganizationDepartment department)
        {
            var order = AddOrder(department);
            var now = DateTime.UtcNow;
            var quote = new LabServiceQuote(order.Id, 1, QuotePurpose.Initial, "[]", 100, 0, "USD", now, now.AddDays(7));
            var invoice = new Invoice(Organization.Id, order.Id, quote.Id, $"INV-{Guid.NewGuid():N}",
                DateOnly.FromDateTime(now), 30, "{}", "{}", "{}", 100, 0, "test.pdf", new string('A', 64), Actor.Id, now);
            db.AddRange(quote, invoice);
            return invoice;
        }

        public async ValueTask DisposeAsync()
        {
            await transaction.RollbackAsync();
            await transaction.DisposeAsync();
            await db.DisposeAsync();
        }
    }

    private sealed class IdentityContext(ExternalIdentity identity) : IExternalIdentityContext
    { public ExternalIdentity? Read(HttpContext context) => identity; }
    private sealed class AuditContext : ICurrentUserContext
    { public Guid? UserId => null; public Guid? OrganizationId => null; public string? RequestId => "department-review"; }
    private sealed class RecordingStorage : IOperationalFileStorage
    {
        public int ReadCount { get; private set; }
        public Task<Stream> OpenReadAsync(string key, CancellationToken token) { ReadCount++; return Task.FromResult<Stream>(new MemoryStream()); }
        public Task<StoredOperationalFile> SaveAsync(Stream content, string extension, long maximumBytes, CancellationToken token) => throw new NotSupportedException();
        public Task DeleteIfExistsAsync(string key, CancellationToken token) => throw new NotSupportedException();
    }
}
