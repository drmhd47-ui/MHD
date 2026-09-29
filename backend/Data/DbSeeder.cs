using Microsoft.EntityFrameworkCore;
using MHD.Api.Domain;
using MHD.Api.Security;

namespace MHD.Api.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db, IConfiguration config)
    {
        await SeedDeadlineRulesAsync(db);
        if (await db.Users.AnyAsync()) return;

        var email = (config["Seed:ManagerEmail"] ?? "manager@firm.sa").Trim().ToLower();
        var password = config["Seed:ManagerPassword"]
            ?? throw new InvalidOperationException("Seed:ManagerPassword يجب تعريفه لإنشاء حساب المدير الأولي");

        if (!PasswordHasher.MeetsPolicy(password, out var error))
            throw new InvalidOperationException($"Seed:ManagerPassword لا يحقق سياسة كلمة المرور: {error}");

        var (hash, salt) = PasswordHasher.Hash(password);

        db.Users.Add(new User
        {
            // الحساب الأول هو حساب الشريك الإداري؛ ويُنشئ هو بقية حسابات الفريق من شاشة المستخدمين.
            FullName = config["Seed:ManagerName"] ?? "الدكتور محمد العنزي",
            Title = config["Seed:ManagerTitle"] ?? "الشريك الإداري",
            Email = email,
            Role = UserRole.Manager,
            PasswordHash = hash,
            PasswordSalt = salt,
            MustChangePassword = true,
            IsActive = true
        });

        if (!await db.OfficeSettings.AnyAsync())
        {
            db.OfficeSettings.Add(new OfficeSettings());
        }

        await db.SaveChangesAsync();
    }

    /// <summary>
    /// قواعد المهل الافتراضية. كل قاعدة نظامية تُنشأ "غير متحقَّق من سندها": لا تُعد معتمدة حتى يطابق محامٍ مرخّص
    /// المادة والمدة مع النص الرسمي النافذ (زر "تحقّقت من السند" في شاشة القواعد). تُضاف القاعدة الناقصة فقط،
    /// ولا يُمس ما عدّله الشريك الإداري.
    /// </summary>
    public static readonly (string Key, string Name, int Days, string Trigger, string? Basis, bool Internal)[] DefaultRules =
    [
        ("appeal", "الاعتراض بطلب الاستئناف", 30, "من تاريخ تسلّم صورة صك الحكم أو من التاريخ المحدد لتسلّمها", "نظام المرافعات الشرعية — المادة 187", false),
        ("urgent-appeal", "الاعتراض على الأحكام الصادرة في المسائل المستعجلة", 10, "من تاريخ تسلّم صورة صك الحكم أو من التاريخ المحدد لتسلّمها", "نظام المرافعات الشرعية — المادة 187", false),
        ("cassation", "الاعتراض بطلب النقض", 30, "من تاريخ تسلّم صورة صك حكم الاستئناف", "نظام المرافعات الشرعية (تُحدَّد المادة عند التحقق)", false),
        ("reconsideration", "التماس إعادة النظر", 30, "من تاريخ العلم بسبب الالتماس أو من تاريخ تسلّم صورة الحكم بحسب السبب", "نظام المرافعات الشرعية (تُحدَّد المادة عند التحقق)", false),
        ("commercial-appeal", "الاعتراض على أحكام المحاكم التجارية", 30, "من تاريخ تسلّم الحكم أو إيداعه بحسب النظام", "نظام المحاكم التجارية ولائحته التنفيذية (تُحدَّد المادة عند التحقق)", false),
        ("admin-appeal", "الاعتراض على أحكام المحاكم الإدارية", 30, "من تاريخ تسلّم صورة الحكم", "نظام المرافعات أمام ديوان المظالم (تُحدَّد المادة عند التحقق)", false),
        ("internal-reply", "مهلة داخلية: الرد على مذكرة الخصم", 7, "من تاريخ استلام المذكرة", null, true),
        ("internal-client-report", "مهلة داخلية: إبلاغ العميل بما دار في الجلسة", 2, "من تاريخ الجلسة", null, true),
    ];

    public static async Task SeedDeadlineRulesAsync(AppDbContext db)
    {
        var existing = (await db.DeadlineRules.Select(r => r.Key).ToListAsync()).ToHashSet();
        var order = 10;
        foreach (var r in DefaultRules)
        {
            order += 10;
            if (existing.Contains(r.Key)) continue;
            db.DeadlineRules.Add(new DeadlineRule
            {
                Key = r.Key,
                Name = r.Name,
                Days = r.Days,
                Trigger = r.Trigger,
                LegalBasis = r.Basis,
                IsInternal = r.Internal,
                BasisVerified = r.Internal,
                SortOrder = order
            });
        }
        await db.SaveChangesAsync();
    }
}
