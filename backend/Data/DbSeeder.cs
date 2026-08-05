using Microsoft.EntityFrameworkCore;
using MHD.Api.Domain;
using MHD.Api.Security;

namespace MHD.Api.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db, IConfiguration config)
    {
        if (await db.Users.AnyAsync()) return;

        var email = (config["Seed:ManagerEmail"] ?? "manager@firm.sa").Trim().ToLower();
        var password = config["Seed:ManagerPassword"]
            ?? throw new InvalidOperationException("Seed:ManagerPassword يجب تعريفه لإنشاء حساب المدير الأولي");

        if (!PasswordHasher.MeetsPolicy(password, out var error))
            throw new InvalidOperationException($"Seed:ManagerPassword لا يحقق سياسة كلمة المرور: {error}");

        var (hash, salt) = PasswordHasher.Hash(password);

        db.Users.Add(new User
        {
            FullName = "مدير المكتب",
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
}
