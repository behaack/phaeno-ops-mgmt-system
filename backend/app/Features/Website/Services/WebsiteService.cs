using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.Website.DTOs;
using PhaenoPortal.App.Features.Website.Entities;
using PhaenoPortal.App.Infrastructure.Persistence;

namespace PhaenoPortal.App.Features.Website.Services;

public sealed class WebsiteService(
    PSeqOperationsDbContext dbContext,
    IWebsiteRecaptchaVerifier recaptchaVerifier)
{
    public Task PingDatabaseAsync(CancellationToken cancellationToken = default) =>
        dbContext.Database.ExecuteSqlRawAsync("SELECT 1", cancellationToken);

    public async Task CreateContactAsync(
        WebContactRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!await recaptchaVerifier.VerifyAsync(
                request.RecaptchaCode,
                request.RecaptchaAction,
                cancellationToken))
        {
            throw new WebsiteRecaptchaRejectedException();
        }

        var normalizedEmail = NormalizeEmail(request.WebContact.Email);
        if (await dbContext.WebContacts
            .AsNoTracking()
            .AnyAsync(
                contact => contact.NormalizedEmail == normalizedEmail,
                cancellationToken))
        {
            throw new WebsiteContactAlreadyExistsException();
        }

        var contact = new WebContact
        {
            Id = Guid.NewGuid(),
            FirstName = request.WebContact.FirstName.Trim(),
            LastName = request.WebContact.LastName.Trim(),
            OrganizationName = request.WebContact.OrganizationName.Trim(),
            Email = request.WebContact.Email.Trim().ToLowerInvariant(),
            NormalizedEmail = normalizedEmail,
            SendBrochure = request.WebContact.SendBrochure ?? false,
            CreatedAtUtc = DateTimeOffset.UtcNow
        };
        dbContext.WebContacts.Add(contact);
        dbContext.Add(new WebNotificationDelivery { WebContactId = contact.Id, Kind = WebNotificationKind.MailingListAlert });
        if (contact.SendBrochure == true)
            dbContext.Add(new WebNotificationDelivery { WebContactId = contact.Id, Kind = WebNotificationKind.TechnicalBrief });

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            if (await dbContext.WebContacts
                .AsNoTracking()
                .AnyAsync(
                    existing => existing.NormalizedEmail == normalizedEmail,
                    cancellationToken))
            {
                throw new WebsiteContactAlreadyExistsException();
            }

            throw;
        }

    }

    public async Task CreateOrderAsync(
        WebOrderRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!await recaptchaVerifier.VerifyAsync(
                request.RecaptchaCode,
                request.RecaptchaAction,
                cancellationToken))
        {
            throw new WebsiteRecaptchaRejectedException();
        }

        var order = new WebOrder
        {
            Id = Guid.NewGuid(),
            FirstName = request.WebOrder.FirstName.Trim(),
            LastName = request.WebOrder.LastName.Trim(),
            OrganizationName = request.WebOrder.OrganizationName.Trim(),
            Email = request.WebOrder.Email.Trim().ToUpperInvariant().Normalize(),
            Description = request.WebOrder.Description.Trim()
        };
        dbContext.WebOrders.Add(order);
        dbContext.Add(new WebNotificationDelivery { WebOrderId = order.Id, Kind = WebNotificationKind.DemoRequestAlert });
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static string NormalizeEmail(string email) =>
        email.Trim().ToUpperInvariant().Normalize();
}
