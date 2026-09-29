using Microsoft.EntityFrameworkCore;
using MHD.Api.Data;
using MHD.Api.Domain;
using MHD.Api.Security;
using MHD.Api.Services;

namespace MHD.Api.Endpoints;

/// <summary>
/// حارس المهل: قواعد المهل، والمهل على الملفات، والعطل الرسمية.
/// ضوابط السلامة:
/// - لكل مهلة مسؤول ونائب مختلفان.
/// - تحقق مزدوج: يؤكد تاريخ الانتهاء مستخدم غير الذي أنشأ المهلة، بإدخاله التاريخ نفسه مستقلاً.
/// - إغلاق المهلة بالإنجاز يتطلب بيان ما تم؛ والتنازل عن مهلة قرار للشريك الإداري (المدير) وحده مع سببه.
/// - أي تغيير في العطل يعيد حساب المهل المفتوحة، ويُسقط تحقق ما تغيّر تاريخه ليُعاد التحقق منه.
/// </summary>
public static class DeadlineEndpoints
{
    public static void MapDeadlineEndpoints(this IEndpointRouteBuilder app)
    {
        var rules = app.MapGroup("/api/deadline-rules").RequireAuthorization().WithTags("Deadlines");
        rules.MapGet("/", ListRules);
        rules.MapPost("/", CreateRule).RequireAuthorization("ManagerOnly");
        rules.MapPut("/{id:guid}", UpdateRule).RequireAuthorization("ManagerOnly");
        rules.MapPost("/{id:guid}/verify-basis", VerifyRuleBasis);

        var group = app.MapGroup("/api/deadlines").RequireAuthorization().WithTags("Deadlines");
        group.MapGet("/", List);
        group.MapGet("/summary", Summary);
        group.MapGet("/preview", Preview);
        group.MapGet("/{id:guid}", Get);
        group.MapPost("/", Create);
        group.MapPut("/{id:guid}", Update);
        group.MapPost("/{id:guid}/verify", Verify);
        group.MapPost("/{id:guid}/complete", Complete);
        group.MapPost("/{id:guid}/waive", Waive).RequireAuthorization("ManagerOnly");

        var holidays = app.MapGroup("/api/holidays").RequireAuthorization().WithTags("Deadlines");
        holidays.MapGet("/", ListHolidays);
        holidays.MapPost("/", AddHoliday).RequireAuthorization("ManagerOnly");
        holidays.MapDelete("/{id:guid}", DeleteHoliday).RequireAuthorization("ManagerOnly");
    }

    private record RuleRequest(string Name, int Days, string Trigger, string? LegalBasis, bool IsInternal, bool IsActive = true, int SortOrder = 100);
    private record DeadlineRequest(Guid CaseId, Guid? RuleId, string? Title, int? Days, string? LegalBasis, DateOnly TriggerDate,
        Guid ResponsibleUserId, Guid BackupUserId, string? Notes);
    private record UpdateRequest(DateOnly TriggerDate, Guid ResponsibleUserId, Guid BackupUserId, string? Notes);
    private record VerifyRequest(DateOnly ConfirmedDueDate);
    private record CloseRequest(string Note);
    private record HolidayRequest(DateOnly Date, string Name);

    private static string ClientIp(HttpContext http) => http.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    private static string ActorName(HttpContext http) => http.User.Identity?.Name ?? "";
    private static string? Clean(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    private static async Task<Dictionary<DateOnly, string>> Holidays(AppDbContext db) =>
        await db.OfficialHolidays.ToDictionaryAsync(h => h.Date, h => h.Name);

    // ───────────── القواعد ─────────────

    private static async Task<IResult> ListRules(AppDbContext db, bool includeInactive = false)
    {
        var q = db.DeadlineRules.AsQueryable();
        if (!includeInactive) q = q.Where(r => r.IsActive);
        return Results.Ok(await q.OrderBy(r => r.SortOrder).ThenBy(r => r.Name).ToListAsync());
    }

    private static string? ValidateRule(RuleRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name) || string.IsNullOrWhiteSpace(req.Trigger)) return "اسم المهلة وواقعة بدء السريان مطلوبان";
        if (req.Days is < 1 or > 365) return "عدد الأيام بين 1 و365";
        if (!req.IsInternal && string.IsNullOrWhiteSpace(req.LegalBasis)) return "المهلة النظامية تحتاج سنداً نظامياً (اسم النظام ورقم المادة)";
        return null;
    }

    private static async Task<IResult> CreateRule(RuleRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        if (ValidateRule(req) is string e) return Results.BadRequest(new { message = e });
        var rule = new DeadlineRule
        {
            Key = "custom-" + Guid.NewGuid().ToString("N")[..8],
            Name = req.Name.Trim(),
            Days = req.Days,
            Trigger = req.Trigger.Trim(),
            LegalBasis = req.IsInternal ? null : Clean(req.LegalBasis),
            IsInternal = req.IsInternal,
            BasisVerified = req.IsInternal,
            IsActive = req.IsActive,
            SortOrder = req.SortOrder
        };
        db.DeadlineRules.Add(rule);
        await db.SaveChangesAsync();
        await audit.LogAsync(JwtTokenService.GetUserId(http.User), ActorName(http), "DEADLINE_RULE_CREATED", "DeadlineRule", rule.Id.ToString(), ClientIp(http));
        return Results.Created($"/api/deadline-rules/{rule.Id}", rule);
    }

    private static async Task<IResult> UpdateRule(Guid id, RuleRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var rule = await db.DeadlineRules.FindAsync(id);
        if (rule is null) return Results.NotFound();
        if (ValidateRule(req) is string e) return Results.BadRequest(new { message = e });

        var basis = req.IsInternal ? null : Clean(req.LegalBasis);
        // تغيير المدة أو السند يُسقط التحقق السابق: النص الجديد يحتاج مطابقة جديدة مع المصدر الرسمي.
        if (rule.Days != req.Days || rule.LegalBasis != basis || rule.IsInternal != req.IsInternal)
        {
            rule.BasisVerified = req.IsInternal;
            rule.BasisVerifiedByUserId = null;
            rule.BasisVerifiedAt = null;
        }
        rule.Name = req.Name.Trim();
        rule.Days = req.Days;
        rule.Trigger = req.Trigger.Trim();
        rule.LegalBasis = basis;
        rule.IsInternal = req.IsInternal;
        rule.IsActive = req.IsActive;
        rule.SortOrder = req.SortOrder;
        await db.SaveChangesAsync();
        await audit.LogAsync(JwtTokenService.GetUserId(http.User), ActorName(http), "DEADLINE_RULE_UPDATED", "DeadlineRule", id.ToString(), ClientIp(http));
        return Results.Ok(rule);
    }

    /// <summary>يؤكد محامٍ مرخّص أنه طابق السند (النظام والمادة والمدة) مع النص الرسمي النافذ.</summary>
    private static async Task<IResult> VerifyRuleBasis(Guid id, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var rule = await db.DeadlineRules.FindAsync(id);
        if (rule is null) return Results.NotFound();
        var userId = JwtTokenService.GetUserId(http.User)!.Value;
        var user = await db.Users.FindAsync(userId);
        if (user is null || !user.IsLicensedLawyer)
            return Results.Json(new { message = "التحقق من السند النظامي لمحامٍ مرخّص" }, statusCode: 403);
        if (rule.IsInternal) return Results.BadRequest(new { message = "المهلة الداخلية لا سند نظامياً لها" });

        rule.BasisVerified = true;
        rule.BasisVerifiedByUserId = userId;
        rule.BasisVerifiedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        await audit.LogAsync(userId, ActorName(http), "DEADLINE_RULE_BASIS_VERIFIED", "DeadlineRule", id.ToString(), ClientIp(http), $"{rule.LegalBasis} — {rule.Days} يوماً");
        return Results.Ok(rule);
    }

    // ───────────── المهل ─────────────

    private static object Dto(LegalDeadline d, DateTimeOffset now) => new
    {
        d.Id,
        d.CaseId,
        CaseNumber = d.Case?.CaseNumber,
        CaseTitle = d.Case?.Title,
        d.RuleId,
        d.Title,
        d.LegalBasis,
        d.IsInternal,
        d.BasisVerified,
        d.TriggerDate,
        d.Days,
        d.DueDate,
        d.DueDateNote,
        DaysLeft = DeadlineCalculator.DaysLeft(d.DueDate, now),
        d.ResponsibleUserId,
        ResponsibleName = d.ResponsibleUser?.FullName,
        d.BackupUserId,
        BackupName = d.BackupUser?.FullName,
        d.CreatedByUserId,
        d.VerifiedByUserId,
        d.VerifiedAt,
        Status = d.Status.ToString(),
        d.CompletionNote,
        d.ClosedAt,
        d.Notes,
        d.CreatedAt
    };

    private static IQueryable<LegalDeadline> WithRefs(AppDbContext db) =>
        db.LegalDeadlines.Include(d => d.Case).Include(d => d.ResponsibleUser).Include(d => d.BackupUser);

    private static async Task<IResult> List(AppDbContext db, HttpContext http, DeadlineStatus? status, Guid? caseId, bool mine = false)
    {
        var q = WithRefs(db);
        if (status is not null) q = q.Where(d => d.Status == status);
        if (caseId is not null) q = q.Where(d => d.CaseId == caseId);
        if (mine)
        {
            var me = JwtTokenService.GetUserId(http.User);
            q = q.Where(d => d.ResponsibleUserId == me || d.BackupUserId == me);
        }
        var now = DateTimeOffset.UtcNow;
        var items = (await q.ToListAsync()).OrderBy(d => d.Status).ThenBy(d => d.DueDate).Select(d => Dto(d, now));
        return Results.Ok(items);
    }

    private static async Task<IResult> Get(Guid id, AppDbContext db)
    {
        var d = await WithRefs(db).FirstOrDefaultAsync(x => x.Id == id);
        return d is null ? Results.NotFound() : Results.Ok(Dto(d, DateTimeOffset.UtcNow));
    }

    /// <summary>لوحة الحارس: المتأخرة، والمنتهية اليوم، وخلال أسبوع، وغير المتحقق منها، والجلسات بلا تقرير.</summary>
    private static async Task<IResult> Summary(AppDbContext db, HttpContext http, bool mine = false)
    {
        var now = DateTimeOffset.UtcNow;
        var me = JwtTokenService.GetUserId(http.User);
        var open = await db.LegalDeadlines.Where(d => d.Status == DeadlineStatus.Open).ToListAsync();
        if (mine) open = open.Where(d => d.ResponsibleUserId == me || d.BackupUserId == me).ToList();
        var left = open.Select(d => (d, left: DeadlineCalculator.DaysLeft(d.DueDate, now))).ToList();

        var hearings = await db.Hearings.Where(h => h.Status == HearingStatus.Scheduled).ToListAsync();
        if (mine) hearings = hearings.Where(h => h.LawyerId == me || h.SupportUserId == me).ToList();

        return Results.Ok(new
        {
            Overdue = left.Count(x => x.left < 0),
            DueToday = left.Count(x => x.left == 0),
            DueThisWeek = left.Count(x => x.left is > 0 and <= 7),
            Unverified = open.Count(d => d.VerifiedByUserId is null),
            UpcomingHearings = hearings.Count(h => h.ScheduledAt > now && h.ScheduledAt <= now.AddDays(7)),
            MissingReports = hearings.Count(h => h.ScheduledAt <= now.AddHours(-24))
        });
    }

    private static async Task<IResult> Preview(AppDbContext db, DateOnly triggerDate, int days)
    {
        if (days is < 1 or > 365) return Results.BadRequest(new { message = "عدد الأيام بين 1 و365" });
        var r = DeadlineCalculator.Compute(triggerDate, days, await Holidays(db));
        return Results.Ok(new { r.DueDate, r.NominalDate, r.Note });
    }

    private static async Task<string?> ValidatePeople(Guid responsible, Guid backup, AppDbContext db)
    {
        if (responsible == backup) return "المسؤول والنائب يجب أن يكونا شخصين مختلفين";
        var active = await db.Users.Where(u => u.IsActive && (u.Id == responsible || u.Id == backup)).CountAsync();
        return active == 2 ? null : "المسؤول أو النائب غير موجود أو معطّل";
    }

    private static async Task<IResult> Create(DeadlineRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var @case = await db.Cases.FindAsync(req.CaseId);
        if (@case is null) return Results.BadRequest(new { message = "الملف غير موجود" });
        if (@case.Status == CaseStatus.Archived) return Results.BadRequest(new { message = "لا تُضاف مهلة على ملف مؤرشف" });
        if (await ValidatePeople(req.ResponsibleUserId, req.BackupUserId, db) is string pe) return Results.BadRequest(new { message = pe });

        string title; int days; string? basis; bool isInternal; bool basisVerified;
        if (req.RuleId is Guid ruleId)
        {
            var rule = await db.DeadlineRules.FirstOrDefaultAsync(r => r.Id == ruleId && r.IsActive);
            if (rule is null) return Results.BadRequest(new { message = "قاعدة المهلة غير موجودة" });
            // مدة المهلة النظامية تأتي من القاعدة ولا تُعدَّل يدوياً؛ الداخلية يجوز تعديل مدتها.
            if (!rule.IsInternal && req.Days is int d0 && d0 != rule.Days)
                return Results.BadRequest(new { message = "مدة المهلة النظامية تُؤخذ من القاعدة — لمدة مختلفة أنشئ مهلة مخصصة بسندها" });
            title = Clean(req.Title) ?? rule.Name;
            days = rule.IsInternal && req.Days is int d1 ? d1 : rule.Days;
            basis = rule.LegalBasis;
            isInternal = rule.IsInternal;
            basisVerified = rule.BasisVerified;
        }
        else
        {
            if (Clean(req.Title) is null || req.Days is null) return Results.BadRequest(new { message = "المهلة المخصصة تحتاج عنواناً وعدد أيام" });
            title = req.Title!.Trim();
            days = req.Days.Value;
            basis = Clean(req.LegalBasis);
            isInternal = basis is null;
            basisVerified = isInternal;
        }
        if (days is < 1 or > 365) return Results.BadRequest(new { message = "عدد الأيام بين 1 و365" });

        var r = DeadlineCalculator.Compute(req.TriggerDate, days, await Holidays(db));
        var userId = JwtTokenService.GetUserId(http.User)!.Value;
        var dl = new LegalDeadline
        {
            CaseId = req.CaseId,
            RuleId = req.RuleId,
            Title = title,
            LegalBasis = basis,
            IsInternal = isInternal,
            BasisVerified = basisVerified,
            TriggerDate = req.TriggerDate,
            Days = days,
            DueDate = r.DueDate,
            DueDateNote = r.Note,
            ResponsibleUserId = req.ResponsibleUserId,
            BackupUserId = req.BackupUserId,
            CreatedByUserId = userId,
            Notes = Clean(req.Notes)
        };
        db.LegalDeadlines.Add(dl);
        await db.SaveChangesAsync();
        await audit.LogAsync(userId, ActorName(http), "DEADLINE_CREATED", "LegalDeadline", dl.Id.ToString(), ClientIp(http),
            $"{title}: {req.TriggerDate:yyyy-MM-dd} + {days} يوماً = {r.DueDate:yyyy-MM-dd}");
        return Results.Created($"/api/deadlines/{dl.Id}", Dto(await WithRefs(db).FirstAsync(x => x.Id == dl.Id), DateTimeOffset.UtcNow));
    }

    private static async Task<IResult> Update(Guid id, UpdateRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var dl = await db.LegalDeadlines.FindAsync(id);
        if (dl is null) return Results.NotFound();
        if (dl.Status != DeadlineStatus.Open) return Results.BadRequest(new { message = "لا تُعدَّل مهلة مغلقة" });
        if (await ValidatePeople(req.ResponsibleUserId, req.BackupUserId, db) is string pe) return Results.BadRequest(new { message = pe });

        if (req.TriggerDate != dl.TriggerDate)
        {
            var r = DeadlineCalculator.Compute(req.TriggerDate, dl.Days, await Holidays(db));
            dl.TriggerDate = req.TriggerDate;
            dl.DueDate = r.DueDate;
            dl.DueDateNote = r.Note;
            // تاريخ جديد = تحقق جديد وتنبيهات من البداية.
            dl.VerifiedByUserId = null;
            dl.VerifiedAt = null;
            dl.LastReminderStage = null;
        }
        dl.ResponsibleUserId = req.ResponsibleUserId;
        dl.BackupUserId = req.BackupUserId;
        dl.Notes = Clean(req.Notes);
        await db.SaveChangesAsync();
        await audit.LogAsync(JwtTokenService.GetUserId(http.User), ActorName(http), "DEADLINE_UPDATED", "LegalDeadline", id.ToString(), ClientIp(http));
        return Results.Ok(Dto(await WithRefs(db).FirstAsync(x => x.Id == id), DateTimeOffset.UtcNow));
    }

    private static async Task<IResult> Verify(Guid id, VerifyRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var dl = await db.LegalDeadlines.FindAsync(id);
        if (dl is null) return Results.NotFound();
        if (dl.Status != DeadlineStatus.Open) return Results.BadRequest(new { message = "المهلة مغلقة" });
        var userId = JwtTokenService.GetUserId(http.User)!.Value;
        if (userId == dl.CreatedByUserId)
            return Results.BadRequest(new { message = "التحقق المزدوج يتم من مستخدم غير الذي أنشأ المهلة" });
        if (req.ConfirmedDueDate != dl.DueDate)
        {
            await audit.LogAsync(userId, ActorName(http), "DEADLINE_VERIFY_MISMATCH", "LegalDeadline", id.ToString(), ClientIp(http),
                $"حساب المتحقق {req.ConfirmedDueDate:yyyy-MM-dd} يخالف المسجل {dl.DueDate:yyyy-MM-dd}");
            return Results.BadRequest(new { message = "التاريخ الذي حسبته يختلف عن تاريخ المهلة المسجل — راجع واقعة البدء والعطل مع المسؤول قبل الاعتماد" });
        }

        dl.VerifiedByUserId = userId;
        dl.VerifiedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        await audit.LogAsync(userId, ActorName(http), "DEADLINE_VERIFIED", "LegalDeadline", id.ToString(), ClientIp(http));
        return Results.Ok(Dto(await WithRefs(db).FirstAsync(x => x.Id == id), DateTimeOffset.UtcNow));
    }

    private static async Task<IResult> Complete(Guid id, CloseRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
        => await Close(id, req, DeadlineStatus.Completed, "DEADLINE_COMPLETED", "اكتب ما تم (مثل: قُدّمت لائحة الاعتراض ورقم قيدها)", db, audit, http);

    private static async Task<IResult> Waive(Guid id, CloseRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
        => await Close(id, req, DeadlineStatus.Waived, "DEADLINE_WAIVED", "اكتب سبب التنازل عن المهلة (مثل: قرار العميل كتابةً بعدم الاعتراض)", db, audit, http);

    private static async Task<IResult> Close(Guid id, CloseRequest req, DeadlineStatus status, string action, string noteRequired,
        AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var dl = await db.LegalDeadlines.FindAsync(id);
        if (dl is null) return Results.NotFound();
        if (dl.Status != DeadlineStatus.Open) return Results.BadRequest(new { message = "المهلة مغلقة مسبقاً" });
        if (string.IsNullOrWhiteSpace(req.Note) || req.Note.Trim().Length < 5) return Results.BadRequest(new { message = noteRequired });

        var userId = JwtTokenService.GetUserId(http.User)!.Value;
        dl.Status = status;
        dl.CompletionNote = req.Note.Trim();
        dl.ClosedByUserId = userId;
        dl.ClosedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        await audit.LogAsync(userId, ActorName(http), action, "LegalDeadline", id.ToString(), ClientIp(http), dl.CompletionNote);
        return Results.Ok(Dto(await WithRefs(db).FirstAsync(x => x.Id == id), DateTimeOffset.UtcNow));
    }

    // ───────────── العطل الرسمية ─────────────

    private static async Task<IResult> ListHolidays(AppDbContext db) =>
        Results.Ok((await db.OfficialHolidays.ToListAsync()).OrderBy(h => h.Date));

    private static async Task<IResult> AddHoliday(HolidayRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        if (string.IsNullOrWhiteSpace(req.Name)) return Results.BadRequest(new { message = "اسم العطلة مطلوب" });
        if (await db.OfficialHolidays.AnyAsync(h => h.Date == req.Date)) return Results.BadRequest(new { message = "هذا اليوم مسجل عطلةً مسبقاً" });

        var h = new OfficialHoliday { Date = req.Date, Name = req.Name.Trim() };
        db.OfficialHolidays.Add(h);
        await db.SaveChangesAsync();
        var changed = await RecomputeOpenDeadlines(db);
        await audit.LogAsync(JwtTokenService.GetUserId(http.User), ActorName(http), "HOLIDAY_ADDED", "OfficialHoliday", h.Id.ToString(), ClientIp(http),
            $"{h.Date:yyyy-MM-dd} {h.Name} — مهل أُعيد حسابها: {changed}");
        return Results.Ok(new { holiday = h, recomputedDeadlines = changed });
    }

    private static async Task<IResult> DeleteHoliday(Guid id, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var h = await db.OfficialHolidays.FindAsync(id);
        if (h is null) return Results.NotFound();
        db.OfficialHolidays.Remove(h);
        await db.SaveChangesAsync();
        var changed = await RecomputeOpenDeadlines(db);
        await audit.LogAsync(JwtTokenService.GetUserId(http.User), ActorName(http), "HOLIDAY_REMOVED", "OfficialHoliday", id.ToString(), ClientIp(http),
            $"{h.Date:yyyy-MM-dd} {h.Name} — مهل أُعيد حسابها: {changed}");
        return Results.Ok(new { recomputedDeadlines = changed });
    }

    /// <summary>يعيد حساب المهل المفتوحة بعد تغيّر العطل؛ ما تغيّر تاريخه يفقد تحققه ويعود لتنبيهات البداية.</summary>
    private static async Task<int> RecomputeOpenDeadlines(AppDbContext db)
    {
        var holidays = await Holidays(db);
        var open = await db.LegalDeadlines.Where(d => d.Status == DeadlineStatus.Open).ToListAsync();
        var changed = 0;
        foreach (var d in open)
        {
            var r = DeadlineCalculator.Compute(d.TriggerDate, d.Days, holidays);
            if (r.DueDate == d.DueDate) continue;
            d.DueDate = r.DueDate;
            d.DueDateNote = r.Note;
            d.VerifiedByUserId = null;
            d.VerifiedAt = null;
            d.LastReminderStage = null;
            changed++;
        }
        if (changed > 0) await db.SaveChangesAsync();
        return changed;
    }
}
