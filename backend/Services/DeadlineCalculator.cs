namespace MHD.Api.Services;

/// <summary>
/// حساب تاريخ انتهاء المهلة:
/// لا يُحسب يوم الواقعة (التبليغ أو التسلّم) من المهلة، وتنتهي بانقضاء آخر يوم منها. وإن صادف آخر يوم
/// عطلة نهاية الأسبوع (الجمعة والسبت) أو عطلة رسمية مسجلة، يمتد إلى أول يوم عمل بعدها.
/// هذه قاعدة الحساب المعمول بها في نظام المرافعات الشرعية؛ ويبقى على المحامي المسؤول والمتحقق مطابقة
/// النتيجة مع النص النظامي النافذ وظروف الملف (كالمهل الخاصة) قبل اعتمادها — لذلك لا تُعتمد مهلة إلا بتحقق مزدوج.
/// </summary>
public static class DeadlineCalculator
{
    /// <summary>توقيت المملكة (UTC+3، بلا توقيت صيفي) — المهل تُحسب بالأيام التقويمية في المملكة.</summary>
    public static readonly TimeSpan RiyadhOffset = TimeSpan.FromHours(3);

    public static DateOnly TodayInRiyadh(DateTimeOffset nowUtc) => DateOnly.FromDateTime(nowUtc.ToOffset(RiyadhOffset).DateTime);

    public static bool IsWeekend(DateOnly d) => d.DayOfWeek is DayOfWeek.Friday or DayOfWeek.Saturday;

    public record Result(DateOnly DueDate, DateOnly NominalDate, string? Note);

    public static Result Compute(DateOnly triggerDate, int days, IReadOnlyDictionary<DateOnly, string> holidays)
    {
        if (days <= 0) throw new ArgumentOutOfRangeException(nameof(days), "عدد أيام المهلة يجب أن يكون موجباً");

        var nominal = triggerDate.AddDays(days);
        var due = nominal;
        var reasons = new List<string>();
        while (IsWeekend(due) || holidays.ContainsKey(due))
        {
            reasons.Add(holidays.TryGetValue(due, out var name) ? $"{due:yyyy-MM-dd} عطلة رسمية ({name})" : $"{due:yyyy-MM-dd} عطلة نهاية الأسبوع");
            due = due.AddDays(1);
        }

        var note = reasons.Count == 0 ? null : $"آخر يوم في المهلة {nominal:yyyy-MM-dd} صادف: {string.Join("، ", reasons)} — فامتد إلى أول يوم عمل بعده.";
        return new Result(due, nominal, note);
    }

    /// <summary>الأيام المتبقية حتى تاريخ الانتهاء بتوقيت المملكة (سالبة إن تأخرت).</summary>
    public static int DaysLeft(DateOnly dueDate, DateTimeOffset nowUtc) => dueDate.DayNumber - TodayInRiyadh(nowUtc).DayNumber;

    /// <summary>مراحل التنبيه بالأيام المتبقية: أسبوع، ثلاثة أيام، يوم، يوم الانتهاء، ثم التأخر.</summary>
    public static readonly int[] ReminderStages = [7, 3, 1, 0, -1];

    /// <summary>أدق مرحلة تنبيه بلغتها المهلة الآن، أو null إن بقي أكثر من أسبوع.</summary>
    public static int? StageFor(int daysLeft)
    {
        if (daysLeft < 0) return -1;
        int? stage = null;
        foreach (var s in ReminderStages)
            if (s >= 0 && daysLeft <= s) stage = s;
        return stage;
    }
}
