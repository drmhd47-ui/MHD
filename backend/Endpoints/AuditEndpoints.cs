using Microsoft.EntityFrameworkCore;
using MHD.Api.Data;

namespace MHD.Api.Endpoints;

/// <summary>عرض سجل التدقيق — للقراءة فقط، وحكر على المدير. لا يوجد أي مسار تعديل أو حذف عمداً.</summary>
public static class AuditEndpoints
{
    public static void MapAuditEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/audit-log").RequireAuthorization("ManagerOnly").WithTags("Audit");
        group.MapGet("/", List);
    }

    private static async Task<IResult> List(AppDbContext db, int page = 1, int pageSize = 50)
    {
        pageSize = Math.Clamp(pageSize, 1, 200);
        page = Math.Max(page, 1);

        var total = await db.AuditLogs.CountAsync();
        var items = await db.AuditLogs
            .OrderByDescending(a => a.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Results.Ok(new { total, page, pageSize, items });
    }
}
