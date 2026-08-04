using Microsoft.EntityFrameworkCore;
using MHD.Api.Data;
using MHD.Api.Domain;
using MHD.Api.Security;

namespace MHD.Api.Endpoints;

public static class CaseEndpoints
{
    public static void MapCaseEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/cases").RequireAuthorization().WithTags("Cases");

        group.MapGet("/", List);
        group.MapGet("/{id:guid}", Get);
        group.MapPost("/", Create);
        group.MapPut("/{id:guid}", Update);
        group.MapPost("/{id:guid}/close", Close);
        group.MapPost("/{id:guid}/archive", Archive);

        // الحذف النهائي أداة سيطرة على النظام لا وظيفة عمل — حكر على المدير، بخلاف الأرشفة المتاحة للمحامين.
        group.MapDelete("/{id:guid}", PermanentDelete).RequireAuthorization("ManagerOnly");
    }

    private record CaseRequest(string Title, Guid ClientId, string? OpposingPartyName, string? CaseType, string? Court, DateOnly OpenedDate, Guid? AssignedLawyerId, string? Description);

    private static string ClientIp(HttpContext http) => http.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    private static string ActorName(HttpContext http) => http.User.Identity?.Name ?? "";

    private static async Task<IResult> List(AppDbContext db, string? q, CaseStatus? status)
    {
        var query = db.Cases.Include(c => c.Client).AsQueryable();
        if (status is not null) query = query.Where(c => c.Status == status);
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(c => c.Title.Contains(q) || c.CaseNumber.Contains(q) || c.Client.FullName.Contains(q));

        var items = await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
        return Results.Ok(items);
    }

    private static async Task<IResult> Get(Guid id, AppDbContext db)
    {
        var item = await db.Cases.Include(c => c.Client).Include(c => c.AssignedLawyer).FirstOrDefaultAsync(c => c.Id == id);
        return item is null ? Results.NotFound() : Results.Ok(item);
    }

    private static async Task<IResult> Create(CaseRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        if (string.IsNullOrWhiteSpace(req.Title))
            return Results.BadRequest(new { message = "موضوع القضية مطلوب" });

        var clientExists = await db.Clients.AnyAsync(c => c.Id == req.ClientId);
        if (!clientExists) return Results.BadRequest(new { message = "العميل غير موجود" });

        var userId = JwtTokenService.GetUserId(http.User)!.Value;

        // رقم القضية له فهرس فريد؛ في حال تصادم نادر بين طلبين متزامنين على نفس السنة نعيد المحاولة
        // برقم تالٍ بدل إفشال الطلب بخطأ 500 غير مفهوم للمستخدم.
        const int maxAttempts = 5;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            var entity = new Case
            {
                CaseNumber = await GenerateCaseNumber(db),
                Title = req.Title.Trim(),
                ClientId = req.ClientId,
                OpposingPartyName = req.OpposingPartyName,
                CaseType = req.CaseType,
                Court = req.Court,
                OpenedDate = req.OpenedDate,
                AssignedLawyerId = req.AssignedLawyerId ?? userId,
                Description = req.Description,
                CreatedByUserId = userId
            };

            db.Cases.Add(entity);
            try
            {
                await db.SaveChangesAsync();
                await audit.LogAsync(userId, ActorName(http), "CASE_CREATED", "Case", entity.Id.ToString(), ClientIp(http));
                return Results.Created($"/api/cases/{entity.Id}", entity);
            }
            catch (DbUpdateException) when (attempt < maxAttempts)
            {
                db.Entry(entity).State = EntityState.Detached;
            }
        }

        return Results.Json(new { message = "تعذّر إنشاء رقم قضية فريد، حاول من جديد" }, statusCode: 409);
    }

    private static async Task<string> GenerateCaseNumber(AppDbContext db)
    {
        var year = DateTime.UtcNow.Year;
        var countThisYear = await db.Cases.CountAsync(c => c.CreatedAt.Year == year);
        return $"C-{year}-{countThisYear + 1:D4}";
    }

    private static async Task<IResult> Update(Guid id, CaseRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var entity = await db.Cases.FindAsync(id);
        if (entity is null) return Results.NotFound();

        if (string.IsNullOrWhiteSpace(req.Title))
            return Results.BadRequest(new { message = "موضوع القضية مطلوب" });

        var clientExists = await db.Clients.AnyAsync(c => c.Id == req.ClientId);
        if (!clientExists) return Results.BadRequest(new { message = "العميل غير موجود" });

        entity.Title = req.Title.Trim();
        entity.ClientId = req.ClientId;
        entity.OpposingPartyName = req.OpposingPartyName;
        entity.CaseType = req.CaseType;
        entity.Court = req.Court;
        entity.OpenedDate = req.OpenedDate;
        if (req.AssignedLawyerId is not null) entity.AssignedLawyerId = req.AssignedLawyerId.Value;
        entity.Description = req.Description;
        await db.SaveChangesAsync();

        var userId = JwtTokenService.GetUserId(http.User);
        await audit.LogAsync(userId, ActorName(http), "CASE_UPDATED", "Case", entity.Id.ToString(), ClientIp(http));
        return Results.Ok(entity);
    }

    private static async Task<IResult> Close(Guid id, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var entity = await db.Cases.FindAsync(id);
        if (entity is null) return Results.NotFound();

        entity.Status = CaseStatus.Closed;
        entity.ClosedDate = DateOnly.FromDateTime(DateTime.UtcNow);
        await db.SaveChangesAsync();

        var userId = JwtTokenService.GetUserId(http.User);
        await audit.LogAsync(userId, ActorName(http), "CASE_CLOSED", "Case", entity.Id.ToString(), ClientIp(http));
        return Results.Ok(entity);
    }

    private static async Task<IResult> Archive(Guid id, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var entity = await db.Cases.FindAsync(id);
        if (entity is null) return Results.NotFound();

        entity.Status = CaseStatus.Archived;
        await db.SaveChangesAsync();

        var userId = JwtTokenService.GetUserId(http.User);
        await audit.LogAsync(userId, ActorName(http), "CASE_ARCHIVED", "Case", entity.Id.ToString(), ClientIp(http));
        return Results.Ok(entity);
    }

    private static async Task<IResult> PermanentDelete(Guid id, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var entity = await db.Cases.FindAsync(id);
        if (entity is null) return Results.NotFound();

        db.Cases.Remove(entity);
        await db.SaveChangesAsync();

        var userId = JwtTokenService.GetUserId(http.User);
        await audit.LogAsync(userId, ActorName(http), "CASE_DELETED_PERMANENT", "Case", id.ToString(), ClientIp(http));
        return Results.NoContent();
    }
}
