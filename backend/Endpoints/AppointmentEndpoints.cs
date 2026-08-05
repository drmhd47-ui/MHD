using Microsoft.EntityFrameworkCore;
using MHD.Api.Data;
using MHD.Api.Domain;
using MHD.Api.Security;

namespace MHD.Api.Endpoints;

public static class AppointmentEndpoints
{
    public static void MapAppointmentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/appointments").RequireAuthorization().WithTags("Appointments");

        group.MapGet("/", List);
        group.MapGet("/{id:guid}", Get);
        group.MapPost("/", Create);
        group.MapPut("/{id:guid}", Update);
        group.MapPost("/{id:guid}/cancel", Cancel);
    }

    private record AppointmentRequest(
        string Title, AppointmentType Type, Guid? CaseId, DateTimeOffset StartAt, DateTimeOffset? EndAt,
        string? Location, string? Notes, int? ReminderMinutesBefore, Guid? AssignedUserId);

    private static string ClientIp(HttpContext http) => http.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    private static string ActorName(HttpContext http) => http.User.Identity?.Name ?? "";

    private static async Task<IResult> List(AppDbContext db, DateTimeOffset? from, DateTimeOffset? to, Guid? caseId, bool includeCancelled = false)
    {
        var query = db.Appointments.Include(a => a.Case).Include(a => a.AssignedUser).AsQueryable();
        if (!includeCancelled) query = query.Where(a => !a.IsCancelled);
        if (from is not null) query = query.Where(a => a.StartAt >= from);
        if (to is not null) query = query.Where(a => a.StartAt <= to);
        if (caseId is not null) query = query.Where(a => a.CaseId == caseId);

        var items = await query.OrderBy(a => a.StartAt).ToListAsync();
        return Results.Ok(items);
    }

    private static async Task<IResult> Get(Guid id, AppDbContext db)
    {
        var item = await db.Appointments.Include(a => a.Case).Include(a => a.AssignedUser).FirstOrDefaultAsync(a => a.Id == id);
        return item is null ? Results.NotFound() : Results.Ok(item);
    }

    private static async Task<IResult> Create(AppointmentRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        if (string.IsNullOrWhiteSpace(req.Title))
            return Results.BadRequest(new { message = "عنوان الموعد مطلوب" });

        if (req.CaseId is not null && !await db.Cases.AnyAsync(c => c.Id == req.CaseId))
            return Results.BadRequest(new { message = "القضية غير موجودة" });

        var userId = JwtTokenService.GetUserId(http.User)!.Value;
        var entity = new Appointment
        {
            Title = req.Title.Trim(),
            Type = req.Type,
            CaseId = req.CaseId,
            StartAt = req.StartAt,
            EndAt = req.EndAt,
            Location = req.Location,
            Notes = req.Notes,
            ReminderMinutesBefore = req.ReminderMinutesBefore,
            AssignedUserId = req.AssignedUserId ?? userId,
            CreatedByUserId = userId
        };
        db.Appointments.Add(entity);
        await db.SaveChangesAsync();

        await audit.LogAsync(userId, ActorName(http), "APPOINTMENT_CREATED", "Appointment", entity.Id.ToString(), ClientIp(http));
        return Results.Created($"/api/appointments/{entity.Id}", entity);
    }

    private static async Task<IResult> Update(Guid id, AppointmentRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var entity = await db.Appointments.FindAsync(id);
        if (entity is null) return Results.NotFound();

        if (string.IsNullOrWhiteSpace(req.Title))
            return Results.BadRequest(new { message = "عنوان الموعد مطلوب" });

        if (req.CaseId is not null && !await db.Cases.AnyAsync(c => c.Id == req.CaseId))
            return Results.BadRequest(new { message = "القضية غير موجودة" });

        entity.Title = req.Title.Trim();
        entity.Type = req.Type;
        entity.CaseId = req.CaseId;
        entity.StartAt = req.StartAt;
        entity.EndAt = req.EndAt;
        entity.Location = req.Location;
        entity.Notes = req.Notes;
        entity.ReminderMinutesBefore = req.ReminderMinutesBefore;
        if (req.AssignedUserId is not null) entity.AssignedUserId = req.AssignedUserId.Value;
        await db.SaveChangesAsync();

        var userId = JwtTokenService.GetUserId(http.User);
        await audit.LogAsync(userId, ActorName(http), "APPOINTMENT_UPDATED", "Appointment", entity.Id.ToString(), ClientIp(http));
        return Results.Ok(entity);
    }

    private static async Task<IResult> Cancel(Guid id, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var entity = await db.Appointments.FindAsync(id);
        if (entity is null) return Results.NotFound();

        entity.IsCancelled = true;
        await db.SaveChangesAsync();

        var userId = JwtTokenService.GetUserId(http.User);
        await audit.LogAsync(userId, ActorName(http), "APPOINTMENT_CANCELLED", "Appointment", entity.Id.ToString(), ClientIp(http));
        return Results.Ok(entity);
    }
}
