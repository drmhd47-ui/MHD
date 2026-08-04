using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using MHD.Api.Domain;

namespace MHD.Api.Security;

/// <summary>
/// يصدر نوعين من الرموز: رمز وصول عادي (purpose=access, 30 دقيقة) يُقبل في كل نقاط الـ API المحمية،
/// ورموز غرض محدود قصيرة العمر (mfa / pwdchange) تُستخدم فقط أثناء تسلسل الدخول قبل اكتمال الجلسة.
/// </summary>
public class JwtTokenService
{
    private readonly SymmetricSecurityKey _key;
    private readonly string _issuer;
    private readonly string _audience;

    public JwtTokenService(IConfiguration config)
    {
        var keyBase64 = config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key غير مُعرَّف في الإعدادات");
        _key = new SymmetricSecurityKey(Convert.FromBase64String(keyBase64));
        _issuer = config["Jwt:Issuer"] ?? "mhd-legal";
        _audience = config["Jwt:Audience"] ?? "mhd-legal-client";
    }

    public string CreateAccessToken(User user)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.Role, user.Role.ToString()),
            new("purpose", "access")
        };
        return CreateToken(claims, TimeSpan.FromMinutes(30));
    }

    public string CreatePurposeToken(Guid userId, string purpose, TimeSpan expiry)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new("purpose", purpose)
        };
        return CreateToken(claims, expiry);
    }

    private string CreateToken(List<Claim> claims, TimeSpan expiry)
    {
        var creds = new SigningCredentials(_key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _audience,
            claims: claims,
            expires: DateTime.UtcNow.Add(expiry),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>يستخدَم للتحقق اليدوي من رموز الغرض المحدود (mfa / pwdchange) خارج خط أنابيب المصادقة القياسي.</summary>
    public ClaimsPrincipal? ValidateToken(string token, string requiredPurpose)
    {
        var handler = new JwtSecurityTokenHandler();
        try
        {
            var principal = handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = _key,
                ValidateIssuer = true,
                ValidIssuer = _issuer,
                ValidateAudience = true,
                ValidAudience = _audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromSeconds(30)
            }, out _);

            var purpose = principal.FindFirstValue("purpose");
            return purpose == requiredPurpose ? principal : null;
        }
        catch
        {
            return null;
        }
    }

    public static Guid? GetUserId(ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(value, out var id) ? id : null;
    }

    public static string GenerateRefreshTokenValue()
        => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

    public static string HashToken(string token)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
