using Microsoft.EntityFrameworkCore;
using MHD.Api.Data;
using MHD.Api.Domain;

namespace MHD.Api.Services;

/// <summary>
/// تجهيل البيانات الشخصية لطلبات الموقع المعتذر عنها بعد مدة الاحتفاظ (افتراضياً 90 يوماً من الإغلاق)،
/// وفق سياسة الخصوصية المنشورة في الموقع. يبقى رقم الطلب وحالته وتواريخه لأغراض الإحصاء والتدقيق.
/// الطلبات المحوَّلة إلى عملاء لا تُجهَّل هنا لأنها أصبحت جزءاً من ملف العميل.
/// </summary>
public class IntakeRetentionService(IServiceScopeFactory scopes, IConfiguration config, ILogger<IntakeRetentionService> logger) : BackgroundService
{
    public const string AnonymizedName = "(مُجهَّل)";

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var days = int.TryParse(config["Intake:RetentionDays"], out var d) && d > 0 ? d : 90;
        using var timer = new PeriodicTimer(TimeSpan.FromHours(6));
        do
        {
            try
            {
                await AnonymizeAsync(days, stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "تعذّر تنفيذ تجهيل طلبات الموقع المنتهية");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    public async Task<int> AnonymizeAsync(int days, CancellationToken ct = default)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var cutoff = DateTimeOffset.UtcNow.AddDays(-days);

        // مقارنة التاريخ تتم بعد الجلب: عدد الطلبات المعتذر عنها غير المجهَّلة صغير، وهذا يُبقي الاستعلام
        // قابلاً للترجمة في كل مزودي قواعد البيانات (بما فيها قاعدة الاختبارات).
        var due = (await db.IntakeRequests
            .Where(r => r.Status == IntakeRequestStatus.Declined && r.AnonymizedAt == null && r.ClosedAt != null)
            .ToListAsync(ct))
            .Where(r => r.ClosedAt < cutoff)
            .ToList();

        foreach (var r in due)
        {
            r.FullName = AnonymizedName;
            r.Phone = null;
            r.Email = null;
            r.OpposingPartyName = null;
            r.AnonymizedAt = DateTimeOffset.UtcNow;
        }
        if (due.Count > 0)
        {
            await db.SaveChangesAsync(ct);
            logger.LogInformation("جُهِّلت بيانات {Count} من طلبات الموقع المنتهية", due.Count);
        }
        return due.Count;
    }
}
