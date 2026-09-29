using Microsoft.EntityFrameworkCore;
using MHD.Api.Data;
using MHD.Api.Domain;

namespace MHD.Api.Services;

/// <summary>
/// حارس المهل والجلسات — يعمل في الخلفية ويرسل تنبيهات بريدية داخلية:
/// - المهل المفتوحة: عند بقاء 7 أيام ثم 3 ثم يوم ثم يوم الانتهاء، ثم عند التأخر؛ للمسؤول ونائبه، ويُضاف
///   الشركاء (المديرون) من مرحلة اليوم الواحد فما دون. كل مرحلة تُرسل مرة واحدة.
/// - الجلسات: تذكير قبل الجلسة بـ24 ساعة للمترافع والمساند، وتنبيه إن مرّ يوم على الجلسة بلا تقرير.
/// الرسائل تحمل رقم الملف والتاريخ فقط، بلا أسماء عملاء أو خصوم؛ والتفاصيل داخل النظام.
/// </summary>
public class DeadlineGuardService(IServiceScopeFactory scopes, Notifier notifier, IConfiguration config, ILogger<DeadlineGuardService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var minutes = int.TryParse(config["DeadlineGuard:IntervalMinutes"], out var m) && m > 0 ? m : 30;
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(minutes));
        do
        {
            try
            {
                await RunOnceAsync(DateTimeOffset.UtcNow, stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "تعذّر تشغيل حارس المهل");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    public record RunSummary(int DeadlineReminders, int HearingReminders, int MissingReports);

    public async Task<RunSummary> RunOnceAsync(DateTimeOffset nowUtc, CancellationToken ct = default)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var managers = await db.Users.Where(u => u.IsActive && u.Role == UserRole.Manager).Select(u => u.Email).ToListAsync(ct);
        var emails = await db.Users.Where(u => u.IsActive).ToDictionaryAsync(u => u.Id, u => u.Email, ct);
        string? Mail(Guid? id) => id is Guid g && emails.TryGetValue(g, out var e) ? e : null;

        // ── المهل ──
        var open = await db.LegalDeadlines.Include(d => d.Case)
            .Where(d => d.Status == DeadlineStatus.Open)
            .ToListAsync(ct);

        var deadlineReminders = 0;
        foreach (var d in open)
        {
            var left = DeadlineCalculator.DaysLeft(d.DueDate, nowUtc);
            var stage = DeadlineCalculator.StageFor(left);
            if (stage is null || (d.LastReminderStage is int last && stage >= last)) continue;

            var to = new List<string?> { Mail(d.ResponsibleUserId), Mail(d.BackupUserId) };
            if (stage <= 1) to.AddRange(managers);

            var when = left switch
            {
                < 0 => $"متأخرة منذ {-left} يوم",
                0 => "تنتهي اليوم",
                1 => "تنتهي غداً",
                _ => $"باقٍ {left} أيام"
            };
            var verify = d.VerifiedByUserId is null ? "\nتنبيه: لم يُتحقق من تاريخ هذه المهلة بعد (التحقق المزدوج مطلوب)." : "";
            await notifier.SendAsync(to.OfType<string>(),
                $"حارس المهل — {d.Case.CaseNumber}: {when}",
                $"المهلة: {d.Title}\nالملف: {d.Case.CaseNumber}\nتاريخ الانتهاء: {d.DueDate:yyyy-MM-dd}\n{when}.{verify}\n\nالتفاصيل داخل النظام الداخلي — حارس المهل.");
            d.LastReminderStage = stage;
            deadlineReminders++;
        }

        // ── الجلسات ── (المقارنة الزمنية بعد الجلب لتبقى قابلة للترجمة في كل مزودي القواعد)
        var scheduled = (await db.Hearings.Include(h => h.Case)
            .Where(h => h.Status == HearingStatus.Scheduled)
            .ToListAsync(ct));

        var hearingReminders = 0;
        foreach (var h in scheduled.Where(h => h.ReminderSentAt is null && h.ScheduledAt > nowUtc && h.ScheduledAt <= nowUtc.AddHours(24)))
        {
            var local = h.ScheduledAt.ToOffset(DeadlineCalculator.RiyadhOffset);
            await notifier.SendAsync(new[] { Mail(h.LawyerId), Mail(h.SupportUserId) }.OfType<string>(),
                $"تذكير بجلسة — {h.Case.CaseNumber}",
                $"جلسة الملف {h.Case.CaseNumber}\nالموعد: {local:yyyy-MM-dd HH:mm} (بتوقيت الرياض)\nالمحكمة: {h.Court ?? "—"} · الدائرة: {h.Circuit ?? "—"}\n\nالتفاصيل داخل النظام الداخلي — الجلسات.");
            h.ReminderSentAt = nowUtc;
            hearingReminders++;
        }

        var missingReports = 0;
        foreach (var h in scheduled.Where(h => h.ReportReminderSentAt is null && h.ScheduledAt <= nowUtc.AddHours(-24)))
        {
            await notifier.SendAsync(new[] { Mail(h.LawyerId), Mail(h.SupportUserId) }.OfType<string>().Concat(managers),
                $"تقرير جلسة غير مسجّل — {h.Case.CaseNumber}",
                $"مرّ يوم على جلسة الملف {h.Case.CaseNumber} ({h.ScheduledAt.ToOffset(DeadlineCalculator.RiyadhOffset):yyyy-MM-dd}) ولم يُسجَّل تقريرها.\nسجّل ما دار في الجلسة وموعد الجلسة التالية، وأنشئ مهلة الاعتراض إن صدر حكم.");
            h.ReportReminderSentAt = nowUtc;
            missingReports++;
        }

        if (deadlineReminders + hearingReminders + missingReports > 0)
            await db.SaveChangesAsync(ct);

        return new RunSummary(deadlineReminders, hearingReminders, missingReports);
    }
}
