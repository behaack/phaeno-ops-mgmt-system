namespace PhaenoPortal.App.Infrastructure.Api;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.OrderManagement.DTOs;

public static class RecordPage
{
    public static async Task<PagedResult<T>> ReadAsync<T>(IQueryable<T> query, int page, int pageSize, CancellationToken token)
    {
        page = Math.Clamp(page, 1, 100000);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var count = await query.CountAsync(token);
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(token);
        return new(items, page, pageSize, count);
    }
}
