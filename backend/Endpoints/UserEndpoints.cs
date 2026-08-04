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
    }

    private record CreateUserRequest(string FullName, string Email, UserRole Role, string TemporaryPassword);
    private record ResetPasswordRequest(string TemporaryPassword);

    private static string ClientIp(HttpContext http) => http.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    private static string ActorName(HttpContext http) => http.User.Identity?.Name ?? "";

    private static async Task<IResult> List(AppDbContext db)
    {
        var users = await db.Users
            .OrderBy(u => u.FullName)
            .Select(u => new { u.Id, u.FullName, u.Email, Role = u.Role.ToString(), u.IsActive, u.TotpEnabled, u.LastLoginAt, u.CreatedAt })
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

        var (hash, salt) = PasswordHasher.Hash(req.TemporaryPassword!);
        var user = new User
        {
            FullName = req.FullName.Trim(),
            Email = email,
            Role = req.Role,
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
