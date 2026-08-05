using Microsoft.EntityFrameworkCore;
using MHD.Api.Data;
using MHD.Api.Domain;
using MHD.Api.Security;

namespace MHD.Api.Endpoints;

/// <summary>ساعات العمل لكل قضية — يسجّلها أي محامٍ لنفسه، وتُستخدم لاحقاً كمصدر لبنود الفاتورة.</summary>
public static class TimeEntryEndpoints
{
    public static void MapTimeEntryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/time-entries").RequireAuthorization().WithTags("TimeEntries");

        group.MapGet("/", List);
        group.MapPost("/", Create);
        group.MapPut("/{id:guid}", Update);
        group.MapDelete("/{id:guid}", Delete);
    }

    private record TimeEntryRequest(Guid CaseId, DateOnly WorkDate, decimal Hours, string Description);

    private static string ClientIp(HttpContext http) => http.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    private static string ActorName(HttpContext http) => http.User.Identity?.Name ?? "";

    private static async Task<IResult> List(AppDbContext db, Guid? caseId, bool? billed)
    {
        var query = db.TimeEntries.Include(t => t.Case).Include(t => t.Lawyer).AsQueryable();
        if (caseId is not null) query = query.Where(t => t.CaseId == caseId);
        if (billed is not null) query = query.Where(t => t.IsBilled == billed);

        var items = await query.OrderByDescending(t => t.WorkDate).ToListAsync();
        return Results.Ok(items);
    }

    private static async Task<IResult> Create(TimeEntryRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        if (req.Hours <= 0)
            return Results.BadRequest(new { message = "عدد الساعات يجب أن يكون أكبر من صفر" });

        if (string.IsNullOrWhiteSpace(req.Description))
            return Results.BadRequest(new { message = "وصف العمل مطلوب" });

        if (!await db.Cases.AnyAsync(c => c.Id == req.CaseId))
            return Results.BadRequest(new { message = "القضية غير موجودة" });

        var userId = JwtTokenService.GetUserId(http.User)!.Value;
        var entity = new TimeEntry
        {
            CaseId = req.CaseId,
            LawyerId = userId,
            WorkDate = req.WorkDate,
            Hours = req.Hours,
            Description = req.Description.Trim()
        };
        db.TimeEntries.Add(entity);
        await db.SaveChangesAsync();

        await audit.LogAsync(userId, ActorName(http), "TIME_ENTRY_CREATED", "TimeEntry", entity.Id.ToString(), ClientIp(http));
        return Results.Created($"/api/time-entries/{entity.Id}", entity);
    }

    private static async Task<IResult> Update(Guid id, TimeEntryRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var entity = await db.TimeEntries.FindAsync(id);
        if (entity is null) return Results.NotFound();

        if (entity.IsBilled)
            return Results.BadRequest(new { message = "لا يمكن تعديل ساعات عمل أُدرجت في فاتورة" });

        if (req.Hours <= 0)
            return Results.BadRequest(new { message = "عدد الساعات يجب أن يكون أكبر من صفر" });

        if (string.IsNullOrWhiteSpace(req.Description))
            return Results.BadRequest(new { message = "وصف العمل مطلوب" });

        if (!await db.Cases.AnyAsync(c => c.Id == req.CaseId))
            return Results.BadRequest(new { message = "القضية غير موجودة" });

        entity.CaseId = req.CaseId;
        entity.WorkDate = req.WorkDate;
        entity.Hours = req.Hours;
        entity.Description = req.Description.Trim();
        await db.SaveChangesAsync();

        var userId = JwtTokenService.GetUserId(http.User);
        await audit.LogAsync(userId, ActorName(http), "TIME_ENTRY_UPDATED", "TimeEntry", entity.Id.ToString(), ClientIp(http));
        return Results.Ok(entity);
    }

    private static async Task<IResult> Delete(Guid id, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var entity = await db.TimeEntries.FindAsync(id);
        if (entity is null) return Results.NotFound();

        if (entity.IsBilled)
            return Results.BadRequest(new { message = "لا يمكن حذف ساعات عمل أُدرجت في فاتورة" });

        db.TimeEntries.Remove(entity);
        await db.SaveChangesAsync();

        var userId = JwtTokenService.GetUserId(http.User);
        await audit.LogAsync(userId, ActorName(http), "TIME_ENTRY_DELETED", "TimeEntry", id.ToString(), ClientIp(http));
        return Results.NoContent();
    }
}
