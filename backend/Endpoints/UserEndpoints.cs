using Microsoft.EntityFrameworkCore;
using MHD.Api.Data;
using MHD.Api.Domain;
using MHD.Api.Security;

namespace MHD.Api.Endpoints;

/// <summary>إدارة المستخدمين — حكر على المدير: هذه أداة سيطرة على النظام نفسه لا وظيفة عمل.</summary>
public static class UserEndpoints
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").RequireAuthorization("ManagerOnly").WithTags("Users");

        group.MapGet("/", List);
        group.MapPost("/", Create);
        group.MapPost("/{id:guid}/deactivate", Deactivate);
        group.MapPost("/{id:guid}/activate", Activate);
        group.MapPost("/{id:guid}/reset-password", ResetPassword);
        group.MapPut("/{id:guid}/profile", UpdateProfile);

        // قائمة الفريق لاختيار المسؤول والنائب والمترافع — متاحة لكل مستخدم مسجّل، بلا بريد ولا بيانات حساب.
        app.MapGet("/api/team", Team).RequireAuthorization().WithTags("Users");
    }

    private record CreateUserRequest(string FullName, string Email, UserRole Role, string TemporaryPassword,
        string? Title = null, bool IsLicensedLawyer = false, string? LicenseNumber = null);
    private record UpdateProfileRequest(string FullName, UserRole Role, string? Title, bool IsLicensedLawyer, string? LicenseNumber);
    private record ResetPasswordRequest(string TemporaryPassword);

    private static string ClientIp(HttpContext http) => http.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    private static string ActorName(HttpContext http) => http.User.Identity?.Name ?? "";

    private static async Task<IResult> List(AppDbContext db)
    {
        var users = await db.Users
            .OrderBy(u => u.FullName)
            .Select(u => new { u.Id, u.FullName, u.Email, Role = u.Role.ToString(), u.Title, u.IsLicensedLawyer, u.LicenseNumber, u.IsActive, u.TotpEnabled, u.LastLoginAt, u.CreatedAt })
            .ToListAsync();
        return Results.Ok(users);
    }

    private static async Task<IResult> Create(CreateUserRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var email = (req.Email ?? "").Trim().ToLower();
        if (string.IsNullOrWhiteSpace(req.FullName) || string.IsNullOrWhiteSpace(email))
            return Results.BadRequest(new { message = "الاسم والبريد الإلكتروني مطلوبان" });

        if (await db.Users.AnyAsync(u => u.Email == email))
            return Results.BadRequest(new { message = "البريد الإلكتروني مستخدم مسبقاً" });

        if (!PasswordHasher.MeetsPolicy(req.TemporaryPassword ?? "", out var error))
            return Results.BadRequest(new { message = error });

        if (req.IsLicensedLawyer && string.IsNullOrWhiteSpace(req.LicenseNumber))
            return Results.BadRequest(new { message = "رقم رخصة المحاماة مطلوب للمحامي المرخّص" });

        var (hash, salt) = PasswordHasher.Hash(req.TemporaryPassword!);
        var user = new User
        {
            FullName = req.FullName.Trim(),
            Email = email,
            Role = req.Role,
            Title = string.IsNullOrWhiteSpace(req.Title) ? null : req.Title.Trim(),
            IsLicensedLawyer = req.IsLicensedLawyer,
            LicenseNumber = req.IsLicensedLawyer ? req.LicenseNumber!.Trim() : null,
            PasswordHash = hash,
            PasswordSalt = salt,
            MustChangePassword = true
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var actorId = JwtTokenService.GetUserId(http.User);
        await audit.LogAsync(actorId, ActorName(http), "USER_CREATED", "User", user.Id.ToString(), ClientIp(http));

        return Results.Created($"/api/users/{user.Id}", new { user.Id, user.FullName, user.Email, Role = user.Role.ToString() });
    }

    private static async Task<IResult> Team(AppDbContext db)
    {
        var team = await db.Users.Where(u => u.IsActive)
            .OrderBy(u => u.FullName)
            .Select(u => new { u.Id, u.FullName, u.Title, u.IsLicensedLawyer, Role = u.Role.ToString() })
            .ToListAsync();
        return Results.Ok(team);
    }

    private static async Task<IResult> UpdateProfile(Guid id, UpdateProfileRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return Results.NotFound();
        if (string.IsNullOrWhiteSpace(req.FullName))
            return Results.BadRequest(new { message = "الاسم مطلوب" });
        if (req.IsLicensedLawyer && string.IsNullOrWhiteSpace(req.LicenseNumber))
            return Results.BadRequest(new { message = "رقم رخصة المحاماة مطلوب للمحامي المرخّص" });

        var actorId = JwtTokenService.GetUserId(http.User);
        // لا يُنزع دور المدير عن آخر مدير نشط، ولا يُنزعه المدير عن نفسه، حتى لا يُقفل النظام بلا مدير.
        if (user.Role == UserRole.Manager && req.Role != UserRole.Manager)
        {
            if (actorId == user.Id)
                return Results.BadRequest(new { message = "لا يمكنك إزالة صلاحية المدير عن حسابك" });
            if (!await db.Users.AnyAsync(u => u.Id != user.Id && u.IsActive && u.Role == UserRole.Manager))
                return Results.BadRequest(new { message = "يجب أن يبقى في النظام مدير نشط واحد على الأقل" });
        }

        user.FullName = req.FullName.Trim();
        user.Role = req.Role;
        user.Title = string.IsNullOrWhiteSpace(req.Title) ? null : req.Title.Trim();
        user.IsLicensedLawyer = req.IsLicensedLawyer;
        user.LicenseNumber = req.IsLicensedLawyer ? req.LicenseNumber!.Trim() : null;
        await db.SaveChangesAsync();

        await audit.LogAsync(actorId, ActorName(http), "USER_PROFILE_UPDATED", "User", id.ToString(), ClientIp(http),
            $"الدور: {user.Role}، الصفة: {user.Title ?? "—"}، محامٍ مرخّص: {(user.IsLicensedLawyer ? "نعم" : "لا")}");
        return Results.Ok(new { user.Id, user.FullName, Role = user.Role.ToString(), user.Title, user.IsLicensedLawyer, user.LicenseNumber });
    }

    private static Task<IResult> Deactivate(Guid id, AppDbContext db, AuditLogger audit, HttpContext http)
        => SetActive(id, false, db, audit, http);

    private static Task<IResult> Activate(Guid id, AppDbContext db, AuditLogger audit, HttpContext http)
        => SetActive(id, true, db, audit, http);

    private static async Task<IResult> SetActive(Guid id, bool active, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return Results.NotFound();

        user.IsActive = active;
        await db.SaveChangesAsync();

        var actorId = JwtTokenService.GetUserId(http.User);
        await audit.LogAsync(actorId, ActorName(http), active ? "USER_ACTIVATED" : "USER_DEACTIVATED", "User", id.ToString(), ClientIp(http));
        return Results.Ok();
    }

    private static async Task<IResult> ResetPassword(Guid id, ResetPasswordRequest req, AppDbContext db, AuditLogger audit, HttpContext http)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return Results.NotFound();

        if (!PasswordHasher.MeetsPolicy(req.TemporaryPassword ?? "", out var error))
            return Results.BadRequest(new { message = error });

        var (hash, salt) = PasswordHasher.Hash(req.TemporaryPassword!);
        user.PasswordHash = hash;
        user.PasswordSalt = salt;
        user.MustChangePassword = true;
        user.FailedLoginAttempts = 0;
        user.LockedUntil = null;
        await db.SaveChangesAsync();

        var actorId = JwtTokenService.GetUserId(http.User);
        await audit.LogAsync(actorId, ActorName(http), "USER_PASSWORD_RESET", "User", id.ToString(), ClientIp(http));
        return Results.Ok();
    }
}
