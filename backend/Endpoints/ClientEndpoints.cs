using Microsoft.EntityFrameworkCore;
using MHD.Api.Data;
using MHD.Api.Domain;
using MHD.Api.Security;

namespace MHD.Api.Endpoints;

public static class ClientEndpoints
{
    public static void MapClientEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/clients").RequireAuthorization().WithTags("Clients");

        group.MapGet("/", List);
        group.MapGet("/conflict-check", ConflictCheck);
        group.MapGet("/{id:guid}", Get);
        group.MapPost("/", Create);
        group.MapPut("/{id:guid}", Update);
        group.MapPost("/{id:guid}/archive", Archive);
    }

    private record ClientRequest(ClientType Type, string FullName, string? NationalIdOrCr, string? Phone, string? Email, string? Address, string? Notes);

    private static string ClientIp(HttpContext http) => http.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    private static string ActorName(HttpContext http) => http.User.Identity?.Name ?? "";

    private static async Task<IResult> List(AppDbContext db, string? q, bool includeArchived = false)
    {
        var query = db.Clients.AsQueryable();
        if (!includeArchived) query = query.Where(c => !c.IsArchived);
        if (!string.IsNullOrWhiteSpace(q)) query = query.Where(c => c.FullName.Contains(q));

        var items = await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
        return Results.Ok(items);
    }

    /// <summary>فحص تعارض المصالح: يبحث في العملاء الحاليين وفي أسماء الأطراف المقابلة بالقضايا القائمة.</summary>
    private static async Task<IResult> ConflictCheck(string? q, AppDbContext db)
    {
        var term = (q ?? "").Trim();
        if (term.Length < 3)
            return Results.Ok(new { matches = Array.Empty<object>(), hasConflict = false });

        var clientMatches = await db.Clients
            .Where(c => c.FullName.Contains(term) || (c.NationalIdOrCr != null && c.NationalIdOrCr.Contains(term)))
            .Select(c => new { c.Id, c.FullName, Reason = "عميل حالي للمكتب" })
            .ToListAsync();

        var opposingMatches = await db.Cases
            .Where(c => c.OpposingPartyName != null && c.OpposingPartyName.Contains(term))
            .Select(c => new { c.Id, FullName = c.OpposingPartyName!, Reason = "طرف مقابل في قضية قائمة: " + c.CaseNumber })
            .ToListAsync();

        var matches = clientMatches.Cast<object>().Concat(opposingMatches.Cast<object>()).ToList();
        return Results.Ok(new { matches, hasConflict = matches.Count > 0 });
    }

    private static async Task<IResult> Get(Guid id, AppDbContext db)
    {
        var client = await db.Clients.Include(c => c.Cases).FirstOrDefaultAsync(c => c.Id == id);
        return client is null ? Results.NotFound() : Results.Ok(client);
    }

    private static async Task<IResult> Create(ClientRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        if (string.IsNullOrWhiteSpace(req.FullName))
            return Results.BadRequest(new { message = "الاسم مطلوب" });

        var userId = JwtTokenService.GetUserId(http.User)!.Value;
        var client = new Client
        {
            Type = req.Type,
            FullName = req.FullName.Trim(),
            NationalIdOrCr = req.NationalIdOrCr,
            Phone = req.Phone,
            Email = req.Email,
            Address = req.Address,
            Notes = req.Notes,
            CreatedByUserId = userId
        };
        db.Clients.Add(client);
        await db.SaveChangesAsync();

        await audit.LogAsync(userId, ActorName(http), "CLIENT_CREATED", "Client", client.Id.ToString(), ClientIp(http));
        return Results.Created($"/api/clients/{client.Id}", client);
    }

    private static async Task<IResult> Update(Guid id, ClientRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var client = await db.Clients.FindAsync(id);
        if (client is null) return Results.NotFound();

        if (string.IsNullOrWhiteSpace(req.FullName))
            return Results.BadRequest(new { message = "الاسم مطلوب" });

        client.Type = req.Type;
        client.FullName = req.FullName.Trim();
        client.NationalIdOrCr = req.NationalIdOrCr;
        client.Phone = req.Phone;
        client.Email = req.Email;
        client.Address = req.Address;
        client.Notes = req.Notes;
        await db.SaveChangesAsync();

        var userId = JwtTokenService.GetUserId(http.User);
        await audit.LogAsync(userId, ActorName(http), "CLIENT_UPDATED", "Client", client.Id.ToString(), ClientIp(http));
        return Results.Ok(client);
    }

    private static async Task<IResult> Archive(Guid id, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var client = await db.Clients.FindAsync(id);
        if (client is null) return Results.NotFound();

        client.IsArchived = true;
        await db.SaveChangesAsync();

        var userId = JwtTokenService.GetUserId(http.User);
        await audit.LogAsync(userId, ActorName(http), "CLIENT_ARCHIVED", "Client", client.Id.ToString(), ClientIp(http));
        return Results.NoContent();
    }
}
