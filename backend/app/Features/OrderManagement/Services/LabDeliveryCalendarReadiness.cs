namespace PhaenoPortal.App.Features.OrderManagement.Services;

using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public static class LabDeliveryCalendarReadiness
{
    public static async Task<bool> HasCoverageAsync(PSeqOperationsDbContext db, int businessDays,
        CancellationToken cancellationToken)
    {
        var calendar = await db.Set<LabBusinessCalendar>().AsNoTracking()
            .Include(item => item.Holidays).OrderByDescending(item => item.Revision)
            .FirstOrDefaultAsync(cancellationToken);
        if (calendar is null) return false;
        try
        {
            _ = LabForecastClock.AddDays(DateTime.UtcNow, businessDays,
                LabDayBasis.Business, calendar);
            return true;
        }
        catch (LabForecastCalendarException)
        {
            return false;
        }
    }
}
