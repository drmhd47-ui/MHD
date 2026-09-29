using Microsoft.EntityFrameworkCore;
using MHD.Api.Data;
using MHD.Api.Domain;
using MHD.Api.Security;

namespace MHD.Api.Endpoints;

/// <summary>
/// الجلسات وتقاريرها. المترافع في الجلسة محامٍ مرخّص نشط (الترافع مقصور على المحامين المرخّصين وفق نظام
/// المحاماة)، ويجوز إسناد عضو مساند من الفريق. بعد الجلسة يُسجَّل تقريرها، ويُنشأ موعد الجلسة التالية إن حُدّد.
/// </summary>
public static class HearingEndpoints
{
    public static void MapHearingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/hearings").RequireAuthorization().WithTags("Hearings");

        group.MapGet("/", List);
        group.MapGet("/{id:guid}", Get);
        group.MapPost("/", Create);
        group.MapPut("/{id:guid}", Update);
        group.MapPost("/{id:guid}/report", Report);
        group.MapPost("/{id:guid}/cancel", Cancel);
    }

    private record HearingRequest(Guid CaseId, DateTimeOffset ScheduledAt, string? Court, string? Circuit, string? Location,
        string? Purpose, Guid LawyerId, Guid? SupportUserId);

    private record ReportRequest(HearingStatus Outcome, string Report, DateTimeOffset? NextHearingAt, string? NextPurpose);

    private record CancelRequest(string? Reason);

    private const string NotLicensed = "المترافع في الجلسة يجب أن يكون محامياً مرخّصاً نشطاً — الترافع أمام الجهات القضائية مقصور على المحامين المرخّصين وفق نظام المحاماة.";

    private static string ClientIp(HttpContext http) => http.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    private static string ActorName(HttpContext http) => http.User.Identity?.Name ?? "";

    /// <summary>شكل الاستجابة: بلا كيانات مستخدمين كاملة، وبلا بيانات العميل (يكفي رقم الملف وعنوانه).</summary>
    private static object Dto(Hearing h) => new
    {
        h.Id,
        h.CaseId,
        CaseNumber = h.Case?.CaseNumber,
        CaseTitle = h.Case?.Title,
        h.ScheduledAt,
        h.Court,
        h.Circuit,
        h.Location,
        h.Purpose,
        h.LawyerId,
        LawyerName = h.Lawyer?.FullName,
        h.SupportUserId,
        SupportUserName = h.SupportUser?.FullName,
        Status = h.Status.ToString(),
        h.Report,
        h.ReportedAt,
        h.NextHearingId,
        h.CreatedAt
    };

    private static IQueryable<Hearing> WithRefs(AppDbContext db) =>
        db.Hearings.Include(h => h.Case).Include(h => h.Lawyer).Include(h => h.SupportUser);

    private static async Task<IResult> List(AppDbContext db, HttpContext http, DateTimeOffset? from, DateTimeOffset? to, Guid? caseId, HearingStatus? status, bool mine = false)
    {
        var query = WithRefs(db);
        if (caseId is not null) query = query.Where(h => h.CaseId == caseId);
        if (status is not null) query = query.Where(h => h.Status == status);
        if (mine)
        {
            var me = JwtTokenService.GetUserId(http.User);
            query = query.Where(h => h.LawyerId == me || h.SupportUserId == me);
        }

        // تصفية المدى الزمني وترتيبه بعد الجلب: أعداد الجلسات صغيرة، ويبقى الاستعلام قابلاً للترجمة في كل المزودين.
        var items = (await query.ToListAsync())
            .Where(h => (from is null || h.ScheduledAt >= from) && (to is null || h.ScheduledAt <= to))
            .OrderBy(h => h.ScheduledAt)
            .Select(Dto);
        return Results.Ok(items);
    }

    private static async Task<IResult> Get(Guid id, AppDbContext db)
    {
        var h = await WithRefs(db).FirstOrDefaultAsync(x => x.Id == id);
        return h is null ? Results.NotFound() : Results.Ok(Dto(h));
    }

    private static async Task<string?> Validate(HearingRequest req, AppDbContext db)
    {
        var @case = await db.Cases.FirstOrDefaultAsync(c => c.Id == req.CaseId);
        if (@case is null) return "الملف غير موجود";
        if (@case.Status != CaseStatus.Open) return "لا تُجدول جلسة على ملف مغلق أو مؤرشف";

        var lawyer = await db.Users.FirstOrDefaultAsync(u => u.Id == req.LawyerId);
        if (lawyer is null || !lawyer.IsActive || !lawyer.IsLicensedLawyer) return NotLicensed;

        if (req.SupportUserId is Guid sid)
        {
            if (sid == req.LawyerId) return "العضو المساند يجب أن يكون غير المترافع";
            if (!await db.Users.AnyAsync(u => u.Id == sid && u.IsActive)) return "العضو المساند غير موجود أو معطّل";
        }
        return null;
    }

    private static async Task<IResult> Create(HearingRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        if (await Validate(req, db) is string error) return Results.BadRequest(new { message = error });

        var userId = JwtTokenService.GetUserId(http.User)!.Value;
        var h = new Hearing
        {
            CaseId = req.CaseId,
            ScheduledAt = req.ScheduledAt,
            Court = Clean(req.Court),
            Circuit = Clean(req.Circuit),
            Location = Clean(req.Location),
            Purpose = Clean(req.Purpose),
            LawyerId = req.LawyerId,
            SupportUserId = req.SupportUserId,
            CreatedByUserId = userId
        };
        db.Hearings.Add(h);
        await db.SaveChangesAsync();
        await audit.LogAsync(userId, ActorName(http), "HEARING_CREATED", "Hearing", h.Id.ToString(), ClientIp(http));

        var created = await WithRefs(db).FirstAsync(x => x.Id == h.Id);
        return Results.Created($"/api/hearings/{h.Id}", Dto(created));
    }

    private static async Task<IResult> Update(Guid id, HearingRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var h = await db.Hearings.FindAsync(id);
        if (h is null) return Results.NotFound();
        if (h.Status != HearingStatus.Scheduled)
            return Results.BadRequest(new { message = "لا تُعدَّل جلسة بعد تسجيل تقريرها أو إلغائها" });
        if (await Validate(req, db) is string error) return Results.BadRequest(new { message = error });

        if (h.ScheduledAt != req.ScheduledAt)
        {
            // موعد جديد يستحق تذكيراً جديداً.
            h.ReminderSentAt = null;
            h.ReportReminderSentAt = null;
        }
        h.CaseId = req.CaseId;
        h.ScheduledAt = req.ScheduledAt;
        h.Court = Clean(req.Court);
        h.Circuit = Clean(req.Circuit);
        h.Location = Clean(req.Location);
        h.Purpose = Clean(req.Purpose);
        h.LawyerId = req.LawyerId;
        h.SupportUserId = req.SupportUserId;
        await db.SaveChangesAsync();

        await audit.LogAsync(JwtTokenService.GetUserId(http.User), ActorName(http), "HEARING_UPDATED", "Hearing", id.ToString(), ClientIp(http));
        return Results.Ok(Dto(await WithRefs(db).FirstAsync(x => x.Id == id)));
    }

    private static async Task<IResult> Report(Guid id, ReportRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var h = await db.Hearings.Include(x => x.Lawyer).FirstOrDefaultAsync(x => x.Id == id);
        if (h is null) return Results.NotFound();
        if (h.Status != HearingStatus.Scheduled)
            return Results.BadRequest(new { message = "سُجّل تقرير هذه الجلسة مسبقاً أو أُلغيت" });
        if (req.Outcome is not (HearingStatus.Held or HearingStatus.Postponed))
            return Results.BadRequest(new { message = "نتيجة الجلسة: انعقدت أو أُجّلت" });
        if (string.IsNullOrWhiteSpace(req.Report) || req.Report.Trim().Length < 10)
            return Results.BadRequest(new { message = "اكتب تقرير الجلسة: ما دار فيها وما قررته الدائرة" });
        if (req.NextHearingAt is DateTimeOffset next && next <= h.ScheduledAt)
            return Results.BadRequest(new { message = "موعد الجلسة التالية يجب أن يكون بعد هذه الجلسة" });

        var userId = JwtTokenService.GetUserId(http.User)!.Value;
        h.Status = req.Outcome;
        h.Report = req.Report.Trim();
        h.ReportedAt = DateTimeOffset.UtcNow;
        h.ReportedByUserId = userId;

        Hearing? nextHearing = null;
        if (req.NextHearingAt is DateTimeOffset at)
        {
            // الجلسة التالية تُسند للمترافع نفسه إن بقي محامياً مرخّصاً نشطاً؛ وإلا تُترك لإسنادها يدوياً.
            if (!h.Lawyer.IsActive || !h.Lawyer.IsLicensedLawyer)
                return Results.BadRequest(new { message = "المترافع في هذه الجلسة لم يعد محامياً مرخّصاً نشطاً — سجّل التقرير بلا جلسة تالية ثم جدولها بمترافع آخر" });
            nextHearing = new Hearing
            {
                CaseId = h.CaseId,
                ScheduledAt = at,
                Court = h.Court,
                Circuit = h.Circuit,
                Location = h.Location,
                Purpose = Clean(req.NextPurpose),
                LawyerId = h.LawyerId,
                SupportUserId = h.SupportUserId,
                CreatedByUserId = userId
            };
            db.Hearings.Add(nextHearing);
            h.NextHearingId = nextHearing.Id;
        }

        await db.SaveChangesAsync();
        await audit.LogAsync(userId, ActorName(http), "HEARING_REPORTED", "Hearing", id.ToString(), ClientIp(http),
            nextHearing is null ? $"النتيجة: {h.Status}" : $"النتيجة: {h.Status}، الجلسة التالية: {nextHearing.Id}");

        return Results.Ok(Dto(await WithRefs(db).FirstAsync(x => x.Id == id)));
    }

    private static async Task<IResult> Cancel(Guid id, CancelRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var h = await db.Hearings.FindAsync(id);
        if (h is null) return Results.NotFound();
        if (h.Status != HearingStatus.Scheduled)
            return Results.BadRequest(new { message = "لا تُلغى جلسة سُجّل تقريرها" });

        h.Status = HearingStatus.Cancelled;
        await db.SaveChangesAsync();
        await audit.LogAsync(JwtTokenService.GetUserId(http.User), ActorName(http), "HEARING_CANCELLED", "Hearing", id.ToString(), ClientIp(http), Clean(req.Reason));
        return Results.Ok(Dto(await WithRefs(db).FirstAsync(x => x.Id == id)));
    }

    private static string? Clean(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();
}
