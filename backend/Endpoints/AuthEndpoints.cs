using Microsoft.EntityFrameworkCore;
using MHD.Api.Data;
using MHD.Api.Domain;
using MHD.Api.Security;

namespace MHD.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/login", Login).RequireRateLimiting("login");
        group.MapPost("/login/totp", VerifyLoginTotp).RequireRateLimiting("login");
        group.MapPost("/change-password", ChangePassword);
        group.MapPost("/refresh", Refresh);
        group.MapPost("/logout", Logout);

        group.MapPost("/totp/setup", SetupTotp).RequireAuthorization();
        group.MapPost("/totp/confirm", ConfirmTotp).RequireAuthorization().RequireRateLimiting("login");
        group.MapGet("/me", Me).RequireAuthorization();
    }

    private record LoginRequest(string Email, string Password);
    private record TotpVerifyRequest(string MfaToken, string Code);
    private record ChangePasswordRequest(string Token, string NewPassword);
    private record TotpConfirmRequest(string Code);
    private record RefreshRequest(string RefreshToken);

    private static string ClientIp(HttpContext http) => http.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    private static object PublicUser(User u) => new
    {
        u.Id,
        u.FullName,
        u.Email,
        Role = u.Role.ToString(),
        u.TotpEnabled
    };

    private static async Task<IResult> Login(LoginRequest req, AppDbContext db, JwtTokenService jwt, AuditLogger audit, HttpContext http)
    {
        var ip = ClientIp(http);
        var email = (req.Email ?? "").Trim().ToLower();
        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == email);

        if (user is null || !user.IsActive)
        {
            await audit.LogAsync(null, req.Email ?? "", "LOGIN_FAILED", "User", null, ip, "بريد غير معروف أو حساب معطّل");
            return Results.Json(new { message = "بيانات الدخول غير صحيحة" }, statusCode: 401);
        }

        if (user.LockedUntil is not null && user.LockedUntil > DateTimeOffset.UtcNow)
        {
            return Results.Json(new { message = "الحساب مقفل مؤقتاً بسبب محاولات دخول فاشلة متكررة، حاول لاحقاً" }, statusCode: 423);
        }

        if (!PasswordHasher.Verify(req.Password ?? "", user.PasswordHash, user.PasswordSalt))
        {
            user.FailedLoginAttempts++;
            if (user.FailedLoginAttempts >= 5)
            {
                user.LockedUntil = DateTimeOffset.UtcNow.AddMinutes(15);
                user.FailedLoginAttempts = 0;
            }
            await db.SaveChangesAsync();
            await audit.LogAsync(user.Id, user.Email, "LOGIN_FAILED", "User", user.Id.ToString(), ip);
            return Results.Json(new { message = "بيانات الدخول غير صحيحة" }, statusCode: 401);
        }

        user.FailedLoginAttempts = 0;
        user.LockedUntil = null;
        await db.SaveChangesAsync();

        if (user.MustChangePassword)
        {
            var token = jwt.CreatePurposeToken(user.Id, "pwdchange", TimeSpan.FromMinutes(10));
            return Results.Ok(new { status = "must_change_password", token });
        }

        if (user.TotpEnabled)
        {
            var token = jwt.CreatePurposeToken(user.Id, "mfa", TimeSpan.FromMinutes(5));
            return Results.Ok(new { status = "totp_required", token });
        }

        return await IssueSession(user, db, jwt, audit, ip);
    }

    private static async Task<IResult> VerifyLoginTotp(TotpVerifyRequest req, AppDbContext db, JwtTokenService jwt, EncryptionService enc, AuditLogger audit, HttpContext http)
    {
        var ip = ClientIp(http);
        var principal = jwt.ValidateToken(req.MfaToken ?? "", "mfa");
        if (principal is null)
            return Results.Json(new { message = "رمز الجلسة غير صالح أو منتهٍ، الرجاء تسجيل الدخول من جديد" }, statusCode: 401);

        var userId = JwtTokenService.GetUserId(principal);
        var user = userId is null ? null : await db.Users.FindAsync(userId.Value);
        if (user is null || !user.IsActive || !user.TotpEnabled || string.IsNullOrEmpty(user.TotpSecretEncrypted))
            return Results.Json(new { message = "غير مصرح" }, statusCode: 401);

        var secret = enc.Decrypt(user.TotpSecretEncrypted);
        if (!TotpService.Validate(secret, req.Code ?? ""))
        {
            await audit.LogAsync(user.Id, user.Email, "TOTP_FAILED", "User", user.Id.ToString(), ip);
            return Results.Json(new { message = "رمز التحقق غير صحيح" }, statusCode: 401);
        }

        return await IssueSession(user, db, jwt, audit, ip);
    }

    private static async Task<IResult> ChangePassword(ChangePasswordRequest req, AppDbContext db, JwtTokenService jwt, AuditLogger audit, HttpContext http)
    {
        var ip = ClientIp(http);
        var principal = jwt.ValidateToken(req.Token ?? "", "pwdchange");
        if (principal is null)
            return Results.Json(new { message = "رمز غير صالح أو منتهٍ، الرجاء تسجيل الدخول من جديد" }, statusCode: 401);

        var userId = JwtTokenService.GetUserId(principal);
        var user = userId is null ? null : await db.Users.FindAsync(userId.Value);
        if (user is null || !user.IsActive)
            return Results.Json(new { message = "غير مصرح" }, statusCode: 401);

        if (!PasswordHasher.MeetsPolicy(req.NewPassword ?? "", out var error))
            return Results.BadRequest(new { message = error });

        var (hash, salt) = PasswordHasher.Hash(req.NewPassword!);
        user.PasswordHash = hash;
        user.PasswordSalt = salt;
        user.MustChangePassword = false;
        await db.SaveChangesAsync();
        await audit.LogAsync(user.Id, user.Email, "PASSWORD_CHANGED", "User", user.Id.ToString(), ip);

        if (user.TotpEnabled)
        {
            var mfaToken = jwt.CreatePurposeToken(user.Id, "mfa", TimeSpan.FromMinutes(5));
            return Results.Ok(new { status = "totp_required", token = mfaToken });
        }

        return await IssueSession(user, db, jwt, audit, ip);
    }

    private static async Task<IResult> SetupTotp(HttpContext http, AppDbContext db, EncryptionService enc)
    {
        var userId = JwtTokenService.GetUserId(http.User);
        var user = userId is null ? null : await db.Users.FindAsync(userId.Value);
        if (user is null) return Results.Unauthorized();

        var secret = TotpService.GenerateSecret();
        user.TotpSecretEncrypted = enc.Encrypt(secret);
        user.TotpEnabled = false; // يبقى معطلاً حتى يُؤكَّد الرمز
        await db.SaveChangesAsync();

        var uri = TotpService.BuildProvisioningUri(secret, user.Email);
        return Results.Ok(new { secret, provisioningUri = uri });
    }

    private static async Task<IResult> ConfirmTotp(TotpConfirmRequest req, HttpContext http, AppDbContext db, EncryptionService enc, AuditLogger audit)
    {
        var userId = JwtTokenService.GetUserId(http.User);
        var user = userId is null ? null : await db.Users.FindAsync(userId.Value);
        if (user is null || string.IsNullOrEmpty(user.TotpSecretEncrypted)) return Results.Unauthorized();

        var secret = enc.Decrypt(user.TotpSecretEncrypted);
        if (!TotpService.Validate(secret, req.Code ?? ""))
            return Results.BadRequest(new { message = "رمز التحقق غير صحيح" });

        user.TotpEnabled = true;
        await db.SaveChangesAsync();

        await audit.LogAsync(user.Id, user.Email, "TOTP_ENABLED", "User", user.Id.ToString(), ClientIp(http));
        return Results.Ok(new { message = "تم تفعيل المصادقة الثنائية" });
    }

    private static async Task<IResult> Refresh(RefreshRequest req, AppDbContext db, JwtTokenService jwt, HttpContext http)
    {
        var ip = ClientIp(http);
        var hash = JwtTokenService.HashToken(req.RefreshToken ?? "");
        var token = await db.RefreshTokens.Include(t => t.User).SingleOrDefaultAsync(t => t.TokenHash == hash);

        if (token is null || !token.IsActive || !token.User.IsActive)
            return Results.Json(new { message = "جلسة غير صالحة، الرجاء تسجيل الدخول من جديد" }, statusCode: 401);

        token.RevokedAt = DateTimeOffset.UtcNow;
        var newValue = JwtTokenService.GenerateRefreshTokenValue();
        var newHash = JwtTokenService.HashToken(newValue);
        token.ReplacedByTokenHash = newHash;

        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = token.UserId,
            TokenHash = newHash,
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(7),
            CreatedByIp = ip
        });
        await db.SaveChangesAsync();

        var accessToken = jwt.CreateAccessToken(token.User);
        return Results.Ok(new { accessToken, refreshToken = newValue });
    }

    private static async Task<IResult> Logout(RefreshRequest req, AppDbContext db)
    {
        var hash = JwtTokenService.HashToken(req.RefreshToken ?? "");
        var token = await db.RefreshTokens.SingleOrDefaultAsync(t => t.TokenHash == hash);
        if (token is not null && token.RevokedAt is null)
        {
            token.RevokedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
        }
        return Results.Ok();
    }

    private static async Task<IResult> Me(HttpContext http, AppDbContext db)
    {
        var userId = JwtTokenService.GetUserId(http.User);
        var user = userId is null ? null : await db.Users.FindAsync(userId.Value);
        return user is null ? Results.Unauthorized() : Results.Ok(PublicUser(user));
    }

    private static async Task<IResult> IssueSession(User user, AppDbContext db, JwtTokenService jwt, AuditLogger audit, string ip)
    {
        user.LastLoginAt = DateTimeOffset.UtcNow;
        var accessToken = jwt.CreateAccessToken(user);
        var refreshValue = JwtTokenService.GenerateRefreshTokenValue();

        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = JwtTokenService.HashToken(refreshValue),
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(7),
            CreatedByIp = ip
        });
        await db.SaveChangesAsync();
        await audit.LogAsync(user.Id, user.Email, "LOGIN_SUCCESS", "User", user.Id.ToString(), ip);

        return Results.Ok(new
        {
            status = "ok",
            accessToken,
            refreshToken = refreshValue,
            user = PublicUser(user)
        });
    }
}
