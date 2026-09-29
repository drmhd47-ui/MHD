using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using MHD.Api.Data;
using MHD.Api.Domain;
using MHD.Api.Security;
using MHD.Api.Services;

namespace MHD.Api.Endpoints;

/// <summary>
/// طلبات الاستشارة الواردة من الموقع العام.
/// - نقطة استلام داخلية واحدة يستدعيها خادم الاستقبال فقط، موقّعة بسر مشترك (لا JWT ولا جلسة).
/// - شاشات المحامين: مراجعة الطلب، وفحص تعارض المصالح، ثم التحويل إلى عميل أو الاعتذار.
/// لا يتدفق شيء من النظام الداخلي إلى الموقع أو خادم الاستقبال.
/// </summary>
public static partial class IntakeRequestEndpoints
{
    public static void MapIntakeRequestEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/internal/intake-requests", Receive)
            .AllowAnonymous()
            .RequireRateLimiting("intake-internal")
            .WithTags("Intake");

        var group = app.MapGroup("/api/intake-requests").RequireAuthorization().WithTags("Intake");
        group.MapGet("/", List);
        group.MapGet("/summary", Summary);
        group.MapGet("/{id:guid}", Get);
        group.MapPost("/{id:guid}/take", Take);
        group.MapPost("/{id:guid}/convert", Convert);
        group.MapPost("/{id:guid}/decline", Decline);
    }

    private record IntakePayload(
        Guid Id, string Reference, DateTimeOffset SubmittedAt, string Language, string FullName, string PreferredContact,
        string? Phone, string? Email, string? ServiceSlug, string? ServiceTitle, string? OpposingPartyName,
        DateTimeOffset ConsentAt, string PrivacyPolicyVersion);

    private record ConvertRequest(ClientType Type, bool AcknowledgeConflicts, string? ConflictNote);
    private record DeclineRequest(string Reason);

    public record IntakeConflict(string Kind, bool Blocking, string Name, string Detail);

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    [GeneratedRegex(@"^MG-[A-Z2-9]{4}-[A-Z2-9]{4}$")]
    private static partial Regex ReferencePattern();

    [GeneratedRegex(@"^05\d{8}$")]
    private static partial Regex PhonePattern();

    private static string ClientIp(HttpContext http) => http.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    private static string ActorName(HttpContext http) => http.User.Identity?.Name ?? "";

    /// <summary>استلام طلب من خادم الاستقبال بعد التحقق من التوقيع. المعرّف المكرر يعيد 409 فيحذفه الخادم من صندوقه.</summary>
    private static async Task<IResult> Receive(HttpContext http, AppDbContext db, AuditLogger audit, IConfiguration config,
        Notifier notifier, ILoggerFactory loggers)
    {
        var secretB64 = config["Intake:SharedSecret"];
        if (string.IsNullOrWhiteSpace(secretB64))
            return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);

        using var reader = new StreamReader(http.Request.Body, Encoding.UTF8);
        var body = await reader.ReadToEndAsync();
        if (body.Length > 8192) return Results.StatusCode(StatusCodes.Status413PayloadTooLarge);

        byte[] secret;
        try { secret = System.Convert.FromBase64String(secretB64); }
        catch (FormatException) { return Results.StatusCode(StatusCodes.Status503ServiceUnavailable); }

        if (!IntakeSignature.IsValid(secret, http.Request.Headers["X-Intake-Timestamp"], http.Request.Headers["X-Intake-Signature"], body, DateTimeOffset.UtcNow))
        {
            loggers.CreateLogger("Intake").LogWarning("رُفض طلب وارد بتوقيع غير صالح من {Ip}", ClientIp(http));
            return Results.Unauthorized();
        }

        IntakePayload? p;
        try { p = JsonSerializer.Deserialize<IntakePayload>(body, Json); }
        catch (JsonException) { return Results.BadRequest(new { message = "صيغة غير صالحة" }); }

        if (p is null || p.Id == Guid.Empty || !ReferencePattern().IsMatch(p.Reference ?? "")
            || string.IsNullOrWhiteSpace(p.FullName) || p.FullName.Length > 120
            || (p.Phone is not null && !PhonePattern().IsMatch(p.Phone))
            || (p.Email is not null && (p.Email.Length > 160 || !p.Email.Contains('@')))
            || (p.Phone is null && p.Email is null)
            || string.IsNullOrWhiteSpace(p.PrivacyPolicyVersion))
            return Results.BadRequest(new { message = "بيانات الطلب ناقصة أو غير صالحة" });

        if (await db.IntakeRequests.AnyAsync(r => r.Id == p.Id || r.Reference == p.Reference))
            return Results.Conflict();

        var request = new IntakeRequest
        {
            Id = p.Id,
            Reference = p.Reference!,
            SubmittedAt = p.SubmittedAt,
            Language = p.Language == "en" ? "en" : "ar",
            FullName = p.FullName.Trim(),
            PreferredContact = p.PreferredContact == "email" ? PreferredContact.Email : PreferredContact.Phone,
            Phone = p.Phone,
            Email = p.Email,
            ServiceSlug = Truncate(p.ServiceSlug, 80),
            ServiceTitle = Truncate(p.ServiceTitle, 200),
            OpposingPartyName = Truncate(p.OpposingPartyName, 160),
            ConsentAt = p.ConsentAt,
            PrivacyPolicyVersion = Truncate(p.PrivacyPolicyVersion, 20)!
        };
        db.IntakeRequests.Add(request);
        await db.SaveChangesAsync();
        await audit.LogAsync(null, "خادم الاستقبال", "INTAKE_RECEIVED", "IntakeRequest", request.Id.ToString(), ClientIp(http), request.Reference);

        // إشعار المحامي المناوب (أو المديرين) — برقم الطلب فقط، بلا بيانات شخصية.
        var settings = await db.OfficeSettings.AsNoTracking().FirstOrDefaultAsync();
        var recipients = settings?.OnDutyUserId is Guid onDuty
            ? await db.Users.Where(u => u.Id == onDuty && u.IsActive).Select(u => u.Email).ToListAsync()
            : [];
        if (recipients.Count == 0)
            recipients = await db.Users.Where(u => u.Role == UserRole.Manager && u.IsActive).Select(u => u.Email).ToListAsync();

        _ = notifier.SendAsync(recipients,
            $"طلب استشارة جديد من الموقع — {request.Reference}",
            $"ورد طلب استشارة جديد برقم {request.Reference}.\nيُرجى مراجعته وإجراء فحص تعارض المصالح من شاشة \"طلبات الموقع\" في النظام الداخلي.\n\nهذه رسالة آلية ولا تتضمن بيانات مقدم الطلب.");

        return Results.Created($"/api/intake-requests/{request.Id}", new { request.Id });
    }

    private static string? Truncate(string? v, int max) =>
        string.IsNullOrWhiteSpace(v) ? null : (v.Trim().Length <= max ? v.Trim() : v.Trim()[..max]);

    private static async Task<IResult> List(AppDbContext db, IntakeRequestStatus? status)
    {
        var query = db.IntakeRequests.AsNoTracking().AsQueryable();
        if (status is not null) query = query.Where(r => r.Status == status);
        var items = await query
            .OrderByDescending(r => r.SubmittedAt)
            .Select(r => new
            {
                r.Id, r.Reference, r.SubmittedAt, r.FullName, r.ServiceTitle, r.PreferredContact,
                Status = r.Status.ToString(), AssignedUserName = r.AssignedUser != null ? r.AssignedUser.FullName : null
            })
            .Take(500)
            .ToListAsync();
        return Results.Ok(items);
    }

    private static async Task<IResult> Summary(AppDbContext db) =>
        Results.Ok(new { newCount = await db.IntakeRequests.CountAsync(r => r.Status == IntakeRequestStatus.New) });

    /// <summary>
    /// فحص التعارض من الجهتين: مقدم الطلب قد يكون طرفاً مقابلاً في قضية قائمة (تعارض)، أو عميلاً حالياً (للعلم)؛
    /// والطرف الآخر الذي ذكره قد يكون عميلاً حالياً للمكتب (تعارض).
    /// </summary>
    public static async Task<List<IntakeConflict>> ConflictsFor(IntakeRequest r, ConflictChecker checker)
    {
        var result = new List<IntakeConflict>();
        foreach (var m in await checker.CheckAsync(r.FullName))
        {
            var isOpposing = m.Reason.StartsWith("طرف مقابل");
            result.Add(new IntakeConflict(isOpposing ? "ApplicantIsOpposingParty" : "ApplicantIsExistingClient", isOpposing, m.FullName, m.Reason));
        }
        if (!string.IsNullOrWhiteSpace(r.OpposingPartyName))
        {
            foreach (var m in await checker.CheckAsync(r.OpposingPartyName))
            {
                var isClient = m.Reason.StartsWith("عميل");
                result.Add(new IntakeConflict(isClient ? "OtherPartyIsClient" : "OtherPartyIsOpposingParty", isClient, m.FullName, m.Reason));
            }
        }
        return result;
    }

    private static async Task<IResult> Get(Guid id, AppDbContext db, ConflictChecker checker)
    {
        var r = await db.IntakeRequests.AsNoTracking().Include(x => x.AssignedUser).FirstOrDefaultAsync(x => x.Id == id);
        if (r is null) return Results.NotFound();
        var conflicts = r.AnonymizedAt is null ? await ConflictsFor(r, checker) : [];
        return Results.Ok(new
        {
            r.Id, r.Reference, r.SubmittedAt, r.ReceivedAt, r.Language, r.FullName, r.PreferredContact, r.Phone, r.Email,
            r.ServiceSlug, r.ServiceTitle, r.OpposingPartyName, r.ConsentAt, r.PrivacyPolicyVersion,
            Status = r.Status.ToString(), AssignedUserName = r.AssignedUser?.FullName, r.ConvertedClientId, r.DeclineReason,
            r.ConflictAcknowledgement, r.ClosedAt, r.AnonymizedAt,
            Conflicts = conflicts, HasBlockingConflict = conflicts.Any(c => c.Blocking)
        });
    }

    private static async Task<IResult> Take(Guid id, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var r = await db.IntakeRequests.FindAsync(id);
        if (r is null) return Results.NotFound();
        if (r.Status is IntakeRequestStatus.Converted or IntakeRequestStatus.Declined)
            return Results.Conflict(new { message = "الطلب مغلق" });

        var userId = JwtTokenService.GetUserId(http.User)!.Value;
        r.AssignedUserId = userId;
        r.Status = IntakeRequestStatus.InReview;
        await db.SaveChangesAsync();
        await audit.LogAsync(userId, ActorName(http), "INTAKE_TAKEN", "IntakeRequest", r.Id.ToString(), ClientIp(http), r.Reference);
        return Results.NoContent();
    }

    /// <summary>
    /// تحويل الطلب إلى عميل. إن وُجد تعارض جوهري لا يتم التحويل إلا بإقرار صريح ومبرر مكتوب يُحفظ في سجل التدقيق.
    /// </summary>
    private static async Task<IResult> Convert(Guid id, ConvertRequest req, AppDbContext db, ConflictChecker checker, AuditLogger audit, HttpContext http)
    {
        var r = await db.IntakeRequests.FindAsync(id);
        if (r is null) return Results.NotFound();
        if (r.Status is IntakeRequestStatus.Converted or IntakeRequestStatus.Declined)
            return Results.Conflict(new { message = "الطلب مغلق" });

        var conflicts = await ConflictsFor(r, checker);
        var blocking = conflicts.Where(c => c.Blocking).ToList();
        if (blocking.Count > 0 && (!req.AcknowledgeConflicts || string.IsNullOrWhiteSpace(req.ConflictNote)))
            return Results.Conflict(new { message = "يوجد تطابق في فحص تعارض المصالح — يلزم الإقرار وكتابة المبرر قبل التحويل", conflicts = blocking });

        var userId = JwtTokenService.GetUserId(http.User)!.Value;
        var client = new Client
        {
            Type = req.Type,
            FullName = r.FullName,
            Phone = r.Phone,
            Email = r.Email,
            Notes = $"محوَّل من طلب الموقع رقم {r.Reference}" + (r.ServiceTitle is null ? "" : $" — الخدمة: {r.ServiceTitle}"),
            CreatedByUserId = userId
        };
        db.Clients.Add(client);

        r.Status = IntakeRequestStatus.Converted;
        r.ConvertedClientId = client.Id;
        r.AssignedUserId ??= userId;
        r.ClosedByUserId = userId;
        r.ClosedAt = DateTimeOffset.UtcNow;
        r.ConflictAcknowledgement = blocking.Count > 0 ? req.ConflictNote!.Trim()[..Math.Min(500, req.ConflictNote.Trim().Length)] : null;
        await db.SaveChangesAsync();

        await audit.LogAsync(userId, ActorName(http), "CLIENT_CREATED", "Client", client.Id.ToString(), ClientIp(http), $"من طلب الموقع {r.Reference}");
        await audit.LogAsync(userId, ActorName(http), blocking.Count > 0 ? "INTAKE_CONVERTED_WITH_CONFLICT_ACK" : "INTAKE_CONVERTED",
            "IntakeRequest", r.Id.ToString(), ClientIp(http), r.ConflictAcknowledgement);
        return Results.Ok(new { clientId = client.Id });
    }

    private static async Task<IResult> Decline(Guid id, DeclineRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var r = await db.IntakeRequests.FindAsync(id);
        if (r is null) return Results.NotFound();
        if (r.Status is IntakeRequestStatus.Converted or IntakeRequestStatus.Declined)
            return Results.Conflict(new { message = "الطلب مغلق" });
        if (string.IsNullOrWhiteSpace(req.Reason))
            return Results.BadRequest(new { message = "سبب الاعتذار مطلوب" });

        var userId = JwtTokenService.GetUserId(http.User)!.Value;
        r.Status = IntakeRequestStatus.Declined;
        r.DeclineReason = Truncate(req.Reason, 500);
        r.AssignedUserId ??= userId;
        r.ClosedByUserId = userId;
        r.ClosedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        await audit.LogAsync(userId, ActorName(http), "INTAKE_DECLINED", "IntakeRequest", r.Id.ToString(), ClientIp(http), r.Reference);
        return Results.NoContent();
    }
}
