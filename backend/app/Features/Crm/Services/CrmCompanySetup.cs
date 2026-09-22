namespace PhaenoPortal.App.Features.Crm.Services;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Infrastructure.Persistence;

public static class CrmCompanySetup
{
    // Call inside the transaction that saves department setup or access approval.
    public static Task LockAsync(PSeqOperationsDbContext db, Guid companyId, CancellationToken token)
    {
        var key = $"crm-company-setup:{companyId:D}";
        return db.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT pg_advisory_xact_lock(hashtextextended({key}, 0))", token);
    }
}
