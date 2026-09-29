using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MHD.Api.Data;
using MHD.Api.Domain;
using MHD.Api.Security;
using MHD.Api.Services;
using Xunit;

namespace MHD.Api.Tests;

public class DeadlineCalculatorTests
{
    private static readonly Dictionary<DateOnly, string> NoHolidays = new();

    [Fact]
    public void Excludes_trigger_day_and_counts_calendar_days()
    {
        // الأحد 2026-10-04 + 30 يوماً = الثلاثاء 2026-11-03 (يوم عمل).
        var r = DeadlineCalculator.Compute(new DateOnly(2026, 10, 4), 30, NoHolidays);
        Assert.Equal(new DateOnly(2026, 11, 3), r.DueDate);
        Assert.Null(r.Note);
    }

    [Fact]
    public void Extends_past_weekend_to_next_working_day()
    {
        // الأحد 2026-10-04 + 5 = الجمعة 2026-10-09 → الأحد 2026-10-11.
        var r = DeadlineCalculator.Compute(new DateOnly(2026, 10, 4), 5, NoHolidays);
        Assert.Equal(new DateOnly(2026, 10, 9), r.NominalDate);
        Assert.Equal(new DateOnly(2026, 10, 11), r.DueDate);
        Assert.NotNull(r.Note);
    }

    [Fact]
    public void Extends_past_holiday_chained_with_weekend()
    {
        // ينتهي الخميس 2026-10-08 وهو عطلة، ثم الجمعة والسبت → الأحد 2026-10-11.
        var holidays = new Dictionary<DateOnly, string> { [new DateOnly(2026, 10, 8)] = "عطلة اختبار" };
        var r = DeadlineCalculator.Compute(new DateOnly(2026, 10, 4), 4, holidays);
        Assert.Equal(new DateOnly(2026, 10, 11), r.DueDate);
        Assert.Contains("عطلة اختبار", r.Note);
    }

    [Theory]
    [InlineData(30, null)]
    [InlineData(8, null)]
    [InlineData(7, 7)]
    [InlineData(4, 7)]
    [InlineData(3, 3)]
    [InlineData(2, 3)]
    [InlineData(1, 1)]
    [InlineData(0, 0)]
    [InlineData(-2, -1)]
    public void Reminder_stages(int daysLeft, int? stage) => Assert.Equal(stage, DeadlineCalculator.StageFor(daysLeft));
}

public class HearingsAndDeadlinesTests(AppFactory factory) : IClassFixture<AppFactory>
{
    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);

    private async Task<User> AddUser(string name, UserRole role, bool licensed)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var (hash, salt) = PasswordHasher.Hash("Temp#Pass2026x!");
        var u = new User
        {
            FullName = name, Email = $"{Guid.NewGuid():N}@mgrp.sa", Role = role, PasswordHash = hash, PasswordSalt = salt,
            IsLicensedLawyer = licensed, LicenseNumber = licensed ? "L-TEST" : null, MustChangePassword = false
        };
        db.Users.Add(u);
        await db.SaveChangesAsync();
        return u;
    }

    private HttpClient ClientFor(User u)
    {
        using var scope = factory.Services.CreateScope();
        var token = scope.ServiceProvider.GetRequiredService<JwtTokenService>().CreateAccessToken(u);
        var c = factory.CreateClient();
        c.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return c;
    }

    private async Task<Guid> AddCase(Guid lawyerId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var client = new Client { Type = ClientType.Company, FullName = "شركة اختبار الجلسات", CreatedByUserId = lawyerId };
        var @case = new Case
        {
            CaseNumber = "T-" + Guid.NewGuid().ToString("N")[..8], Title = "نزاع اختبار", Client = client,
            OpenedDate = new DateOnly(2026, 9, 1), AssignedLawyerId = lawyerId, CreatedByUserId = lawyerId
        };
        db.Cases.Add(@case);
        await db.SaveChangesAsync();
        return @case.Id;
    }

    private static async Task<JsonElement> Json(HttpResponseMessage r) => await r.Content.ReadFromJsonAsync<JsonElement>(Web);

    [Fact]
    public async Task Pleading_lawyer_must_be_licensed_and_report_schedules_next_hearing()
    {
        var dhai = await AddUser("المحامية ضي حمد آل شيبان", UserRole.Lawyer, licensed: true);
        var consultant = await AddUser("المستشار محمد سعد", UserRole.Lawyer, licensed: false);
        var caseId = await AddCase(dhai.Id);
        var api = ClientFor(consultant);
        var at = DateTimeOffset.UtcNow.AddDays(3);

        // المستشار غير المرخّص لا يُسند إليه الترافع، لكنه يدير الجلسة عضواً مسانداً.
        var bad = await api.PostAsJsonAsync("/api/hearings", new { caseId, scheduledAt = at, lawyerId = consultant.Id });
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
        Assert.Contains("مرخّص", (await Json(bad)).GetProperty("message").GetString());

        var ok = await api.PostAsJsonAsync("/api/hearings", new { caseId, scheduledAt = at, court = "المحكمة العامة بالرياض", lawyerId = dhai.Id, supportUserId = consultant.Id });
        Assert.Equal(HttpStatusCode.Created, ok.StatusCode);
        var hearing = await Json(ok);
        var id = hearing.GetProperty("id").GetGuid();
        Assert.Equal("Scheduled", hearing.GetProperty("status").GetString());
        Assert.False(hearing.TryGetProperty("lawyer", out _)); // لا كيانات مستخدمين كاملة في الاستجابة

        var shortReport = await api.PostAsJsonAsync($"/api/hearings/{id}/report", new { outcome = "Held", report = "تم" });
        Assert.Equal(HttpStatusCode.BadRequest, shortReport.StatusCode);

        var report = await api.PostAsJsonAsync($"/api/hearings/{id}/report",
            new { outcome = "Postponed", report = "حضرنا وطلب الخصم مهلة للرد فأجّلت الدائرة الجلسة.", nextHearingAt = at.AddDays(21) });
        Assert.Equal(HttpStatusCode.OK, report.StatusCode);
        var reported = await Json(report);
        Assert.Equal("Postponed", reported.GetProperty("status").GetString());
        var nextId = reported.GetProperty("nextHearingId").GetGuid();

        var next = await Json(await api.GetAsync($"/api/hearings/{nextId}"));
        Assert.Equal("Scheduled", next.GetProperty("status").GetString());
        Assert.Equal(dhai.Id, next.GetProperty("lawyerId").GetGuid());
        Assert.Equal("المحكمة العامة بالرياض", next.GetProperty("court").GetString());

        var again = await api.PostAsJsonAsync($"/api/hearings/{id}/report", new { outcome = "Held", report = "تقرير ثانٍ لا يُقبل بعد الأول" });
        Assert.Equal(HttpStatusCode.BadRequest, again.StatusCode);
    }

    [Fact]
    public async Task Deadline_requires_distinct_backup_and_independent_double_verification()
    {
        var creator = await AddUser("منشئ المهلة", UserRole.Lawyer, licensed: true);
        var checker = await AddUser("المتحقق", UserRole.Lawyer, licensed: false);
        var caseId = await AddCase(creator.Id);
        var api = ClientFor(creator);

        var rules = await Json(await api.GetAsync("/api/deadline-rules"));
        var appeal = rules.EnumerateArray().First(r => r.GetProperty("key").GetString() == "appeal");
        Assert.False(appeal.GetProperty("basisVerified").GetBoolean()); // السند يحتاج مطابقة محامٍ
        var ruleId = appeal.GetProperty("id").GetGuid();

        var same = await api.PostAsJsonAsync("/api/deadlines", new
        {
            caseId, ruleId, triggerDate = "2026-10-04", responsibleUserId = creator.Id, backupUserId = creator.Id
        });
        Assert.Equal(HttpStatusCode.BadRequest, same.StatusCode);

        var otherDays = await api.PostAsJsonAsync("/api/deadlines", new
        {
            caseId, ruleId, days = 45, triggerDate = "2026-10-04", responsibleUserId = creator.Id, backupUserId = checker.Id
        });
        Assert.Equal(HttpStatusCode.BadRequest, otherDays.StatusCode);

        var created = await api.PostAsJsonAsync("/api/deadlines", new
        {
            caseId, ruleId, triggerDate = "2026-10-04", responsibleUserId = creator.Id, backupUserId = checker.Id
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var dl = await Json(created);
        var id = dl.GetProperty("id").GetGuid();
        Assert.Equal("2026-11-03", dl.GetProperty("dueDate").GetString());

        var selfVerify = await api.PostAsJsonAsync($"/api/deadlines/{id}/verify", new { confirmedDueDate = "2026-11-03" });
        Assert.Equal(HttpStatusCode.BadRequest, selfVerify.StatusCode);

        var checkerApi = ClientFor(checker);
        var mismatch = await checkerApi.PostAsJsonAsync($"/api/deadlines/{id}/verify", new { confirmedDueDate = "2026-11-02" });
        Assert.Equal(HttpStatusCode.BadRequest, mismatch.StatusCode);

        var verified = await checkerApi.PostAsJsonAsync($"/api/deadlines/{id}/verify", new { confirmedDueDate = "2026-11-03" });
        Assert.Equal(HttpStatusCode.OK, verified.StatusCode);
        Assert.Equal(checker.Id, (await Json(verified)).GetProperty("verifiedByUserId").GetGuid());

        // التنازل عن مهلة للشريك الإداري وحده؛ والإنجاز يتطلب بيان ما تم.
        var waive = await api.PostAsJsonAsync($"/api/deadlines/{id}/waive", new { note = "قرار العميل بعدم الاعتراض" });
        Assert.Equal(HttpStatusCode.Forbidden, waive.StatusCode);
        var noNote = await api.PostAsJsonAsync($"/api/deadlines/{id}/complete", new { note = "" });
        Assert.Equal(HttpStatusCode.BadRequest, noNote.StatusCode);
        var done = await api.PostAsJsonAsync($"/api/deadlines/{id}/complete", new { note = "قُدّمت لائحة الاعتراض إلكترونياً" });
        Assert.Equal("Completed", (await Json(done)).GetProperty("status").GetString());
    }

    [Fact]
    public async Task Adding_a_holiday_recomputes_open_deadlines_and_drops_verification()
    {
        var a = await AddUser("مسؤول", UserRole.Lawyer, licensed: true);
        var b = await AddUser("نائب", UserRole.Lawyer, licensed: true);
        var caseId = await AddCase(a.Id);
        var api = ClientFor(a);

        // 2027-01-03 (الأحد) + 30 = 2027-02-02 (الثلاثاء).
        var created = await Json(await api.PostAsJsonAsync("/api/deadlines", new
        {
            caseId, title = "مهلة مخصصة للاختبار", days = 30, legalBasis = "نظام اختبار — مادة 1", triggerDate = "2027-01-03",
            responsibleUserId = a.Id, backupUserId = b.Id
        }));
        var id = created.GetProperty("id").GetGuid();
        Assert.Equal("2027-02-02", created.GetProperty("dueDate").GetString());
        Assert.False(created.GetProperty("basisVerified").GetBoolean());
        await ClientFor(b).PostAsJsonAsync($"/api/deadlines/{id}/verify", new { confirmedDueDate = "2027-02-02" });

        var manager = await AddUser("الشريك الإداري", UserRole.Manager, licensed: false);
        var add = await ClientFor(manager).PostAsJsonAsync("/api/holidays", new { date = "2027-02-02", name = "عطلة رسمية للاختبار" });
        Assert.Equal(HttpStatusCode.OK, add.StatusCode);
        Assert.True((await Json(add)).GetProperty("recomputedDeadlines").GetInt32() >= 1);

        var after = await Json(await api.GetAsync($"/api/deadlines/{id}"));
        Assert.Equal("2027-02-03", after.GetProperty("dueDate").GetString());
        Assert.Equal(JsonValueKind.Null, after.GetProperty("verifiedByUserId").ValueKind);
        Assert.Contains("عطلة رسمية للاختبار", after.GetProperty("dueDateNote").GetString());

        var lawyerHoliday = await api.PostAsJsonAsync("/api/holidays", new { date = "2027-03-01", name = "ليست للمحامي" });
        Assert.Equal(HttpStatusCode.Forbidden, lawyerHoliday.StatusCode);
    }

    [Fact]
    public async Task Guard_sends_each_stage_once_and_flags_missing_hearing_reports()
    {
        var a = await AddUser("مسؤول الحارس", UserRole.Lawyer, licensed: true);
        var b = await AddUser("نائب الحارس", UserRole.Lawyer, licensed: true);
        var caseId = await AddCase(a.Id);
        var created = await Json(await ClientFor(a).PostAsJsonAsync("/api/deadlines", new
        {
            caseId, title = "مهلة للحارس", days = 10, triggerDate = "2028-03-05", responsibleUserId = a.Id, backupUserId = b.Id
        }));
        var due = DateOnly.Parse(created.GetProperty("dueDate").GetString()!);
        var guard = factory.Services.GetRequiredService<DeadlineGuardService>();

        // قبل الانتهاء بثلاثة أيام (منتصف النهار بتوقيت الرياض).
        var threeDaysBefore = new DateTimeOffset(due.AddDays(-3).ToDateTime(new TimeOnly(9, 0)), TimeSpan.Zero);
        Assert.True((await guard.RunOnceAsync(threeDaysBefore)).DeadlineReminders >= 1);
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var id = created.GetProperty("id").GetGuid();
            Assert.Equal(3, (await db.LegalDeadlines.FindAsync(id))!.LastReminderStage);
        }
        // التشغيل الثاني في المرحلة نفسها لا يعيد الإرسال لهذه المهلة.
        var second = await guard.RunOnceAsync(threeDaysBefore.AddMinutes(30));
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.Equal(3, (await db.LegalDeadlines.FindAsync(created.GetProperty("id").GetGuid()))!.LastReminderStage);
        }

        // جلسة مرّ عليها يوم بلا تقرير.
        var hearing = await Json(await ClientFor(a).PostAsJsonAsync("/api/hearings", new { caseId, scheduledAt = DateTimeOffset.UtcNow.AddHours(1), lawyerId = a.Id }));
        var run = await guard.RunOnceAsync(DateTimeOffset.UtcNow.AddHours(30));
        Assert.True(run.MissingReports >= 1);
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.NotNull((await db.Hearings.FindAsync(hearing.GetProperty("id").GetGuid()))!.ReportReminderSentAt);
        }
    }

    [Fact]
    public async Task Api_never_exposes_credentials_of_embedded_users()
    {
        var a = await AddUser("محامٍ للاختبار الأمني", UserRole.Lawyer, licensed: true);
        var caseId = await AddCase(a.Id);
        var body = await ClientFor(a).GetStringAsync($"/api/cases/{caseId}");
        Assert.Contains("assignedLawyer", body);
        Assert.DoesNotContain("passwordHash", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("passwordSalt", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("totpSecret", body, StringComparison.OrdinalIgnoreCase);

        var team = await ClientFor(a).GetStringAsync("/api/team");
        Assert.Contains("isLicensedLawyer", team);
        Assert.DoesNotContain("@mgrp.sa", team); // لا بريد في قائمة الفريق
    }

    [Fact]
    public async Task Unregistered_firm_issues_plain_invoices_without_vat_or_tax_qr()
    {
        var manager = await AddUser("مدير الفوترة", UserRole.Manager, licensed: false);
        var caseId = await AddCase(manager.Id);
        Guid clientId;
        using (var scope = factory.Services.CreateScope())
            clientId = (await scope.ServiceProvider.GetRequiredService<AppDbContext>().Cases.FindAsync(caseId))!.ClientId;
        var api = ClientFor(manager);

        var badVat = await api.PutAsJsonAsync("/api/office-settings", new
        {
            firmName = "مجموعة إم القانونية", vatNumber = "3150535051", defaultVatRate = 0.15, isVatRegistered = true
        });
        Assert.Equal(HttpStatusCode.BadRequest, badVat.StatusCode);

        var settings = await api.PutAsJsonAsync("/api/office-settings", new
        {
            firmName = "مجموعة إم القانونية", vatNumber = "3150535051", commercialRegistrationNumber = "7055255900", defaultVatRate = 0.15, isVatRegistered = false
        });
        Assert.Equal(HttpStatusCode.OK, settings.StatusCode);
        Assert.Equal(JsonValueKind.Null, (await Json(settings)).GetProperty("vatNumber").ValueKind);

        var inv = await Json(await api.PostAsJsonAsync("/api/invoices", new
        {
            clientId, issueDate = "2026-10-01", vatRate = 0.15, lines = new[] { new { description = "استشارة", quantity = 1, unitPrice = 1000 } }
        }));
        Assert.Equal(0m, inv.GetProperty("vatAmount").GetDecimal());
        Assert.Equal(1000m, inv.GetProperty("total").GetDecimal());

        var issued = await Json(await api.PostAsync($"/api/invoices/{inv.GetProperty("id").GetGuid()}/issue", null));
        Assert.False(issued.GetProperty("isTaxInvoice").GetBoolean());
        Assert.Equal(JsonValueKind.Null, issued.GetProperty("qrCodeTlvBase64").ValueKind);
        Assert.Equal(JsonValueKind.Null, issued.GetProperty("sellerVatNumber").ValueKind);

        var status = await Json(await api.GetAsync("/api/invoices/vat-status"));
        Assert.False(status.GetProperty("isVatRegistered").GetBoolean());
        Assert.Equal(375000m, status.GetProperty("mandatoryThreshold").GetDecimal());
    }
}
