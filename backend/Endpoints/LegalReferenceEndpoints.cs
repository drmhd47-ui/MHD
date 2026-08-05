using Microsoft.EntityFrameworkCore;
using MHD.Api.Data;
using MHD.Api.Domain;
using MHD.Api.Security;

namespace MHD.Api.Endpoints;

/// <summary>الأرشيف القانوني للأنظمة واللوائح والقرارات — مرجع بحث داخلي مشترك بين المدير والمحامين.</summary>
public static class LegalReferenceEndpoints
{
    public static void MapLegalReferenceEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/legal-references").RequireAuthorization().WithTags("LegalReferences");

        group.MapGet("/", List);
        group.MapGet("/{id:guid}", Get);
        group.MapPost("/", Create);
        group.MapPut("/{id:guid}", Update);
        group.MapDelete("/{id:guid}", Delete);
    }

    private record LegalReferenceRequest(
        string Title, LegalReferenceType Type, string? IssuingAuthority, DateOnly? IssueDate,
        string? ReferenceNumber, string? Summary, string? SourceUrl);

    private static string ClientIp(HttpContext http) => http.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    private static string ActorName(HttpContext http) => http.User.Identity?.Name ?? "";

    private static async Task<IResult> List(AppDbContext db, string? q, LegalReferenceType? type)
    {
        var query = db.LegalReferences.AsQueryable();
        if (type is not null) query = query.Where(l => l.Type == type);
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(l => l.Title.Contains(q) || (l.Summary != null && l.Summary.Contains(q)) || (l.ReferenceNumber != null && l.ReferenceNumber.Contains(q)));

        var items = await query.OrderByDescending(l => l.CreatedAt).ToListAsync();
        return Results.Ok(items);
    }

    private static async Task<IResult> Get(Guid id, AppDbContext db)
    {
        var item = await db.LegalReferences.FindAsync(id);
        return item is null ? Results.NotFound() : Results.Ok(item);
    }

    private static async Task<IResult> Create(LegalReferenceRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        if (string.IsNullOrWhiteSpace(req.Title))
            return Results.BadRequest(new { message = "العنوان مطلوب" });

        var userId = JwtTokenService.GetUserId(http.User)!.Value;
        var entity = new LegalReference
        {
            Title = req.Title.Trim(),
            Type = req.Type,
            IssuingAuthority = req.IssuingAuthority,
            IssueDate = req.IssueDate,
            ReferenceNumber = req.ReferenceNumber,
            Summary = req.Summary,
            SourceUrl = req.SourceUrl,
            CreatedByUserId = userId
        };
        db.LegalReferences.Add(entity);
        await db.SaveChangesAsync();

        await audit.LogAsync(userId, ActorName(http), "LEGAL_REFERENCE_CREATED", "LegalReference", entity.Id.ToString(), ClientIp(http));
        return Results.Created($"/api/legal-references/{entity.Id}", entity);
    }

    private static async Task<IResult> Update(Guid id, LegalReferenceRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var entity = await db.LegalReferences.FindAsync(id);
        if (entity is null) return Results.NotFound();

        if (string.IsNullOrWhiteSpace(req.Title))
            return Results.BadRequest(new { message = "العنوان مطلوب" });

        entity.Title = req.Title.Trim();
        entity.Type = req.Type;
        entity.IssuingAuthority = req.IssuingAuthority;
        entity.IssueDate = req.IssueDate;
        entity.ReferenceNumber = req.ReferenceNumber;
        entity.Summary = req.Summary;
        entity.SourceUrl = req.SourceUrl;
        await db.SaveChangesAsync();

        var userId = JwtTokenService.GetUserId(http.User);
        await audit.LogAsync(userId, ActorName(http), "LEGAL_REFERENCE_UPDATED", "LegalReference", entity.Id.ToString(), ClientIp(http));
        return Results.Ok(entity);
    }

    private static async Task<IResult> Delete(Guid id, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var entity = await db.LegalReferences.FindAsync(id);
        if (entity is null) return Results.NotFound();

        db.LegalReferences.Remove(entity);
        await db.SaveChangesAsync();

        var userId = JwtTokenService.GetUserId(http.User);
        await audit.LogAsync(userId, ActorName(http), "LEGAL_REFERENCE_DELETED", "LegalReference", id.ToString(), ClientIp(http));
        return Results.NoContent();
    }
}
